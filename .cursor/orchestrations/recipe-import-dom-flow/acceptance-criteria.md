# Acceptance Criteria — recipe-import-dom-flow

Each criterion is independently verifiable. Test intent: **auto** = Vitest spec expected; **manual** = named human step; **n/a** = verified by inspection or out of scope for automation.

## Functional

- [ ] AC-01: When online with `canUseAI` true, submitting a valid public recipe URL in the New Recipe import dialog calls `POST /api/import/url` with body `{ url }` only, receives a validated `Recipe`, persists via `persistRecipe`, shows success Toast, closes the dialog, and navigates to the saved recipe. (**auto** INTG or **manual** smoke)
- [ ] AC-02: On import API failure (invalid URL, fetch failed, no recipe signal, AI disabled, parse error), the dialog shows a Toast with the server `error` string (or a safe fallback) and sets `dialogStatus` to `'error'` without navigating away. (**auto** route test + **manual** dialog check)
- [ ] AC-03: Server preparation produces `PreparedImportContent` with JSON-LD in `primaryBlock` when `<script type="application/ld+json">` Recipe data exists in the fetched HTML. (**auto** UNIT — prepare fixtures)
- [ ] AC-04: Server preparation sets `sanitizedBodyContent` from DOMPurify-sanitized document `body.innerHTML` (scripts/event handlers removed; article markup may remain). (**auto** UNIT — sanitize + prepare fixtures)
- [ ] AC-05: When fetched HTML has no JSON-LD but contains structured ingredient/instruction content in the body, preparation succeeds using `sanitizedBodyContent` as supplemental input (signal detected via body text heuristics). (**auto** UNIT — HTML recipe fixture)
- [ ] AC-06: When fetched HTML is a CSR shell with no JSON-LD and insufficient body text, preparation throws `RecipeImportError` with code `RECIPE_IMPORT_NO_RECIPE` before any OpenAI call; route returns 422 with user-visible error. (**auto** UNIT + INTG)
- [ ] AC-07: On cloud sync failure during `persistRecipe` after successful import, recipe is saved locally, user sees sync error Toast, and navigation proceeds (existing behavior preserved). (**manual** or **auto** if harness exists — document in test-report if manual-only)

## Architectural / ADR

- [ ] AC-08: Pipeline order is validate URL → server fetch → prepare (JSON-LD + DOMPurify body) → `importRecipeFromURL` → Zod validate → JSON response; no step calls OpenAI with URL-only input. (**auto** INTG + code inspection)
- [ ] AC-09: No client-side fetch of arbitrary recipe URLs and no DOMPurify usage in client bundles for import (`fetchDomBodyContent.ts` removed; `+page.svelte` posts URL only). (**auto** grep/UNIT boundary + Validator **AI-01**)
- [ ] AC-10: `importRecipeFromURL` model input includes delimited `primaryBlock` and `sanitizedBodyContent` sections plus `Source URL` for attribution. (**auto** UNIT with mocked OpenAI)
- [ ] AC-11: User dietary preferences are **not** injected into URL import extraction instructions. (**auto** UNIT assert instructions string)
- [ ] AC-12: `ImportUrlPostBodySchema` remains `{ url: string }`; no new client-supplied HTML field. (**auto** schema test or inspection)

## Offline, connectivity, and capability

- [ ] AC-13: Import from URL control is hidden or disabled when `canUseAI` is false; attempting import while unavailable shows Toast explaining AI import is unavailable (not a generic offline-only message when the blocker is permission/disabled). (**manual** OFFL or **auto** COMP if dialog tested)
- [ ] AC-14: Core New Recipe manual save flow (without import) remains usable offline without auth/AI (ADR-001); this task does not add network hard prerequisites to local save. (**manual** OFFL smoke)
- [ ] AC-15: Fetched HTML is not stored in Cache Storage or service worker caches (no new caching of import bodies). (**inspection** — no SW changes expected)

## Accessibility (minimal UI touch)

- [ ] AC-16: Import dialog loading state (`dialogStatus === 'importing'`) remains perceivable (existing spinner/disabled submit); no regression to dialog focus trap from `Dialog.svelte`. (**manual** quick check — n/a if no markup change)

## Test evidence

- [ ] AC-17: `recipe-import.sanitize.test.ts` covers script stripping, body extraction, and empty/malformed HTML. (**auto** UNIT — required)
- [ ] AC-18: Updated `recipe-import.prepare.test.ts` covers JSON-LD, HTML-only, and CSR failure fixtures with `sanitizedBodyContent`. (**auto** UNIT — required)
- [ ] AC-19: Route or AI service test proves sanitized body reaches provider input (mocked). (**auto** INTG/UNIT — required)
- [ ] AC-20: `pnpm run test`, `pnpm run check`, and `pnpm run lint` pass for touched paths; gaps documented in `test-report.md` if any AC is manual-only. (**auto** — Tester/Validator)

## Out of scope (non-goals)

- [ ] AC-21: **N/A — verification only:** Headless browser rendering, client-side URL fetch, paywall bypass, OCR reuse, and `RecipeImportSchema` split are not implemented in this task.
- [ ] AC-22: **N/A — verification only:** ADR-017 is not amended; server-fetch remains authoritative.
