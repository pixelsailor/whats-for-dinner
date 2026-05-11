# ADR-002: Local data ownership

## Status

**Accepted**

## Date

2026-05-11

## Scope

- **In scope:** Where durable user data and transient client data **live by default** (Dexie / IndexedDB), how that relates to reactive stores, and how to classify records as **durable user data** versus **transient cache or operational data**. Alignment with [ADR-001](ADR-001-product-operating-model.md) offline-first and anonymous-first guarantees for the recipe book and local inputs.
- **Out of scope:** Supabase sync, conflict resolution, and cloud row lifecycle ([future ADR on sync and conflict resolution](../docs/adr-and-rules-todo.md)); OpenAI request/response contracts and suggestion **lifecycle** policy beyond storage classification (see [ADR-003: AI suggestion lifecycle](ADR-003-ai-suggestion-lifecycle.md)); account/cloud enhancement boundaries beyond local ownership classification (see [ADR-004: Account and cloud enhancement model](ADR-004-account-and-cloud-enhancement-model.md)); which UI paths may **call** AI or require auth ([ADR-001](ADR-001-product-operating-model.md) capability matrix); Zod schema placement ([future schema-led ADR](../docs/adr-and-rules-todo.md)); exact table migrations and versioned Dexie schemas (implementation detail, governed here only at the ownership level).

## Context

WFD’s product promise depends on the browser holding authoritative copies of core user data. Without an explicit ADR, implementers may split state across ad hoc `sessionStorage`, only-memory stores, or remote-first assumptions, which weakens offline behavior and complicates sync later.

### Decision pressure (required)

ADR-001 defers “concrete data schemas and table ownership.” Teams need a single place that states **IndexedDB is the default system of record in the client** for the listed domains, and that **AI suggestion rows are not user recipes** until promoted—otherwise cloud backup and UX drift toward treating suggestions as durable account content.

### Supporting context

- **Problem:** Ambiguity between “data the user owns forever” and “data that improves UX or saves tokens until pruned.”
- **Options considered:** (1) Remote-first recipe storage — rejected; contradicts ADR-001 and README. (2) Split durable data across many browser stores without a primary database — rejected; harder to query, backup, and reason about. (3) **Dexie as the default local home** for the listed entities — **chosen**.
- **Must stay true:** Local recipe book remains usable per ADR-001; cloud remains optional enhancement; schema-led validation remains the norm for persisted shapes (see project README and [agents.md](../agents.md)).

## Decision

We will treat **Dexie-backed IndexedDB** (`src/lib/db.ts` and successors) as the **default home** in the browser for:

1. **Saved recipes** — full `SavedRecipe` records the user intends to keep, including fields that support the recipe book and recommendations (for example **tags**, **preferences-relevant fields**, **ratings or favorites** when present on the recipe model, and **`checkout_history`** as part of the saved recipe document). These rows are **durable user data**.
2. **Preferences** — user-controlled settings that drive **AI suggestions and other AI recipe prompts** (for example dietary constraints, cuisine preferences; see [ADR-007](ADR-007-ai-provider-contract.md)), stored locally for anonymous and offline use unless a future account/sync ADR specifies otherwise. **Deterministic recommendations** over the saved library use **recipe-local** fields only and **do not** re-apply this preferences object ([ADR-009](ADR-009-recommendations-engine-inputs.md)). These rows are **durable user data** at the product level; concrete tables and migration of legacy stores are implementation concerns.
3. **Cached AI suggestion artifacts** — rows that hold **AI-generated suggestion summaries** (and related metadata such as viewed timestamps or links to promoted recipes) **only for local reuse**, deduplication, and offline reopening. These are **transient cache / local artifact data**, not substitutes for saved recipes and not cloud-backed user recipes unless the user explicitly saves (per README and future AI lifecycle ADR).

We will use **Svelte stores** (including Dexie `liveQuery`-backed stores) as the **reactive read model** over that local data, not as a second system of record: the authoritative persisted state for the domains above remains **Dexie**, consistent with [`src/lib/stores/README.md`](../src/lib/stores/README.md) (local-first reads; cloud subservient when both exist).

**Client runtime:** Accessing this Dexie/IndexedDB data **requires a JavaScript runtime** in the browser; see [ADR-015: JavaScript runtime, Dexie, and progressive enhancement](ADR-015-progressive-enhancement-and-no-js-baseline.md) (Proposed) for how that coexists with SSR, shell navigation, and progressive enhancement.

### Classification summary

