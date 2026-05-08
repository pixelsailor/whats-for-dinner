# ADR-003: AI suggestion lifecycle

## Status

**Accepted**

## Date

2026-05-06

## Scope

- **In scope:** Lifecycle of AI suggestion prompts and artifacts across home prompt entry, suggestions list/history, and promotion into durable saved recipes. This includes request deduplication, local persistence and pruning, viewed-state semantics, and offline behavior for previously cached suggestions.
- **Out of scope:** OpenAI provider contract details, retry policy internals, and response schema evolution (future ADR on AI provider contract); Supabase sync semantics and conflict handling (future sync ADR); auth/provider policy and account scope boundaries beyond what this ADR consumes (see ADR-004).

## Context

WFD currently routes prompt-driven suggestion requests through `/suggestions`, stores results in Dexie (`suggestions`, `prompt_requests`), and uses local history as the display source. Without a lifecycle ADR, implementers can accidentally treat AI artifacts as durable cloud records, break deduplication, or regress offline behavior by bypassing local caches.

### Decision pressure (required)

The product promise requires AI to remain optional while still giving useful continuity for users who already generated suggestions. We need explicit rules for when data is transient, when it is durable, and when cloud should be excluded.

### Supporting context

- **Problem:** Suggestion and recipe concepts can be conflated, leading to wrong retention and sync assumptions.
- **Options considered:** (1) Treat suggestions as durable cloud records — rejected; violates offline-first/anonymous-first product model. (2) Keep suggestions only in memory — rejected; loses continuity and increases repeat API calls. (3) Local transient persistence with explicit promotion to saved recipes — **chosen**.
- **Must stay true:** ADR-001 capability matrix and ADR-002 data ownership classification.

## Decision

AI suggestions follow a **transient-local lifecycle** with explicit promotion:

1. **Prompt capture**: User enters prompt from home or suggestions page flow; prompt is sanitized before request lookup and request dispatch.
2. **Dedup/throttle gate**: For a sanitized prompt, check `prompt_requests` in Dexie; if recent request exists (current implementation uses 5s throttle), reuse mapped suggestion IDs and skip API call.
3. **Generation**: If no reusable request exists and AI is available, call suggestion API.
4. **Write-through to Dexie**: Persist returned summaries to `db.suggestions` and persist mapping in `db.prompt_requests`.
5. **Display from local store**: UI renders prompt results and history from Dexie-backed stores, not directly from raw network payload.
6. **History and pruning**: Suggestions remain local transient artifacts and are bounded (current implementation: max 100 suggestions, oldest pruned).
7. **Viewed state**: “Viewed” is derived from persisted marker(s) and/or session cache; it is UX metadata, not a durability upgrade.
8. **Promotion boundary**: Only when a user explicitly saves/converts generated content into a recipe does it become durable recipe data in recipe storage.

### Retention and invalidation rules

- Suggestions and prompt-request mappings are **transient local cache data** and may be pruned.
- Clearing suggestion history removes local suggestion artifacts and is allowed without affecting saved recipes.
- Prompt dedup mappings are operational metadata and may be reset during schema migrations.
- Cached suggestions may be available offline if already stored; fetching new suggestions requires online AI availability per capability checks.

### Cloud rule (binding)

- AI suggestion artifacts (`db.suggestions`, `db.prompt_requests`, and equivalent transient caches) are **not cloud-saved as user recipes**.
- Cloud backup/sync concerns apply to durable user recipe records and related account data, not transient suggestion artifacts, unless a future ADR explicitly changes this boundary.

### Explicit exclusions (required)

- **We are not** declaring every AI-derived artifact durable by default.
- **We are not** requiring cloud persistence for suggestion history.
- **We are not** allowing suggestion retention rules to override recipe durability once a user has explicitly saved a recipe.

## Consequences

### Positive

- Reduces duplicate API calls and token use.
- Preserves useful local continuity for previously generated suggestions.
- Keeps product semantics clear: suggestion != saved recipe.

### Negative

- Users may expect cross-device suggestion history and not get it.
- Lifecycle spans multiple stores and URL state, which increases implementation complexity.

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Duplicate requests from rapid navigation | Keep prompt dedup + request_id URL mapping behavior and tests |
| Misclassification of suggestions as cloud recipe data | Enforce ADR-002 + this ADR in code review and rule backlog |
| Unbounded local growth | Maintain bounded history and pruning policy |

## Operational impact

- **Performance / cost:** Local-first rendering avoids repeated API fetches for existing prompts; dedup lowers redundant calls.
- **Debugging:** Verify lifecycle by inspecting `db.suggestions` and `db.prompt_requests`, URL params (`prompt`, `request_id`), and capability-state branches.
- **Developer workflow:** Suggestion-related features should declare lifecycle step touched (capture, dedup, generate, persist, display, prune, promote).

## Examples (optional)

- A user submits “quick vegetarian lunches,” navigates away, then returns: prompt results are shown from Dexie using the stored request mapping when available.
- User clears suggestion history: `suggestions` rows are removed, but saved recipes remain intact.
- User opens a suggestion and saves it as recipe: durable data now belongs to recipe storage and follows recipe/cloud rules, not suggestion cache rules.

## Enforcement rules

- **Cursor / agent rules:** Future AI integration boundary and Supabase enhancement rules should cite ADR-003 and ADR-004.
- **Code / architecture:** Suggestion UI should read through local stores; network payloads should be written through to Dexie before becoming canonical on-screen state.
- **When to revisit:** If we introduce cross-device suggestion history, user-configurable retention windows, or provider-independent artifact classes.

## Supersession notes

- **When to supersede:** If suggestion artifacts become a first-class durable/synced domain across devices.
- **Stable identifiers:** This file remains `ADR-003-ai-suggestion-lifecycle.md`.

---

## Orchestrated development

Orchestration is not required for this ADR text alone. It is required for multi-phase implementation work that changes lifecycle boundaries, retention policy, or cloud behavior for AI artifacts.

### Relevant ADRs for implementation

- [ADR-001: Product operating model](ADR-001-product-operating-model.md)
- [ADR-002: Local data ownership](ADR-002-local-data-ownership.md)
- ADR-003: AI suggestion lifecycle (this document)

### Planning artifact

- Omit until a phased plan exists for lifecycle changes.

### Builder scope boundary

- N/A for this ADR-only change.

### Validator expectations

- Verify prompt->request_id->Dexie->UI flow remains local-first.
- Verify suggestion artifacts are not treated as cloud-synced durable recipe data.

### Test role and evidence

- Validate prompt dedup behavior, offline reopening of cached suggestions, and clear-history isolation from saved recipes.

### Alignment gaps

- Record any place suggestions are treated as durable cloud user data until corrected.

### Merge / workflow gates

- [x] ADR created for AI suggestion lifecycle backlog item.
- [ ] Known deviations documented when implementation lags this ADR.
- [ ] Validation evidence when behavior changes touch this boundary.
