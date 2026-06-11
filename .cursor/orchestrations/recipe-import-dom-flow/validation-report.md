# Validation report — recipe-import-dom-flow

## Verdict
PASS_WITH_NOTES

## AC audit

| AC ID | Status | Evidence |
| ----- | ------ | -------- |
| AC-01 | ✅ met | `src/routes/api/import/url/server.test.ts` (`returns validated recipe on success`); client behavior in `src/routes/recipes/new/+page.svelte` (`importRecipeFromURL` calls `persistRecipe`, closes dialog, shows `toast.success`, and `goto(/recipes/:id)`) |
| AC-02 | ✅ met | Server error mapping in `src/routes/api/import/url/+server.ts` (catches `RecipeImportError`, `AiParseError`, and `OPENAI_DISABLED_ERROR`); client behavior in `src/routes/recipes/new/+page.svelte` (`dialogStatus='error'` + `toast.error(result.error ?? ...)`) + `server.test.ts` coverage for invalid body/403/422 |
| AC-03 | ✅ met | `src/lib/api/recipe-import/recipe-import.prepare.test.ts` (`prepares json_ld content from JSON-LD fixture`) + `prepareImportContent` JSON-LD extraction/serialization |
| AC-04 | ✅ met | `src/lib/api/recipe-import/recipe-import.sanitize.test.ts` (script/event handler stripping + markup preservation) + `prepareImportContent` assigns `sanitizedBodyContent` from `sanitizeRecipePageBody(...).sanitizedBodyHtml` |
| AC-05 | ✅ met | `src/lib/api/recipe-import/recipe-import.prepare.test.ts` (`prepares html_text when article body has recipe cues`) and `prepareImportContent` `hasRecipeSignal(primaryBlock, bodyText)` using sanitized `textContent` |
| AC-06 | ✅ met | Unit throw: `recipe-import.prepare.test.ts` (`throws when CSR shell has no recipe signal`, code `RECIPE_IMPORT_NO_RECIPE`); route behavior: `server.test.ts` (`returns preparation failure with stable error shape`, 422 + `importRecipeFromURL` not called) |
| AC-07 | ✅ met | `src/routes/recipes/new/+page.svelte` (`persistRecipe` catch shows sync error toast but continues locally and returns candidate; `importRecipeFromURL` awaits `persistRecipe` then navigates) |
| AC-08 | ✅ met | Pipeline order in `src/routes/api/import/url/+server.ts` (normalize → `fetchAndPrepareRecipeImport` → `importRecipeFromURL` → `parseRecipeDetail`); enforced by `server.test.ts` (`runs server fetch/prepare before AI extraction`) |
| AC-09 | ✅ met | Client boundary test `src/routes/recipes/new/import-url-boundary.test.ts` asserts `+page.svelte` contains `fetch('/api/import/url'` and does not include `dompurify|isomorphic-dompurify`; server sanitize isolated to `recipe-import.sanitize.ts` |
| AC-10 | ✅ met | `src/lib/api/ai/ai.server.service.test.ts` (`sends primary block and sanitized body in model input, not URL-only`) + prompt input labels in `importRecipeFromURL` |
| AC-11 | ✅ met | `src/lib/api/ai/ai.server.service.test.ts` (`does not inject user dietary preferences...`) + `importRecipeFromURL` instructions do not call preference injection |
| AC-12 | ✅ met | Schema contract: `src/lib/api/ai/ai.schemas.ts` (`ImportUrlPostBodySchema` strict `{ url }`); route enforcement: `server.test.ts` (`rejects strict body with extra client-supplied HTML fields`) |
| AC-13 | ✅ met | `src/routes/recipes/new/+page.svelte` shows Import button only when `canUseAI`; `importRecipeFromURL` blocks when `!canUseAI` with `toast.error('AI recipe import is unavailable right now')` |
| AC-14 | ✅ met | `src/routes/recipes/new/+page.svelte` manual save path (`saveRecipe` + `persistRecipe`) does not depend on AI/import; writes locally via Dexie (`db.recipes.add`) even when cloud fails |
| AC-15 | ✅ met | No Cache Storage/service worker changes in scope per `build-log.md`; import/fetch pipeline is request-local (does not store fetched HTML) |
| AC-16 | ✅ met | Dialog UX in `src/routes/recipes/new/+page.svelte`: submit button disabled on `dialogStatus === 'importing'` and shows `ProgressSpinner` |
| AC-17 | ✅ met | `src/lib/api/recipe-import/recipe-import.sanitize.test.ts` covers script stripping, body extraction, and empty/malformed HTML |
| AC-18 | ✅ met | `src/lib/api/recipe-import/recipe-import.prepare.test.ts` covers JSON-LD extraction, HTML-only cues, and CSR failure fixture |
| AC-19 | ✅ met | AI input: `src/lib/api/ai/ai.server.service.test.ts`; route propagation: `src/routes/api/import/url/server.test.ts` ensures prepared content is passed to `importRecipeFromURL` |
| AC-20 | ✅ met | Command/test evidence in `build-log.md` + `test-report.md` (`pnpm run test` pass) and touched-path lint green |
| AC-21 | N/A | Out of scope per `acceptance-criteria.md` |
| AC-22 | N/A | ADR-017 not amended per `acceptance-criteria.md` |

