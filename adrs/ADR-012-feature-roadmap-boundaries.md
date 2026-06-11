# ADR-012: Feature roadmap boundaries

## Status

**Accepted**

## Date

2026-05-09

## Scope

- **In scope:** Architectural envelopes for the four near-term roadmap features named in the [README — _Roadmap Direction_](../README.md): **Calendar**, **URL recipe import**, **OCR import**, and **Meal planner**. For each feature, this ADR fixes (a) where logic runs (client/server), (b) which existing data ownership rules apply, (c) which AI and cloud capabilities are required vs optional, (d) what offline / anonymous / disabled-AI behavior must be designed in from day one, and (e) where deeper feature design should live.
- **Out of scope:** Detailed UI/UX designs, exact Zod schemas for not-yet-modelled domains (delegated to per-feature implementation ADRs or design docs), database migration plans, and pricing/permission decisions for individual capabilities. Calendar **sharing**, planner **sharing/sync**, and any cross-device collaboration on plans are deferred to successor ADRs that extend [ADR-005](ADR-005-sync-and-conflict-resolution.md).

## Context

The README commits to four roadmap directions: Calendar, URL recipe import, OCR import, and Meal planner. Each of these touches multiple existing ADR boundaries:

- **Local data ownership** ([ADR-002](ADR-002-local-data-ownership.md)): new persistent data (e.g. plans, shopping lists) needs Dexie tables and Zod schemas.
- **AI provider contract** ([ADR-007](ADR-007-ai-provider-contract.md)): URL import and OCR are AI-assisted operations that must run server-side with validated structured output.
- **Self-hosting provider model** ([ADR-011](ADR-011-self-hosting-provider-model.md)): URL import and OCR must declare AI capability requirements so personal-provider deployments degrade correctly.
- **Offline-first** ([ADR-001](ADR-001-product-operating-model.md), [ADR-010](ADR-010-offline-cache-and-service-worker.md)): each feature must specify what works offline, anonymously, and with AI disabled.
- **Sync / conflict resolution** ([ADR-005](ADR-005-sync-and-conflict-resolution.md)): planner data and any future calendar overlay need explicit sync semantics or an explicit local-only declaration.

Without an envelope ADR, each of these features will get a solo design doc that quietly relitigates "does this need auth?" and "does this work offline?" — risking re-introduction of mandatory-account paths.

### Decision pressure (required)

`checkout_history` already exists on `SavedRecipe` ([`src/lib/api/recipe/recipe.schemas.ts`](../src/lib/api/recipe/recipe.schemas.ts)) and is mutated from [`src/routes/recipes/[...id]/+page.svelte`](../src/routes/recipes/%5B...id%5D/+page.svelte) and other routes. The Calendar feature is **closer to "next implementation"** than the others and will be the first roadmap feature to hit a route. Without an envelope, the Calendar PR will set precedent for the others (offline behavior, sync expectations, AI dependency) by accident.

Likewise, the AI capability matrix in [ADR-011](ADR-011-self-hosting-provider-model.md) §2 names `vision` as **optional**; OCR import is the first feature that consumes that flag, and its design must match the matrix rather than redefine it.

### Supporting context

- **Problem:** Roadmap features will be implemented over multiple PRs and contributors; without a per-feature envelope, the offline-first/anonymous-first/optional-AI invariants drift.
- **Options considered:**
  1. **One ADR per roadmap feature now** — rejected; premature since none of these features have agreed UI or data shapes.
  2. **No ADR; rely on existing ADRs at PR time** — rejected; the existing ADRs are general, and reviewers benefit from a per-feature checklist.
  3. **One envelope ADR that sets boundaries for all four roadmap features and points each to its future design home** — **chosen**. Locks invariants now; defers detail until each feature is actually being built.
- **Must stay true:** Offline-first / anonymous-first ([ADR-001](ADR-001-product-operating-model.md)); local-first durable data ([ADR-002](ADR-002-local-data-ownership.md)); AI is enhancement only ([ADR-007](ADR-007-ai-provider-contract.md), [ADR-011](ADR-011-self-hosting-provider-model.md)); secrets stay server-side ([ADR-006](ADR-006-serverless-and-secret-boundary.md)); recommendations remain Dexie-only ([ADR-009](ADR-009-recommendations-engine-inputs.md)).

