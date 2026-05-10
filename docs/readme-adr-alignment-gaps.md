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
| GAP-005 | Open | Major | [README](../README.md) — *Preferences shape recommendations*; [ADR-007](./adrs/ADR-007-ai-provider-contract.md) § preferences | **Revision**, **assistance**, and **addendum** flows in `src/lib/server/openai.ts` do not inject user preference text. `src/routes/api/recipes/new/+server.ts` reads `preferences` for gating only and does not pass dietary/preferences text into `appendRecipeDetails`. | Preferences and dietary constraints should influence **recipe-related** AI prompts broadly (at minimum revision and metadata addendum when AI is used). | Assistance may be partially exempt if framed as pure Q&A; revision and addendum are clear gaps. | — |
| GAP-006 | Open | Minor | [ADR-007](./adrs/ADR-007-ai-provider-contract.md) § structured response contract | Chat Completions handlers rely on `JSON.parse` and type assertions (`parseJsonPayload` in `src/lib/server/openai.ts`); suggestion routes parse model output again in `+server.ts` without `safeParse`. | AI JSON should be validated with **Zod** (or equivalent) at the server boundary before success responses. | `src/lib/api/ai/ai.schemas.ts` — `RecipeSuggestionsResponseSchema` includes `request_id` meant for the API layer but is bundled into the structured-output schema for the model; review schema vs handler merge in `src/routes/api/suggestions/+server.ts`. | — |
| GAP-007 | Open | Major | [README](../README.md) — *Architecture Boundaries* (schema-led model); [ADR-008](./adrs/ADR-008-schema-led-domain-contracts.md) | **Duplicate domain types** in `src/lib/types.ts` (marked deprecated but still imported from routes, `src/lib/server/openai.ts`, `src/lib/db/remote.ts`, `src/lib/stores/preferences.ts`). **`PromptRequest`** in `src/lib/db.ts` has no Zod schema. **`src/lib/api/**/*.schemas.ts`** does not use `.strict()` on object schemas despite [AGENTS.md](../AGENTS.md). | Single Zod-led contract per entity; types from `z.infer`; validate persisted/API/AI shapes at boundaries; prefer `.strict()` on API domain objects. | Remove or re-export from `$lib/api` only; add `PromptRequest` schema if it remains a first-class stored row; add `.strict()` incrementally or in one pass. Overlaps GAP-006 for unvalidated AI JSON. | — |

---

## Deferred / investigated

Use this section for longer write-ups, spikes, or gaps that need design before a table row is enough.

_(None yet.)_

---

## Resolved

Move **Fixed** items here with a one-line **Resolution** (and optional PR link) so the doc stays a useful history.

_(None yet.)_