## ADR compliance

| ADR | Status | Evidence |
| --- | ------ | -------- |
| ADR-017 | ✅ met | Server fetch + prepare pipeline: `src/lib/api/recipe-import/recipe-import.fetch.ts`, `recipe-import.url.ts`, `recipe-import.prepare.ts`; AI extraction uses `importRecipeFromURL` prompt input with prepared `primaryBlock` and sanitized body (and no URL-only call) in `src/lib/api/ai/ai.server.service.ts` |
| ADR-007 | ✅ met | Provider contract uses server-only OpenAI Responses + structured output; output validated via `parseRecipeDetail`/`parseStructuredOutput` with `safeParse` in `src/lib/api/ai/ai.model.ts` |
| ADR-006 | ✅ met | Private key usage stays server-side in `src/lib/api/ai/ai.server.service.ts`; client boundary confirms no OpenAI/DOMPurify in client modules (`import-url-boundary.test.ts` + `rg` evidence) |
| ADR-002 | ✅ met | Persisting imported recipes uses Dexie as system of record in `src/routes/recipes/new/+page.svelte` (`persistRecipe` writes `db.recipes.add`); cloud sync is enhancement-only with graceful fallback |
| ADR-001 | ✅ met | Import enhancement is gated by `canUseAI` (optional AI); core recipe save remains local-first and does not require import/network in `src/routes/recipes/new/+page.svelte` |

## Checklist audit