## Decision

For each of the four roadmap features below, the **envelope** in this section is binding before implementation begins. Implementation ADRs or design docs may add detail; they may not relax the invariants stated here without superseding this ADR.

### Cross-feature invariants (apply to all four)

1. **Offline / anonymous baseline**: Each feature must state, at design time, its behavior when (a) the user is offline, (b) the user is anonymous (no Supabase session), (c) AI is disabled or unreachable. "Feature is hidden" is an acceptable answer when consistent with [ADR-001](ADR-001-product-operating-model.md) §capability matrix; "feature shows an error" is not.
2. **Local-first storage**: New persistent data lives in **Dexie** via the patterns in [ADR-002](ADR-002-local-data-ownership.md) and [ADR-008](ADR-008-schema-led-domain-contracts.md). Cloud sync of new entities is opt-in and requires a sync ADR successor before it ships.
3. **AI through the provider contract**: AI-assisted operations call **same-origin** WFD routes; routes call the AI provider via [ADR-007](ADR-007-ai-provider-contract.md) with Zod-validated structured outputs; routes declare which **capability** they require so [ADR-011](ADR-011-self-hosting-provider-model.md) §6 capability flags can drive UI degradation.
4. **No new domain data without a Zod schema**: New tables, columns, or persisted client artifacts get a Zod schema and inferred types under `src/lib/api/<domain>/...` per [ADR-008](ADR-008-schema-led-domain-contracts.md). Schemas use `.strict()`.
5. **Each feature owns its design doc**: A per-feature doc (or ADR successor) lives under `docs/<feature>/...` and is linked from this ADR's notes when written. The README _Roadmap Direction_ bullet remains the one-liner; the deep design lives elsewhere.

### A. Calendar

**Goal:** Show when recipes were made using `checkout_history`, including multiple recipes per day.

| Aspect                     | Envelope decision                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logic location**         | **Client-only.** Reads `db.recipes` via existing Dexie / live-query patterns ([ADR-002](ADR-002-local-data-ownership.md)). No new server route in v1.                                                                        |
| **Data ownership**         | Reuses `SavedRecipe.checkout_history` ([`src/lib/api/recipe/recipe.schemas.ts`](../src/lib/api/recipe/recipe.schemas.ts)). **No** new Dexie table for v1.                                                                    |
| **Recommendation overlap** | Calendar is a **read** surface over `checkout_history`; it is **not** the recommendations engine. It must not import the recommendations module nor influence ranking ([ADR-009](ADR-009-recommendations-engine-inputs.md)). |
| **AI dependency**          | **None.** Calendar is fully usable with AI disabled.                                                                                                                                                                         |
| **Cloud dependency**       | **None.** Calendar is fully usable anonymously and offline. Sync of `checkout_history` is governed by [ADR-005](ADR-005-sync-and-conflict-resolution.md); calendar does not introduce new sync semantics.                    |
| **Required capabilities**  | None.                                                                                                                                                                                                                        |
| **Future sharing**         | Out of scope; requires a successor ADR if calendar becomes a shareable surface.                                                                                                                                              |
| **Deeper design home**     | `docs/calendar/...` (to be created when the feature is scheduled).                                                                                                                                                           |

### B. URL recipe import

**Goal:** Use AI to extract recipe content from a URL and surface a draft the user can save.