| Category | Examples (non-exhaustive) | Durable user data | Transient / cache / operational |
| --- | --- | --- | --- |
| Recipe book | `SavedRecipe` in `db.recipes`, including `checkout_history` on the recipe | Yes | — |
| Preferences | User preferences object keyed for local use; consumed by **AI / suggestions**, not by deterministic recommendation ranking over `SavedRecipe` ([ADR-009](ADR-009-recommendations-engine-inputs.md)) | Yes | — |
| AI suggestions | `db.suggestions` rows; session or TanStack Query caches of fetched detail used for “viewed” UX | No (not a saved recipe) | Yes — local artifact; eligible for caps, pruning, and lifecycle rules in a future ADR |
| Prompt deduplication | `db.prompt_requests` linking prompts to suggestion ids | No | Yes — operational throttle/dedup aid |

### Explicit exclusions (required)

- **We are not** defining Supabase as the source of truth for the anonymous recipe book; remote copies are enhancements and subject to future sync ADRs.
- **We are not** equating **suggestion** table rows with **saved recipes** for backup, sharing, or product semantics.
- **We are not** moving secret-bearing or privileged persistence into the client beyond what belongs in a local user database.
- **We are not** requiring every in-memory store to mirror Dexie; ephemeral UI state may remain non-persisted provided it does not replace Dexie as the durable store for the domains above.

## Consequences

### Positive

- Clear default for new features: persist user-meaningful state in Dexie unless an ADR explicitly allows elsewhere.
- Aligns store README philosophy (“browser as single source of truth”) with a named ADR.
- Separates marketing/legal “user data” (recipes + preferences) from “cached AI output” for retention discussions.

### Negative

- Some features may need two layers (Dexie + in-flight query cache); teams must document which layer is authoritative for recovery after refresh.
- Pruning and retention for suggestions require follow-up lifecycle ADR for precise rules.

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Drift: new domain persisted only in memory or remote | Code review checks against this ADR; [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc) |
| Over-deletion of suggestions hurts UX | Future lifecycle ADR sets caps and user-visible expectations; current code patterns (e.g. suggestion count caps) remain implementation |

## Operational impact

- **Performance / cost:** Prefer Dexie reads for core flows; cap large artifact tables in implementation as today (e.g. bounded suggestion history patterns in `suggestions` store helpers).
- **Debugging:** Reproduce issues with DevTools Application → IndexedDB and Dexie table inspection.
- **Developer workflow:** New persisted entities should get a Zod-backed type, a Dexie table or documented join strategy, and a store helper under `src/lib/stores/` where reactive subscription is needed.

## Examples (optional)

- A user saves a recipe: `db.recipes` receives/updates a `SavedRecipe` row — **durable user data**.
- A user generates ideas: API returns summaries; `saveSuggestions` / related helpers persist rows in `db.suggestions` and may record `db.prompt_requests` — **transient / operational**, described in [`src/lib/stores/suggestions.ts`](../src/lib/stores/suggestions.ts) as local history and deduplication.

## Enforcement rules

- **Cursor / agent rules:** [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc) (globs `src/lib/db.ts`, `src/lib/db/**/*.ts`, `src/lib/stores/**/*.ts`); [README Data Ownership](../README.md) and this ADR together define expectations.
- **Code / architecture:** Durable recipe book and preference inputs should be readable from Dexie when the user has used those features locally; AI suggestion caches belong in Dexie (or explicitly documented alternatives) but must not be documented as the user’s “saved recipe book” in product copy or sync design without ADR-001 / lifecycle updates.
- **When to revisit:** New persisted domains (e.g. meal planner), a change to default storage technology, or a decision to mirror a class of data primarily in cloud storage for anonymous users.

## Supersession notes

- **When to supersede:** If WFD moves primary durable storage for core user data off IndexedDB for the main product path, add a successor ADR and mark this **Superseded**.
- **Stable identifiers:** This file remains `ADR-002-local-data-ownership.md`.

---

## Orchestrated development

Orchestration is **not required** for authoring this ADR alone. Orchestration applies when multi-phase work adds new Dexie tables, changes ownership of existing tables, or alters sync boundaries—then Planner must read ADR-001 and ADR-002 and any accepted sync/lifecycle ADRs.

### Relevant ADRs for implementation

- [ADR-001: Product operating model](ADR-001-product-operating-model.md)
- ADR-002: Local data ownership (this document)

### Planning artifact

- Omit until a phased plan exists for a specific initiative.

### Builder scope boundary

- N/A for this ADR alone; applies to features that introduce or move persisted client state.

### Validator expectations

- Verify new persisted user-visible state uses Dexie (or documented exception with ADR update).
- Verify suggestions and prompt-request rows are not treated as saved recipes for cloud backup semantics without cross-ADR alignment.

### Test role and evidence

- Offline / refresh scenarios: durable data survives; transient caches may reset per lifecycle rules when defined.

### Alignment gaps

- Record in the future alignment-gap document if implementation stores durable user data only outside Dexie.

### Merge / workflow gates

- [x] ADR created for local data ownership backlog item.
- [ ] Known deviations documented when implementation lags this ADR.
- [ ] Validation evidence when behavior changes touch this boundary.
