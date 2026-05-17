# ADR-016: Frontend data flow and Svelte async UX

## Status

**Accepted**

## Date

2026-05-17

## Scope

- **In scope:** How server routes (`+server.ts`, `+page.server.ts`, `+layout.server.ts`), middleware/hooks, and client modules expose **data and errors** to `.svelte` pages and shared UI; default patterns for **loading**, **success**, and **error** UI; alignment with offline-first (ADR-001), Dexie ownership (ADR-002), serverless boundaries (ADR-006), schema validation (ADR-008), and TanStack Query usage.
- **Out of scope:** Detailed Zod module layout (ADR-008), AI provider contracts (ADR-007), sync semantics (ADR-005), component library choice (ADR-013), and the **implementation sweep** that refactors existing pages to match this ADR (tracked as a separate backlog item in [`docs/adr-and-rules-todo.md`](../docs/adr-and-rules-todo.md)).

## Context

WFD mixes several async sources: Dexie **LiveQuery** stores, **TanStack Query** for same-origin HTTP (especially AI), SvelteKit **load** / **form actions** for auth-gated server work, and occasional **imperative `fetch`**. Without a single decision, pages invent one-off `ViewState` objects, `$effect` fetches, or silent failures—hurting offline-first UX (ADR-001) and reviewability.

### Decision pressure (required)

The governance backlog item **“ADR + rules: Backend API and middleware patterns for front-end `.svelte` DX”** requires a **binding default** plus **escape hatches** before a repo-wide implementation pass. Agents and contributors need one place to answer: “Where does this data live, and how should the Svelte surface show pending/error?”

### Supporting context

- **Problem:** Inconsistent async UI (`app.status`, manual `$effect` subscriptions, mixed error shapes) and no documented preference among `{#await}`, TanStack Query, and store envelopes.
- **Options considered (summary):**
  - **`{#await}` on promises** — strong for one-shot SSR/load promises; weak for long-lived Dexie/TanStack subscriptions (see comparison below).
  - **Imperative `fetch` in `$effect`** — flexible but duplicates caching, cancellation, and offline discipline.
  - **TanStack Query for all async** — good for HTTP; must not become SoT for ADR-002 domains.
  - **Dexie LiveQuery stores only** — correct for local recipe book; insufficient for privileged server APIs.
  - **Layered defaults by data source** — **chosen**; matches current production direction.
- **Must stay true:** Core recipe routes do not **block** on network/Supabase/OpenAI for Dexie-backed content (ADR-001, ADR-004); secrets stay server-side (ADR-006); HTTP JSON validated at boundaries (ADR-008).

## Decision

### 1. Choose the integration layer by data source

| Source | Default integration | Consumed in `.svelte` as |
| --- | --- | --- |
| **ADR-002 local data** (recipes, suggestions cache, preferences in Dexie, etc.) | `liveQuery` via `createLiveQueryStore` or existing stores in `src/lib/stores/` | `$derived($store)` → `{ data, loading, error }` |
| **Remote HTTP** (AI, cloud APIs, same-origin `fetch` to `/api/**`) | `createQuery` in `*.queries.ts` (or service called from `queryFn`) per [`docs/tanstack-query.md`](../docs/tanstack-query.md) | `$derived($queryStore)` → TanStack fields (`data`, `isPending`, `isError`, `error`, `refetch`, …) |
| **SSR / auth gate / server-only initial payload** | `+page.server.ts` / `+layout.server.ts` `load`; redirects via `redirect()` | `data` from `$props()`; optional `{#await}` only when returning a **promise** from `load` |
| **Mutations** (forms, saves, deletes) | SvelteKit **form actions** with `fail()` / success payloads, or **domain/store helpers** that write Dexie | `enhance()` + action result; do not hide writes inside `queryFn` |
| **Enhancement-only work** (sync, cloud download) | Gated by capability helpers; call services or queries with `enabled: false` when unavailable | Disabled control + honest reason (ADR-001, [`.cursor/rules/offline-connectivity-capability.mdc`](../.cursor/rules/offline-connectivity-capability.mdc)) |

**We will not** use a single global pattern (for example “everything in `{#await}`” or “everything in `$effect` + `fetch`”) across these layers.

### 2. Async UI in `.svelte` files

1. **Bind UI to the envelope** from the chosen layer: show **loading**, **empty**, **error**, and **success** explicitly. Never leave interactive surfaces silent while work is in flight.
2. **Prefer `$derived`** (and `$derived.by`) to fold multiple envelopes into a single view state (for example `viewState` on suggestions pages) instead of imperative `$effect` that only copies status into a parallel object—unless the effect performs real side work (Dexie write-through, navigation, timers).
3. **`{#await}`** is an **escape hatch** for **load-returned promises** or rare one-shot promises that are not backed by a store or TanStack Query. It is **not** the default for Dexie or TanStack subscriptions.
4. **Imperative `fetch` in `$effect`** is an **escape hatch** only when neither TanStack Query nor a form action fits; the effect must document **why** in a short comment and handle **abort/cleanup** if the prompt can change mid-flight.
5. **Offline-first display:** For ADR-002 domains, **read from Dexie first**; use TanStack Query for **new** network fetches. After a successful remote fetch, **persist through store/domain helpers** (see suggestions flow: API → Dexie → LiveQuery for display).

### 3. Server and API error exposure

