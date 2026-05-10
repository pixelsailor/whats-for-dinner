# README / ADR alignment gaps

Working backlog of places where **current behavior or implementation** does not match **stated intent** in the top-level [`README.md`](../README.md) or **Accepted** ADRs in [`docs/adrs/`](./adrs/INDEX.md).

This is **not** the same as [`adr-and-rules-todo.md`](./adr-and-rules-todo.md): that file tracks governance artifacts (future ADRs, Cursor rules, workflows). **This file tracks product and architecture drift**—symptoms like slow loads, timeouts, or flows that contradict offline-first, anonymous-first, or local-first mandates.

Agents and contributors should **add rows as gaps are discovered** (for example while working through ADR or rules tasks). Prefer fixing small gaps in the same change set; when a fix is deferred, record it here so intent stays honest.

---

## How to record a gap

Use a new row in the table below, or add a subsection under **Deferred / investigated** with more detail and links.

Suggested fields (adapt as needed):

| Field | Guidance |
| ----- | -------- |
| **ID** | `GAP-NNN` (increment from the highest existing ID in this file). |
| **Status** | `Open`, `Investigating`, `Planned`, `Fixed` (move fixed rows to **Resolved** or delete after a release note if you prefer a slim doc). |
| **Severity** | `Blocker` (violates core mandate for typical users), `Major`, `Minor`, `Cosmetic`. |
| **Source** | README section heading and/or ADR ID (e.g. ADR-001 § capability matrix). |
| **Observed** | What actually happens (repro steps if non-obvious). |
| **Expected** | What README/ADR says should happen. |
| **Notes** | Suspected cause, affected routes or modules, links to issues/PRs. |
| **Owner** | Optional; person or team driving remediation. |

---

## Active gaps