| ID | Status | Evidence / N/A reason |
| -- | ------ | --------------------- |
| MG-01 | ✅ met | Alignment gap `GAP-025` marked `Fixed` and `ADR-017` accepted; implemented pipeline matches ADR intent (see `docs/readme-adr-alignment-gaps.md` and ADR-017) |
| MG-02 | ✅ met | Durable architecture relies on existing `ADR-017` (no amendment claimed; plan scoped server-fetch pipeline to that ADR) |
| MG-03 | ✅ met | This `validation-report.md` is being written for the orchestrated run |
| MG-04 | ✅ met | `test-report.md` exists with AC coverage map + test evidence |
| MG-05 | ✅ met | `build-log.md` documents touched-path lint/check verification; full repo `pnpm run lint`/`pnpm run check` had documented pre-existing failures outside scope |
| OFF-01 | ✅ met | `+page.svelte` local save path uses Dexie and does not depend on AI/import |
| NET-01 | ✅ met | Import gating and error toasts focus on AI availability vs server-side error (`canUseAI` gate + `toast.error(result.error ?? ...)`) |
| NET-02 | ✅ met | No `navigator.onLine` conflation for truth; UI uses capability gating derived from `networkStore` and permission flags |
| NET-03 | ✅ met | `+page.svelte` uses reactive `networkStore` + derived `canUseAI`, so UI updates when connectivity/capability changes |
| NET-04 | ✅ met | Import unavailable states degrade with honest toasts; no global blocker for local save |
| AI-01 | ✅ met | Server-only DOMPurify/OpenAI code stays out of client graphs; client boundary test + `rg` check show `isomorphic-dompurify` only in server sanitize |
| AI-02 | ✅ met | AI extraction occurs in server route `/api/import/url` + `src/lib/api/ai/ai.server.service.ts` |
| AI-03 | ✅ met | When `!canUseAI`, client blocks import and remains usable for manual recipe creation |
| AI-04 | N/A | Import is extraction-only (ADR-017) and intentionally does not inject user preferences into extraction instructions |
| AI-05 | ✅ met | Route boundary validates AI output via `parseRecipeDetail` → `parseStructuredOutput` → Zod `safeParse` |
| SCH-01 | ✅ met | Route/input schemas use Zod: `ImportUrlPostBodySchema.safeParse(...)` and AI output validated against `RecipeSchema` |
| SCH-02 | ⚠️ partial | `ImportUrlPostBodySchema` is `.strict()`, but `RecipeSchema` strictness is not re-confirmed here (depends on existing schema definition) |
| SCH-03 | ✅ met | Domain types are Zod/inferred-backed via existing `RecipeSchema` usage in AI parsing and route validation |
| SCH-04 | ✅ met | Boundaries validate with `safeParse` (`ImportUrlPostBodySchema`, `parseStructuredOutput`) |
| A11Y-05 | ⚠️ partial | Evidence for `svelte-autofixer` on `src/routes/recipes/new/+page.svelte` not present in artifacts; markup uses standard interactive elements |
| TST-01 | ✅ met | Every AC-01..AC-22 appears in `test-report.md` coverage map |
| TST-02 | ✅ met | New unit tests added for sanitize/prepare + AI input shape + route error handling |
| TST-03 | ⚠️ partial | `test-matrix.md` planned OFFL manual steps for AC-07/AC-13/AC-14 are listed as uncovered; no offline/manual smoke evidence captured in `test-report.md` |
| TST-04 | ✅ met | `test-report.md` command evidence shows `pnpm run test` pass and eslint on touched test files |
| TST-05 | ✅ met | `test-matrix.md` gaps vs plan are explicitly documented in `test-report.md` |
| SW-01 / SW-02 / SW-03 | N/A | No service worker / Cache Storage changes in this task scope (per `build-log.md`) |

## MG gate status

MG-01: ✅, MG-02: ✅, MG-03: ✅, MG-04: ✅, MG-05: ✅

## Test and command evidence

- `build-log.md`: `pnpm run test:unit ...` (server unit/integration) and `pnpm run test` pass; touched-path lint verification described; full `pnpm run lint` / `pnpm run check` failures documented as pre-existing outside scope.
- `test-report.md`: coverage map and `pnpm run test` pass (`91/91`), with uncovered manual-only ACs (OFFL/COMP).

## Regressions

None identified from code inspection and test coverage for the URL import pipeline.

## Required remediations

N/A

## Recommended remediations

1. Run/record OFFL manual smokes for `AC-07`, `AC-13`, and `AC-14` (offline/capability gating + cloud-sync failure behavior) and update `test-report.md` with the observed outcomes.
2. Add a `@fileoverview`/`@module` JSDoc header to the modified route module `src/routes/api/import/url/+server.ts` to fully match documentation conventions.
3. If not already done by Builder, run `svelte-autofixer` for `src/routes/recipes/new/+page.svelte` and capture any resulting suggestions in follow-up artifacts.