| Aspect                    | Envelope decision                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logic location**        | **Server-side fetch + AI extraction.** Browser CORS makes client-side fetch unreliable, and server-only secrets in [ADR-006](ADR-006-serverless-and-secret-boundary.md) require AI calls to stay on the server. New endpoint under `src/routes/api/import/url/+server.ts`.                                                                                |
| **Data ownership**        | Output is a **draft recipe** validated against `RecipeSchema` ([`src/lib/api/recipe/recipe.schemas.ts`](../src/lib/api/recipe/recipe.schemas.ts)); the user explicitly promotes it to a `SavedRecipe`. Drafts may be cached transient-locally similar to suggestions ([ADR-003](ADR-003-ai-suggestion-lifecycle.md)) but are **not** auto-saved to cloud. |
| **AI dependency**         | **Required.** Feature is hidden when `featureFlags.ai === false`.                                                                                                                                                                                                                                                                                         |
| **Cloud dependency**      | **None for the import itself.** Saved recipe sync follows the existing recipe sync path ([ADR-005](ADR-005-sync-and-conflict-resolution.md)).                                                                                                                                                                                                             |
| **Required capabilities** | `aiCapabilities.suggestions` (or an equivalent extraction capability) plus structured-output support per [ADR-007](ADR-007-ai-provider-contract.md). Personal-provider deployments without these capabilities hide the feature.                                                                                                                           |
| **Validation**            | Server validates the URL (allowlist non-`http(s)` schemes; reject obvious traps), fetches with a bounded timeout, then routes the page text through the AI extraction prompt. The AI response is **Zod-validated** before the route returns success ([ADR-007](ADR-007-ai-provider-contract.md), [ADR-008](ADR-008-schema-led-domain-contracts.md)).      |
| **Offline / anonymous**   | **Anonymous-friendly** when AI is available (no WFD account required to import); offline = feature hidden.                                                                                                                                                                                                                                                |
| **Deeper design home**    | [ADR-017](ADR-017-recipe-url-extraction.md) (extraction pipeline); checklist at [`docs/recipe-import-url/README.md`](../docs/recipe-import-url/README.md).                                                                                                                                                                                                |

### C. OCR import

**Goal:** Support photos and scans as sources for recipe capture.

| Aspect                    | Envelope decision                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logic location**        | **Two acceptable paths**, declared at design time: (1) **On-device OCR** (e.g. Tesseract.js or browser ML APIs) — preferred for offline-first / anonymous-first; (2) **Server-side AI vision** — gated through [ADR-007](ADR-007-ai-provider-contract.md) and the `vision` capability in [ADR-011](ADR-011-self-hosting-provider-model.md) §2. Implementations may offer both with a server-side fallback when the device path is unavailable. |
| **Data ownership**        | OCR output is text; the structured recipe shape is derived through the same AI extraction path as URL import (B) when AI is enabled, or left as raw text the user edits manually when only on-device OCR ran. Drafts behave like B (transient-local; user promotes to `SavedRecipe`).                                                                                                                                                          |
| **AI dependency**         | **Optional** for OCR text extraction (on-device path) and **optional** for shaping that text into a recipe. When the user has only the on-device path and no AI, the feature still produces editable text — it just does not auto-shape into a structured recipe.                                                                                                                                                                              |
| **Cloud dependency**      | **None.**                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Required capabilities** | Either runtime device support for the chosen on-device OCR library **or** `aiCapabilities.vision` + `aiCapabilities.suggestions` for the server path. Feature is hidden only when **both** paths are unavailable.                                                                                                                                                                                                                              |
| **Privacy**               | Photos and scans **must not** be cached in Cache Storage ([ADR-010](ADR-010-offline-cache-and-service-worker.md)). When the server path is used, server logs **must not** include image bytes or OCR text beyond what is needed for error diagnosis.                                                                                                                                                                                           |
| **Offline / anonymous**   | **Anonymous-friendly** on both paths. **Offline-friendly** on the on-device path. The server path is hidden when offline.                                                                                                                                                                                                                                                                                                                      |
| **Deeper design home**    | `docs/recipe-import-ocr/...` (to be created).                                                                                                                                                                                                                                                                                                                                                                                                  |

### D. Meal planner

**Goal:** Add planning workflows for future meals, selected recipes, and integrated shopping lists.