1. **SvelteKit handlers** (`+server.ts`, `+page.server.ts`): use `error(status, messageOrBody)` or `fail(status, { error, … })` for expected failures; validate with Zod at the boundary (ADR-008).
2. **JSON API routes** consumed by `fetch` / TanStack: on failure, return a JSON body that includes a stable **`error`** string (or message field documented in the route’s schema) and an appropriate HTTP status. Re-throw SvelteKit `HttpError` objects instead of swallowing them.
3. **Client parsing:** map failures to user-visible copy that separates **offline**, **logged out**, **missing permission**, and **provider/sync failure** when the action is enhancement-only—do not label all failures as “network error” (offline-connectivity rule).
4. **Do not** use TanStack Query cache or HTTP cache as the system of record for recipe book data (ADR-002, [`docs/tanstack-query.md`](../docs/tanstack-query.md)).

### 4. Comparison of viable front-end patterns (recorded)

| Pattern | Pros | Cons | WFD role |
| --- | --- | --- | --- |
| **`{#await}`** | Declarative branches; fits SSR load promises | Poor fit for live Dexie/TanStack updates; easy to omit `:catch` | Escape hatch for load promises |
| **`+page` / `+layout` `load` only** | Single SSR payload; good redirects | Blocks UX if used for data that should be local-first | Auth gates, layout session, server-only bootstrap |
| **TanStack `createQuery`** | Dedup, cache, `refetch`, status fields | Not SoT for Dexie; needs Zod in `queryFn` | **Default for remote HTTP** |
| **Dexie LiveQuery store** | Offline-first, reactive local SoT | Not for secret/server-only APIs | **Default for ADR-002 reads** |
| **`$effect` + `fetch`** | Quick to write | No shared cache; cancellation burden; duplicates query layer | **Escape hatch** |
| **Legacy `ViewState` (`'idle' \| 'loading' \| 'error'`)** | Familiar in existing pages | Duplicates derived state if not careful | Allowed when derived from envelopes; avoid manual-only status toggles |

### Explicit exclusions (required)

- **We are not** standardizing on `{#await}` for all async work in the app.
- **We are not** mandating TanStack Query for Dexie-backed recipe lists or other ADR-002 reads.
- **We are not** allowing `queryFn` to perform durable writes or to replace Dexie as SoT.
- **We are not** blocking recipe pages on `load` awaiting Supabase/OpenAI when Dexie already has the content (ADR-001).

## Consequences

### Positive

- One decision tree for agents: pick layer by source, then bind UI to that layer’s envelope.
- Aligns documentation with existing strengths (suggestions: Dexie-first + conditional TanStack; recipe detail: LiveQuery).
- Clear escape hatches reduce debate in PR review.

### Negative

- Multiple patterns remain in the codebase until the implementation backlog item lands; contributors must read the layer table.
- Pages that combine Dexie + TanStack + capability gating need thoughtful `$derived` view state (more complex than a single `{#await}`).

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Drift: new pages use ad hoc `$effect` fetch | [`.cursor/rules/frontend-data-flow.mdc`](../.cursor/rules/frontend-data-flow.mdc); Validator checks; implementation backlog item |
| Inconsistent API error JSON | Prefer documented `{ error }` field; extend Zod response schemas in `*.schemas.ts`; align over time (see GAP-024) |
| `load` blocks offline recipe UX | Code review + ADR-001; Dexie reads in component, not blocking `load` for local book |

## Operational impact

- **Developer workflow:** New remote reads → `*.queries.ts` + TanStack; new local lists → store helper + LiveQuery; new gated server bootstrap → `+page.server.ts`.
- **Testing:** Unit-test `queryFn` and store helpers; component tests assert loading/error branches on envelopes.
- **Performance:** TanStack `staleTime` / `enabled` and Dexie-first checks avoid duplicate AI calls (existing suggestions pattern).

## Examples

- Dexie envelope: [`src/lib/stores/_utils.ts`](../src/lib/stores/_utils.ts) `createLiveQueryStore`.
- TanStack + Dexie write-through: [`src/routes/suggestions/+page.svelte`](../src/routes/suggestions/+page.svelte), [`src/lib/api/ai/ai.queries.ts`](../src/lib/api/ai/ai.queries.ts).
- Server API: [`src/routes/api/suggestions/+server.ts`](../src/routes/api/suggestions/+server.ts).
- Auth-gated load: [`src/routes/preferences/+page.server.ts`](../src/routes/preferences/+page.server.ts).

## Enforcement rules

- **Cursor / agent rules:** [`.cursor/rules/frontend-data-flow.mdc`](../.cursor/rules/frontend-data-flow.mdc) (primary); cross-links in [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc), [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc), [`.cursor/rules/lint-and-code-quality.mdc`](../.cursor/rules/lint-and-code-quality.mdc).
- **Docs:** [`docs/tanstack-query.md`](../docs/tanstack-query.md), [`src/lib/api/README.md`](../src/lib/api/README.md) (_Data fetching_).
- **When to revisit:** Adoption of SvelteKit remote functions at scale, or a repo-wide shared `AsyncView` helper—either triggers a narrow ADR amendment or successor.

## Supersession notes

- **When to supersede:** If SvelteKit remote functions or a unified data layer replace the Dexie + TanStack + load split for most routes.
- **Stable identifier:** ADR-016.

## Orchestrated development

Orchestration not required — documentation and rule authoring only. Implementation alignment is a separate backlog item.

### Relevant ADRs for implementation

- ADR-001: Non-blocking core flows; enhancement degradation.
- ADR-002: Dexie as SoT; store read model.
- ADR-006: Server-only privileged APIs.
- ADR-008: Zod at HTTP and persistence boundaries.

### Alignment gaps

- **GAP-024:** Legacy pages use hand-managed `ViewState` and mixed error parsing; harmonize during the implementation backlog item ([`docs/readme-adr-alignment-gaps.md`](../docs/readme-adr-alignment-gaps.md)).