| ID | Status | Severity | Source | Observed | Expected | Notes | Owner |
| -- | ------ | -------- | ------ | -------- | -------- | ----- | ----- |
| GAP-001 | Open | Major | README — *Offline-first*; [ADR-001](./adrs/ADR-001-product-operating-model.md) capability matrix; [ADR-004](./adrs/ADR-004-account-and-cloud-enhancement-model.md) logged-out / offline continuity | Using the app while **offline** (or with unreliable network) can produce **slow loading and timeouts**, undermining practical offline use. | Once cached, the app should remain **useful offline** with **fast repeat loads** and core recipe flows without blocking on network, Supabase, or OpenAI. | Likely causes include uncapped `fetch` / TanStack Query behavior, layout loads that assume network, or missing offline-first loading paths; triage with DevTools (Network throttling / offline) and trace critical `+layout` / `+page` data dependencies. | — |
| GAP-002 | Open | Major | [ADR-005](./adrs/ADR-005-sync-and-conflict-resolution.md) soft delete and restore behavior | Current sync planning reads active recipes only, filtering out rows with `deleted_at` or `archived` before building the plan. | Sync planning should include tombstoned rows so deletes and restores propagate across devices and do not reappear as active data. | Affected area: `src/lib/api/cloud/sync.service.ts` and `src/lib/api/cloud/cloud.model.ts`; remediation should include tombstone-aware planning and tests for delete/restore propagation. | — |
| GAP-003 | Open | Minor | [ADR-006](./adrs/ADR-006-serverless-and-secret-boundary.md) — private env naming | The OpenAI key is read from `$env/static/private` but the variable name is `VITE_OPENAI_API_KEY` (also documented in [README](../README.md)). | Private-only configuration should use a name that does not suggest `import.meta.env` public embedding (for example `OPENAI_API_KEY`). | Low security risk if the key never appears in client bundles; renaming requires updating README, local `.env` examples, and deployment secrets. | — |
| GAP-004 | Open | Minor | [README](../README.md) — *Technology Stack* / *AI services*; [ADR-007](./adrs/ADR-007-ai-provider-contract.md) | Documentation emphasizes **Chat Completions** only, while suggestion and full-recipe generation also use the **Responses API** with Zod-structured output (`$lib/api/ai/ai.model.ts`). | Docs and stack summary should reflect the **accepted dual-path** contract (Completions legacy + Responses preferred) or converge implementation to a single family. | Affects root README and any agent-facing stack blurbs; implementation is intentional per ADR-007 until migration completes. | — |
| GAP-005 | Open | Major | [README](../README.md) — *Preferences shape suggestions*; [ADR-007](./adrs/ADR-007-ai-provider-contract.md) § preferences | **Revision**, **assistance**, and **addendum** flows in `src/lib/server/openai.ts` do not inject user preference text. `src/routes/api/recipes/new/+server.ts` reads `preferences` for gating only and does not pass dietary/preferences text into `appendRecipeDetails`. | Preferences and dietary constraints should influence **recipe-related** AI prompts broadly (at minimum revision and metadata addendum when AI is used). | Assistance may be partially exempt if framed as pure Q&A; revision and addendum are clear gaps. | — |
| GAP-006 | Open | Minor | [ADR-007](./adrs/ADR-007-ai-provider-contract.md) § structured response contract | Chat Completions handlers rely on `JSON.parse` and type assertions (`parseJsonPayload` in `src/lib/server/openai.ts`); suggestion routes parse model output again in `+server.ts` without `safeParse`. | AI JSON should be validated with **Zod** (or equivalent) at the server boundary before success responses. | `src/lib/api/ai/ai.schemas.ts` — `RecipeSuggestionsResponseSchema` includes `request_id` meant for the API layer but is bundled into the structured-output schema for the model; review schema vs handler merge in `src/routes/api/suggestions/+server.ts`. | — |
| GAP-007 | Open | Major | [README](../README.md) — *Architecture Boundaries* (schema-led model); [ADR-008](./adrs/ADR-008-schema-led-domain-contracts.md) | **Duplicate domain types** in `src/lib/types.ts` (marked deprecated but still imported from routes, `src/lib/server/openai.ts`, `src/lib/db/remote.ts`, `src/lib/stores/preferences.ts`). **`PromptRequest`** in `src/lib/db.ts` has no Zod schema. **`src/lib/api/**/*.schemas.ts`** does not use `.strict()` on object schemas despite [AGENTS.md](../AGENTS.md). | Single Zod-led contract per entity; types from `z.infer`; validate persisted/API/AI shapes at boundaries; prefer `.strict()` on API domain objects. | Remove or re-export from `$lib/api` only; add `PromptRequest` schema if it remains a first-class stored row; add `.strict()` incrementally or in one pass. Overlaps GAP-006 for unvalidated AI JSON. | — |
| GAP-008 | Open | Major | [ADR-009](./adrs/ADR-009-recommendations-engine-inputs.md) | Unused `recommendedRecipes` store (`src/lib/stores/recommendations.ts`) diverges from `src/routes/recommendations/+page.svelte`; refresh path uses unfiltered `db.recipes.toArray()` vs `is_current` / `!deleted_at`; “stale” buckets use **any** old `checkout_history` entry; in-place `.sort()` mutates the live recipe list; `svelte-check` errors on `recommendedRecipes` (string timestamps vs numeric sort/`dayDiff`). | Recommendations use **saved-recipe fields only** (per ADR-009), share consistent filters with other recipe views, avoid duplicate incompatible engines, and keep bucketing semantics aligned with ADR-009. | Per ADR-009, **user preferences do not apply** to recommendations; README wording corrected. See ADR-009 § Alignment gaps. | — |
| GAP-009 | Open | Minor | [README](../README.md) — *Offline-first*; [ADR-010](./adrs/ADR-010-offline-cache-and-service-worker.md) | `src/service-worker.js` caches **successful same-origin GET** responses (including navigations and `/api/...` GETs) in `data-cache-*` with **no per-route opt-out or TTL**; `activate` does not call **`clients.claim()`**. | Shell and documents should support offline use without equating HTTP cache with Dexie; **highly dynamic or sensitive GET** surfaces should be excluded or freshness-bound; optional **immediate control** via `clients.claim()` when UX requires it. | Only **`/api/share/[token]`** is GET today; risk rises if more GET APIs ship without updating the worker. Versioned cache names still clear old generations on deploy. | — |
| GAP-010 | Open | Major | [README](../README.md) — *Self-hosting as a future path*; [ADR-011](./adrs/ADR-011-self-hosting-provider-model.md) | (a) AI route handlers in `src/routes/api/suggestions/+server.ts`, `src/routes/api/recipes/+server.ts`, and `src/routes/api/recipes/new/+server.ts` reject any request without `permissions.ai_assistance`, with **no escape path for a validated personal AI provider**; (b) the `OpenAI` client in `src/lib/api/ai/ai.model.ts` and `src/lib/server/openai.ts` is a **singleton** keyed by `VITE_OPENAI_API_KEY`, so a per-request or personal-provider override cannot be supplied; (c) `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` are read at compile time in `src/lib/supabaseClient.ts`, `src/hooks.server.ts`, and `src/lib/db/remote.ts`, so a deployment cannot point at a different Supabase project at runtime; (d) `src/lib/api/cloud/cloud.service.ts` is a Supabase-bound class with no provider-agnostic interface; (e) `src/routes/+layout.server.ts` exposes only `featureFlags.openai` as a single boolean — no `aiCapabilities` or `cloudCapabilities` set; (f) `src/lib/db.ts` header comment claims "By virtue of `ai_assistance` permission requirements, `suggestions` may only be stored for authenticated users," tying suggestion storage to a WFD-managed account. | AI gating should pair `permissions.ai_assistance` with a validated **personal-provider** path; AI clients should be resolvable per request from managed default or personal config; cloud URL/anon key should be resolvable at runtime; cloud database operations should be expressible against a capability matrix; `featureFlags` should expose AI/cloud capability sets; suggestion storage should follow [ADR-003](./adrs/ADR-003-ai-suggestion-lifecycle.md) regardless of WFD account state. | Pre-implementation drift: nothing currently advertises personal-provider support to users, but several seams already foreclose it. Remediation likely starts by factoring the `OpenAI` client behind a server-side resolver and widening `featureFlags`, then revisiting AI route gating. See [ADR-011](./adrs/ADR-011-self-hosting-provider-model.md) § Alignment gaps for the per-row breakdown. | — |

---

## Deferred / investigated

Use this section for longer write-ups, spikes, or gaps that need design before a table row is enough.

_(None yet.)_

---

## Resolved

Move **Fixed** items here with a one-line **Resolution** (and optional PR link) so the doc stays a useful history.

_(None yet.)_