| Aspect                     | Envelope decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logic location**         | **Client-first.** Plan creation, edit, and shopping-list derivation run against Dexie. Server work is limited to optional sync at a later date.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Data ownership**         | New domain entities — at minimum a `MealPlan` (header) and `MealPlanItem` (one entry per planned slot, referencing a `SavedRecipe.id`). Optional `ShoppingList` derived from plan items; the canonical shape may be a query over plan items rather than a separate table — the design doc decides. New entities live under `src/lib/api/meal-plan/...` with **`.strict()`** Zod schemas per [ADR-008](ADR-008-schema-led-domain-contracts.md), and Dexie tables get a **migration version bump** in [`src/lib/db.ts`](../src/lib/db.ts) per [ADR-002](ADR-002-local-data-ownership.md). |
| **AI dependency**          | **None for v1.** Plans are user-built. AI-assisted plan suggestions are a follow-up that must reuse [ADR-007](ADR-007-ai-provider-contract.md) (suggestion-style) and declare a capability requirement.                                                                                                                                                                                                                                                                                                                                                                                 |
| **Cloud dependency**       | **None for v1.** Plans are local. **Sync is deferred** to a successor ADR that extends [ADR-005](ADR-005-sync-and-conflict-resolution.md); v1 ships local-only with this constraint visible in the UI ("plans are stored on this device").                                                                                                                                                                                                                                                                                                                                              |
| **Recipe references**      | Plan items reference `SavedRecipe.id` only. They **do not** embed recipe content; rendering joins against the live recipe row. Deleted (soft-deleted) recipes referenced from plans must render gracefully (a placeholder or a one-time migration prompt).                                                                                                                                                                                                                                                                                                                              |
| **Recommendation overlap** | The planner may **read** recommendation buckets to suggest "what to plan," but it **does not** mutate `checkout_history` until the user actually marks a meal as made (preserving the existing semantics in [ADR-009](ADR-009-recommendations-engine-inputs.md)).                                                                                                                                                                                                                                                                                                                       |
| **Required capabilities**  | None for v1; AI plan suggestions in a successor will require `aiCapabilities.suggestions`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Offline / anonymous**    | **Fully offline / anonymous.** No cloud or AI required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Deeper design home**     | `docs/meal-planner/...` (to be created).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### Explicit exclusions (required)

- We are **not** authoring full per-feature schemas in this ADR; ADR-012 names what each feature must satisfy and where the schemas should live.
- We are **not** committing to a specific OCR engine, AI vision provider, or chart/calendar library.
- We are **not** introducing planner cloud sync, calendar sharing, or AI-driven plan generation in v1; each is a follow-up ADR or design doc.
- We are **not** widening the recommendations engine inputs ([ADR-009](ADR-009-recommendations-engine-inputs.md)). Calendar reads `checkout_history`; that is a **display** of the same field recommendations already use, not a new ranking input.
- We are **not** allowing roadmap features to introduce new mandatory-auth flows. A feature that requires AI to function is acceptable; a feature that requires a WFD-managed account to function is not.

## Consequences

### Positive

- Reviewers have a checklist to apply to each roadmap PR ("does this match the envelope row in ADR-012?") rather than rederiving offline/anonymous expectations.
- New domain data (plans, drafts) gets Zod schemas before it is wired to UI, avoiding the legacy `$lib/types.ts` duplication problem flagged in [ADR-008](ADR-008-schema-led-domain-contracts.md).
- The `featureFlags`/capability surface from [ADR-011](ADR-011-self-hosting-provider-model.md) gets concrete consumers (URL import, OCR import) so the matrix stays honest.

### Negative

- Some roadmap features (planner sync, calendar sharing, AI-driven plans) are explicitly deferred; users will see "stored on this device" or feature-hidden states for a longer time.
- Each feature still needs its own design doc; this ADR adds a documentation step contributors must remember to take.

### Risks and mitigations

| Risk                                                                                              | Mitigation                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementations creep past the envelope (e.g. planner ships with a Supabase table without an ADR) | Workflow gate: PRs touching `src/lib/db.ts` or adding `src/routes/api/...` for these features must cite this ADR (or its successor) in review.                                                                               |
| Feature design docs never get written                                                             | Each feature's "Deeper design home" path is named here; opening that doc is part of the feature's first PR.                                                                                                                  |
| Capability flag set drifts                                                                        | [ADR-011](ADR-011-self-hosting-provider-model.md) §6 owns the capability list; URL import and OCR are early consumers and validate the matrix.                                                                               |
| `checkout_history` semantics get redefined for the calendar                                       | Calendar is a read of the existing field; any change to the field's semantics requires updating [ADR-002](ADR-002-local-data-ownership.md) and [ADR-009](ADR-009-recommendations-engine-inputs.md), not a quiet calendar PR. |

