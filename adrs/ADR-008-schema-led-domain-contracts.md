# ADR-008: Schema-led domain contracts

## Status

**Accepted**

## Date

2026-05-09

## Scope

- **In scope:** How WFD defines **domain data contracts**: persisted records (Dexie), HTTP API request/response bodies, Supabase-shaped payloads where validated in app code, and AI-generated or externally sourced JSON. Where Zod schemas live, how TypeScript types are derived, validation expectations at boundaries, and how stores and UI consume those contracts. Relationship to offline-first local data ([ADR-002](ADR-002-local-data-ownership.md)) and AI validation expectations ([ADR-007](ADR-007-ai-provider-contract.md)).
- **Out of scope:** Database DDL for Supabase (owned by migrations and provider docs); ad hoc UI-only layout state; ephemeral in-memory structures that never persist and only hold already-validated entities (see **Explicit exclusions**).

## Context

The top-level [README](../README.md) states that the data model should stay **schema-led**: Zod defines persisted and external shapes, TypeScript types follow from schemas, and external or generated data is validated before use. Without a single ADR, contributors may reintroduce parallel hand-written types, skip runtime validation at route or sync boundaries, or place schemas inconsistently—breaking offline safety and making AI/HTTP drift invisible until runtime bugs.

### Decision pressure (required)

The repo already documents an intended layout in [`src/lib/api/README.md`](../src/lib/api/README.md) (`*.schemas.ts`, `*.types.ts`, `*.model.ts`, `*.service.ts`), but **legacy modules still duplicate domain types** and **some persisted shapes lack Zod definitions**. Typed code can compile while data violates invariants, especially for AI JSON and migrations. A governing ADR aligns README intent, agent rules, and review expectations.

### Supporting context

- **Problem:** Divergent type sources (`$lib/types` vs `$lib/api/*`) and missing schemas for some IndexedDB rows weaken the contract story.
- **Options considered:** (1) Types-first with occasional Zod — rejected; fails runtime guarantees for AI and HTTP. (2) Zod-first with inferred types only — **chosen**. (3) Separate IDL (Protobuf, etc.) — rejected; unnecessary for this codebase.
- **Must stay true:** Local-first durability and validation before trusting remote or model output ([README](../README.md), [ADR-001](ADR-001-product-operating-model.md)); server-side validation for AI responses ([ADR-007](ADR-007-ai-provider-contract.md)).

## Decision

1. **Zod schemas are the source of truth** for:
   - **Persisted domain rows** intended to survive reloads (recipes, suggestions, and other Dexie tables once modeled).
   - **HTTP API bodies and structured responses** for same-origin routes under `src/routes/api/**` (request and success payloads).
   - **Validated Supabase or sync payloads** where the app asserts shape in TypeScript (row maps, RPC results), not the raw Postgres catalog.

2. **TypeScript types** for those shapes are **`z.infer<typeof Schema>`** (or equivalent inference from composed schemas). **Do not hand-duplicate** the same field contract in parallel `interface` or `type` aliases for domain entities.

3. **Module placement** (see [`src/lib/api/README.md`](../src/lib/api/README.md)):
   - **`*.schemas.ts`** — Zod definitions; composable; no business side effects.
   - **`*.types.ts`** — re-exports of inferred types from schemas (and rare type-only helpers that do not duplicate entity fields).
   - **`*.model.ts`** — pure helpers, guards, formatters; may re-export schema/type for convenience.
   - **`*.service.ts`** — I/O; **validate** inputs and outputs with `.safeParse()` (or schema transforms) at the boundary; fail closed on invalid data.
   - **`index.ts`** — public barrel per domain.

4. **Dexie (`src/lib/db.ts`)** uses entity types imported from the **recipe/API barrels** (`SavedRecipe`, `Suggestion`, etc.), not parallel definitions. **New tables** get a Zod schema in the owning domain before widening `Table<>` generics.

5. **Stores (`src/lib/stores/**`)** operate on **inferred domain types** and mutation helpers; they should not invent alternate entity shapes.

6. **Strict object contracts:** New and materially revised **object** schemas in `src/lib/api/**` should use **`.strict()`** (or equivalent rejection of unknown keys) per [AGENTS.md](../AGENTS.md), so unexpected fields surface at validation time rather than silently flowing through.

7. **Validation points:** Any code path that accepts **user input**, **network JSON**, or **model output** must validate before treating data as the domain type. Prefer `.safeParse()` and explicit error handling over unchecked casts.

### Explicit exclusions (required)

- **UI-only tokens** (icon sizes, viewport layout state, view-state enums) may remain plain TypeScript where they are not serialized or stored as domain records.
- **Ephemeral algorithm structs** (e.g. in-memory sync planning graphs) may be plain types **if** they only bundle values that are themselves already schema-validated entity types; if a structure is ever JSON-serialized across the wire or written to IndexedDB, it needs a schema.
- We are **not** requiring Zod for every Svelte prop or snippet argument—only for **domain and boundary** data as above.

