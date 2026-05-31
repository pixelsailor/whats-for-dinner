# Build log — recipe-url-extraction

## Summary

Implemented ADR-017 fetch/prepare pipeline and wired `/api/import/url` + `importRecipeFromURL(url, prepared)`.

## Files added

- `src/lib/api/recipe-import/recipe-import.types.ts`
- `src/lib/api/recipe-import/recipe-import.errors.ts`
- `src/lib/api/recipe-import/recipe-import.url.ts`
- `src/lib/api/recipe-import/recipe-import.fetch.ts`
- `src/lib/api/recipe-import/recipe-import.prepare.ts`
- `src/lib/api/recipe-import/recipe-import.service.ts`
- `src/lib/api/recipe-import/recipe-import.url.test.ts`
- `src/lib/api/recipe-import/recipe-import.prepare.test.ts`

## Files changed

- `src/routes/api/import/url/+server.ts` — orchestrate fetch → prepare → AI; map `RecipeImportError`
- `src/lib/api/ai/ai.server.service.ts` — `importRecipeFromURL(url, prepared)` with page content in input
- `docs/readme-adr-alignment-gaps.md` — GAP-025 Fixed
- `adrs/ADR-017-recipe-url-extraction.md` — GAP-025 gate checked
- `docs/recipe-import-url/README.md` — checklist complete

## Deviations

None.

## Commands

- `pnpm exec vitest run --project server src/lib/api/recipe-import/` — 12 passed (post-fix).

## Post-approval fix (2026-05-31)

- `hasRecipeSignal`: accept shorter HTML when both ingredient and instruction section cues are present (fixture was ~220 chars, below old 280 minimum).

## Human verification

- Blocked URL: graceful error.
- Live recipe URL: import saved successfully.