## Operational impact

- **Performance / cost:** Calendar and planner are local-only and cheap. URL import and OCR (server path) consume AI tokens — handled by [ADR-007](ADR-007-ai-provider-contract.md) and [ADR-011](ADR-011-self-hosting-provider-model.md) cost notes.
- **Debugging:** Server import routes log a stable feature id (`recipe-import-url`, `recipe-import-ocr`) and the AI provider id from [ADR-011](ADR-011-self-hosting-provider-model.md), without logging URL contents, image bytes, or extracted text beyond error context.
- **Deployment:** Planner Dexie tables ship as a Dexie version bump. URL import and OCR ship as new SvelteKit routes; no infrastructure change required for the WFD-managed AI default.
- **Developer workflow:** First PR for each roadmap feature must (a) link this ADR, (b) create the feature's design doc, and (c) add capability flags to [`src/routes/+layout.server.ts`](../src/routes/+layout.server.ts) when the feature requires a capability the layout does not yet expose.

## Examples (optional)

- A "Calendar" PR adds `src/routes/calendar/+page.svelte` that reads `db.recipes` and groups dates from `checkout_history`. It does **not** touch `src/routes/api/...`, does **not** import from `$lib/api/cloud`, and works offline. Its design doc lives at `docs/calendar/README.md`.
- A "URL import" PR adds `src/routes/api/import/url/+server.ts`. The handler declares `requires: ['ai.suggestions']`, validates the URL, fetches it server-side with a 10s timeout, and runs an extraction prompt that uses the existing `$lib/api/ai` Responses + Zod path. The route returns a draft recipe; the client decides whether to persist it.
- A "Planner" PR bumps Dexie version, adds `meal_plans` and `meal_plan_items` tables typed via new `$lib/api/meal-plan` schemas, and ships **without** any Supabase changes; the design doc explicitly lists "cross-device sync" as a follow-up ADR.

## Compliance

- Aligns with WFD's offline-first / anonymous-first product principles in the [README](../README.md) and [ADR-001](ADR-001-product-operating-model.md). No external regulatory framework applies; image privacy expectations for OCR are spelled out in §C.

## Notes (optional)

- Per-feature design docs are listed as "to be created" intentionally. When a feature begins implementation, the first PR should add the design doc and update this ADR's links accordingly.
- This ADR does **not** sequence the roadmap. Calendar may ship before or after URL import; the envelope is independent of order.

## Enforcement rules

- **Cursor / agent rules:** The backlog **Rule: Offline-first development** in [`docs/adr-and-rules-todo.md`](../docs/adr-and-rules-todo.md) should require new features (including these four) to state offline / anonymous / AI-disabled behavior. The backlog **Rule: Self-hosting compatibility** should pair with this ADR for URL import and OCR.
- **Code / architecture:**
  - Calendar code does not import server modules and does not call `src/routes/api/...`.
  - URL import and OCR routes register a capability requirement and pass Zod validation on AI responses.
  - Planner adds new Zod-schema-led entities under `src/lib/api/meal-plan/...` with `.strict()`, plus a Dexie version bump in [`src/lib/db.ts`](../src/lib/db.ts).
  - None of these features may introduce a mandatory-auth path for their core surface.
- **When to revisit:** First PR for any of the four features; introduction of cross-device planner sync; any decision to give the calendar a sharing surface; any AI-driven plan generation.

## Supersession notes

- **Stable identifier:** ADR-012.
- **Partial obsolescence:** When a feature's design doc or follow-up ADR exists (e.g. "ADR-XYZ: Meal planner sync"), update the matching row in §A–§D to point at it rather than overload this ADR with sync details.

---

## Orchestrated development