## Consequences

### Positive

- One contract per entity; fewer impossible states at compile time once drift is removed.
- Safer AI and HTTP boundaries; easier refactors when fields change.
- Clear file roles for contributors and agents.

### Negative

- Slightly more ceremony when adding fields (schema + migration discipline).
- Legacy duplicate types require migration work to delete safely.

### Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Schema drift vs Dexie on-disk rows | Versioned Dexie upgrades; validate on read when loading ambiguous legacy rows if needed. |
| Over-validation inside hot loops | Validate at boundaries; keep inner functions typed. |
| Circular imports between schemas | Recipe schemas already avoid imports into `recipe.schemas.ts`; follow that pattern or extract shared bases under `api/common`. |

## Operational impact

- **Developer workflow:** Prefer importing domain types from `$lib/api/<domain>` barrels rather than `$lib/types` for recipes, preferences, and auth profiles.
- **Debugging:** Validation failures should log or return structured errors at the boundary where `safeParse` runs.

## Examples (optional)

- Recipe entities: [`src/lib/api/recipe/recipe.schemas.ts`](../src/lib/api/recipe/recipe.schemas.ts) + [`recipe.types.ts`](../src/lib/api/recipe/recipe.types.ts); Dexie tables typed in [`src/lib/db.ts`](../src/lib/db.ts).
- AI structured output: [`src/lib/api/ai/ai.schemas.ts`](../src/lib/api/ai/ai.schemas.ts) consumed by [`ai.model.ts`](../src/lib/api/ai/ai.model.ts) and suggestion routes.

## Compliance (optional)

- Aligns with Zod + TypeScript conventions in [AGENTS.md](../AGENTS.md) (infer types from schemas; prefer `.strict()` on object schemas).

## Implementation compliance (discovered)

The following **known gaps** exist relative to this ADR as of authoring; they are also tracked in [`docs/readme-adr-alignment-gaps.md`](../docs/readme-adr-alignment-gaps.md):

| Area | Issue |
| ---- | ----- |
| **Legacy `$lib/types.ts`** | Deprecated hand-written `RecipeSummary`, `Suggestion`, `FullRecipe`, `SavedRecipe`, `UserPreferences`, `RecipeAddendum`, and related API envelope types still exist and are imported from some routes, `src/lib/server/openai.ts`, `src/lib/db/remote.ts`, and `src/lib/stores/preferences.ts`, duplicating `$lib/api` contracts. |
| **`PromptRequest` (Dexie)** | Defined only as a TypeScript type in [`src/lib/db.ts`](../src/lib/db.ts); no Zod schema or read-time validation. |
| **`.strict()` on schemas** | [`AGENTS.md`](../AGENTS.md) requires `.strict()` on object schemas; current `src/lib/api/**/*.schemas.ts` files do not consistently apply it—tightening should happen as schemas are touched or in a focused pass. |
| **AI JSON without `safeParse`** | Partially overlaps [GAP-006](../docs/readme-adr-alignment-gaps.md): some Chat Completions paths parse JSON without Zod at the boundary. |

## Enforcement rules

- **Cursor / agent rules:** The backlog **Rule: Schema and type safety** in [`docs/adr-and-rules-todo.md`](../docs/adr-and-rules-todo.md) should reference this ADR once added.
- **Code / architecture:** Domain entities and API payloads live under `src/lib/api/**` with the `schemas` / `types` / `model` / `service` split; Dexie entity generics import from API barrels; no new parallel domain `type` blocks in `$lib/types.ts`.
- **When to revisit:** Introduction of a second persistence layer, shared mobile client, or non-Zod validation technology.

## Supersession notes

- **Stable identifier:** ADR-008.
- **Related:** [ADR-007](ADR-007-ai-provider-contract.md) specializes **AI provider** behavior; this ADR is the general **schema-first data contract** for all domains.

---

## Orchestrated development

Orchestration not required for adopting this ADR; removing legacy duplicates and adding missing schemas is ordinary phased engineering.

### Relevant ADRs for implementation

- [ADR-002](ADR-002-local-data-ownership.md) — what is persisted locally.
- [ADR-006](ADR-006-serverless-and-secret-boundary.md) — where validation runs relative to client/server.
- [ADR-007](ADR-007-ai-provider-contract.md) — AI response validation expectations.

### Alignment gaps

See **Implementation compliance (discovered)** above and GAP-007 in [`docs/readme-adr-alignment-gaps.md`](../docs/readme-adr-alignment-gaps.md).

### Merge / workflow gates

- [x] Known deviations documented in alignment gaps when not fixed in the same change.
