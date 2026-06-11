# ADR Index — What's For Dinner

## Agent Instructions

- Process, status meanings, conflicts, and index sync rules: [GOVERNANCE.md](GOVERNANCE.md).
- Consult this index before making any architectural decision.
- Only **Accepted** ADRs are binding; do not act on **Proposed**, **Deprecated**, or **Superseded** entries.
- `Superseded` with a successor called out in the ADR body means the listed record is no longer governing — follow the referenced ADR instead.
- If no relevant ADR exists for a decision you are about to make, draft one with status **Proposed** and surface it for review before proceeding.
- ADRs are grouped by domain in the category tables below.

## Index Maintenance Rules

- Update this index in the same session as any ADR status change.
- `Title` should link to the corresponding ADR file.
- The index and the ADR file must never be out of sync.
- ADRs are never removed from this index; use **Deprecated** or **Superseded** (with a clear successor link) as appropriate.

## Creating a New ADR

1. Copy [TEMPLATE.md](TEMPLATE.md).
2. Assign the next sequential ID (increment the numeric segment from the highest existing `ADR-*` file in `adrs/`, e.g. after `ADR-002-…` use `003` → `ADR-003-…`).
3. Name the file `ADR-NNN-short-kebab-title.md` under `adrs/` at the repository root (see [TEMPLATE.md](TEMPLATE.md) for the full naming rule).
4. Set **Status** to **Proposed**.
5. Fill in all sections per the template (remove instructional lines before opening a PR).
6. Submit for review. Once accepted, update **Status** to **Accepted** and add a row in the correct domain table below.

---

## Index

### Platform

| ID                                                               | Domain   | Title                                                  | Status   | Description                                                                                                                                                                                    |
| ---------------------------------------------------------------- | -------- | ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR-001](ADR-001-product-operating-model.md)                    | Platform | Product operating model                                | Accepted | Offline-first, anonymous-first recipe book; optional cloud and AI; binding capability matrix without auth/network/Supabase/OpenAI.                                                             |
| [ADR-004](ADR-004-account-and-cloud-enhancement-model.md)        | Platform | Account and cloud enhancement model                    | Accepted | Supabase as optional enhancement for auth, backup, sharing, and sync; logged-out/offline continuity required for local recipe flows.                                                           |
| [ADR-012](ADR-012-feature-roadmap-boundaries.md)                 | Platform | Feature roadmap boundaries                             | Accepted | Per-feature envelopes for Calendar, URL recipe import, OCR import, and Meal planner: where logic runs, AI/cloud dependency, offline/anonymous behavior, and where each design doc should live. |
| [ADR-015](ADR-015-progressive-enhancement-and-no-js-baseline.md) | Platform | JavaScript runtime, Dexie, and progressive enhancement | Accepted | Dexie requires browser JS (ADR-002); JS allowed when not harmful to perf, a11y, or offline; PE for shell/forms/navigation without implying no-JS local recipe book; complements ADR-014.       |

---

### Architecture

| ID                                                     | Domain       | Title                                  | Status   | Description                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ------------ | -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR-002](ADR-002-local-data-ownership.md)             | Architecture | Local data ownership                   | Accepted | Dexie/IndexedDB as default home for recipes, preferences, and cached AI artifacts; durable vs transient classification; preferences feed AI/suggestions, not deterministic recommendations ([ADR-009](ADR-009-recommendations-engine-inputs.md)). |
| [ADR-003](ADR-003-ai-suggestion-lifecycle.md)          | Architecture | AI suggestion lifecycle                | Accepted | Prompt-to-suggestion lifecycle is transient-local with dedup, bounded history, and explicit promotion boundary to durable recipes.                                                                                                                |
| [ADR-005](ADR-005-sync-and-conflict-resolution.md)     | Architecture | Sync and conflict resolution           | Accepted | Local-first Dexie sync semantics with Supabase replicas, tombstone propagation, timestamp-led conflict resolution, restore behavior, and checkout-history handling.                                                                               |
| [ADR-016](ADR-016-frontend-data-flow-and-svelte-dx.md) | Architecture | Frontend data flow and Svelte async UX | Accepted | Layered defaults: Dexie LiveQuery stores for local data, TanStack Query for remote HTTP, SvelteKit load/actions for SSR gates; async UI envelopes; `{#await}` and `$effect`+`fetch` as escape hatches; aligns with offline-first and ADR-002 SoT. |
| [ADR-017](ADR-017-recipe-url-extraction.md)            | Architecture | Recipe URL extraction                  | Accepted | Server fetch and content preparation (JSON-LD, HTML text), extraction-only AI with page content in input, Zod-validated draft; fail closed on CSR/bot/empty pages; module layout under `src/lib/api/recipe-import/`.                              |
| [ADR-007](ADR-007-ai-provider-contract.md)             | Architecture | AI provider contract                   | Accepted | Server-only provider access; **Responses API + Zod** preferred; **Chat Completions deprecated** (legacy in `server/openai.ts`); preference injection for generation; errors, offline degradation, and future personal-provider shape.             |
| [ADR-011](ADR-011-self-hosting-provider-model.md)      | Architecture | Self-hosting provider model            | Accepted | Service boundaries for user-controlled AI APIs and user-hosted databases; required vs optional vs unsupported provider capabilities; capability flags to client; permissions vs personal providers; identity stays out of scope for v1.           |

---

### UI

| ID                                                    | Domain | Title                           | Status   | Description                                                                                                                                                                                                                   |
| ----------------------------------------------------- | ------ | ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR-013](ADR-013-ui-component-library-bits-ui.md)    | UI     | UI component library — bits-ui  | Accepted | bits-ui as primary headless primitives under `src/lib/ui/`; compose with Tailwind/local patterns; no second headless toolkit without a new ADR; agent `llms.txt` fetch policy scoped to bits-ui work.                         |
| [ADR-014](ADR-014-semantic-html-and-accessibility.md) | UI     | Semantic HTML and accessibility | Accepted | Native-first semantics; bits-ui composition must remain accessible; landmarks, headings, keyboard, motion; shell invariants without freezing DOM; pairs with ADR-015 for JS runtime and progressive enhancement expectations. |

---

### Security

| ID                                                   | Domain   | Title                          | Status   | Description                                                                                                                      |
| ---------------------------------------------------- | -------- | ------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [ADR-006](ADR-006-serverless-and-secret-boundary.md) | Security | Serverless and secret boundary | Accepted | Server-only OpenAI and private env; no secrets in client or `.svelte`; serverless/portability constraints (incl. Workers-style). |

---

### Quality

| ID                                                     | Domain       | Title                                 | Status   | Description                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ------------ | ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ADR-008](ADR-008-schema-led-domain-contracts.md)      | Quality      | Schema-led domain contracts           | Accepted | Zod as source of truth for persisted, API, and validated external data; inferred types; module layout under `src/lib/api`; `$lib/utils` vs API boundaries; boundary validation; Dexie/store consumption patterns.                    |
| [ADR-009](ADR-009-recommendations-engine-inputs.md)    | Architecture | Recommendations engine (local inputs) | Accepted | Client-side Dexie-backed heuristics over saved recipes and usage fields only; user preferences apply to AI suggestions, not to recommendations; explicit separation from AI suggestions; no remote ranking for core recommendations. |
| [ADR-010](ADR-010-offline-cache-and-service-worker.md) | Platform     | Offline cache and service worker      | Accepted | Two-tier Cache Storage (versioned static shell cache-first; same-origin GET network-first with offline fallback); Dexie remains system of record; no cross-origin interception; policy for future GET opt-outs and freshness.        |