Orchestration **not required** for authoring this ADR. Plan–Build–Test–Validate orchestration applies when each individual roadmap feature begins implementation, because each spans Dexie schema, new routes, and (for URL/OCR) the AI provider boundary.

### Relevant ADRs for implementation

- [ADR-001](ADR-001-product-operating-model.md) — capability matrix; offline/anonymous baseline.
- [ADR-002](ADR-002-local-data-ownership.md) — Dexie home for new persistent data.
- [ADR-003](ADR-003-ai-suggestion-lifecycle.md) — transient-local AI artifact lifecycle (URL import drafts, OCR drafts).
- [ADR-005](ADR-005-sync-and-conflict-resolution.md) — sync semantics any planner sync follow-up must satisfy.
- [ADR-006](ADR-006-serverless-and-secret-boundary.md) — server-only secrets; same-origin client/server boundary for URL fetch and AI calls.
- [ADR-007](ADR-007-ai-provider-contract.md) — AI request/response and validation contract.
- [ADR-008](ADR-008-schema-led-domain-contracts.md) — Zod-led schemas for new entities.
- [ADR-009](ADR-009-recommendations-engine-inputs.md) — recommendations vs calendar vs planner separation.
- [ADR-010](ADR-010-offline-cache-and-service-worker.md) — what may and may not enter Cache Storage (image bytes are excluded).
- [ADR-011](ADR-011-self-hosting-provider-model.md) — capability matrix for AI-dependent features under personal providers.

### Planning artifact

- Omit until a specific feature's plan exists.

### Builder scope boundary

- Per feature: a single roadmap feature is one builder scope. Calendar is the smallest and likely first; planner is the largest and may itself span multiple builder phases (`MealPlan` table, `MealPlanItem` table, shopping-list derivation, UI).

### Validator expectations

- Verify each feature PR matches the matrix row above; verify no roadmap feature introduces mandatory auth for its core surface; verify capability flags exist before AI-dependent UI ships.

### Test role and evidence

- Calendar: client component tests for date grouping with empty / single / multi-day `checkout_history`.
- URL import: route handler tests for URL validation, fetch timeout, AI failure, and successful Zod validation.
- OCR import: split tests by path (on-device vs server); verify image bytes are not cached in Cache Storage.
- Planner: Dexie migration test (existing recipes survive the version bump); component tests for plan creation and shopping-list derivation; verify deleted-recipe references render gracefully.

### Alignment gaps (current implementation vs this ADR)

The four roadmap features are **pre-implementation**, so most rows in §A–§D have nothing to compare against. The following observations are recorded; any that become real gaps once implementation starts will be tracked in [`docs/readme-adr-alignment-gaps.md`](../docs/readme-adr-alignment-gaps.md) under their own GAP IDs.

| Topic                        | Status                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Calendar route**           | No route exists today; `checkout_history` already lives on `SavedRecipe` and is mutated correctly from existing recipe routes. No gap — pre-implementation.                                                                                                                                                                         |
| **URL recipe import**        | No route or design doc exists today. No gap — pre-implementation.                                                                                                                                                                                                                                                                   |
| **OCR import**               | No route or design doc exists today. No gap — pre-implementation.                                                                                                                                                                                                                                                                   |
| **Meal planner**             | No domain module, Dexie table, or route exists today. No gap — pre-implementation.                                                                                                                                                                                                                                                  |
| **Capability flags surface** | `featureFlags.openai` is a single boolean ([`src/routes/+layout.server.ts`](../src/routes/+layout.server.ts)); URL import and OCR will need the richer `aiCapabilities` set defined by [ADR-011](ADR-011-self-hosting-provider-model.md) §6. Tracked under **GAP-010** alongside [ADR-011](ADR-011-self-hosting-provider-model.md). |

### Merge / workflow gates

- [x] ADR created for feature roadmap boundaries backlog item.
- [x] Pre-implementation status documented; no current code-vs-ADR gaps for these features beyond the capability-flag surface tracked under GAP-010.
- [ ] Per-feature design docs (`docs/calendar/...`, `docs/recipe-import-url/...`, `docs/recipe-import-ocr/...`, `docs/meal-planner/...`) created when each feature is scheduled.
