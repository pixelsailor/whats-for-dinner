# Build log — recipe-import-dom-flow

Builder-owned handoff for Tester / Validator.

## Files created

| Path | Purpose | Key decisions |
| ---- | ------- | ------------- |
| `src/lib/api/recipe-import/recipe-import.sanitize.ts` | Server-only DOMPurify sanitize helper | `isomorphic-dompurify` with `RETURN_DOM: true`; returned node is `HTMLBodyElement`, read `innerHTML` / `textContent` directly (not `document.body`) |
| `src/lib/api/recipe-import/recipe-import.sanitize.test.ts` | Unit tests for sanitize helper | Script/event stripping, article markup, empty/malformed HTML |
| `src/lib/api/ai/ai.server.service.test.ts` | AI input-shape tests | Mock OpenAI via `vi.hoisted` + class constructor; asserts primary + sanitized body sections, no preferences |
| `src/routes/api/import/url/server.test.ts` | Route integration-style tests | Mocked `fetchAndPrepareRecipeImport` + `importRecipeFromURL`; 400/403/200/422 shapes |

## Files modified

| Path | What changed | Why |
| ---- | ------------ | --- |
| `package.json` | Added `isomorphic-dompurify@3.16.0` | Server DOMPurify entrypoint per plan |
| `pnpm-lock.yaml` | Lockfile update | Transitive `jsdom` via isomorphic-dompurify |
| `src/lib/api/recipe-import/recipe-import.types.ts` | `supplementalText` → `sanitizedBodyContent` | ADR-017 supplemental input is sanitized HTML body |
| `src/lib/api/recipe-import/recipe-import.prepare.ts` | Calls `sanitizeRecipePageBody`; `hasRecipeSignal` uses `bodyText`; renamed cap to `SANITIZED_BODY_MAX_CHARS` | JSON-LD primary + DOMPurify supplemental; dropped `htmlToText` as supplemental source |
| `src/lib/api/recipe-import/recipe-import.prepare.test.ts` | Asserts `sanitizedBodyContent` (HTML markup) | AC-03–AC-05 fixtures |
| `src/lib/api/ai/ai.server.service.ts` | Prompt uses `sanitizedBodyContent`; section label `SUPPLEMENTAL BODY (sanitized HTML)` | AC-10 AI input contract |
| `src/routes/api/import/url/+server.ts` | Log field `sanitizedBodyChars` | Observability for sanitized body size |
| `docs/recipe-import-url/README.md` | DOMPurify supplemental path + dependency note | Phase 2 docs |

## Files deleted

| Path | Why |
| ---- | --- |
| `src/routes/recipes/new/fetchDomBodyContent.ts` | Client-side fetch prototype removed (AC-09); server owns fetch + sanitize |

## Files verified unchanged (plan)

| Path | Note |
| ---- | ---- |
| `src/routes/recipes/new/+page.svelte` | Already posts `{ url }` only; no client fetch/DOMPurify imports |
| `src/lib/api/recipe-import/recipe-import.service.ts` | Orchestration unchanged; JSDoc already accurate |

## Command evidence

| Command | Result | Summary |
| ------- | ------ | ------- |
| `pnpm add isomorphic-dompurify` | exit 0 | Added `isomorphic-dompurify@3.16.0` (+ transitive jsdom) |
| `pnpm run format` | exit 0 | Prettier applied |
| `pnpm run lint` | exit 1 | **Pre-existing** repo-wide errors (54 problems); touched files clean via targeted `pnpm exec eslint` on allowlist paths → exit 0 |
| `pnpm run check` | exit 1 | **Pre-existing** svelte-check errors (13 in unrelated files); no errors in touched recipe-import / AI / route modules |
| `pnpm exec eslint` (touched paths only) | exit 0 | No lint issues in modified production/test files |
| `pnpm run test:unit -- --run --project server src/lib/api/recipe-import/ src/lib/api/ai/ai.server.service.test.ts src/routes/api/import/url/server.test.ts` | exit 0 (after Playwright install) | 85 server tests passed |
| `pnpm run test` | exit 0 | 13 files, 88 tests passed (after `pnpm exec playwright install chromium` for client project) |

## Deviations from plan

1. **Route test filename:** Plan listed `+server.test.ts`; implemented as `server.test.ts` in the same directory. SvelteKit reserves `+`-prefixed filenames and `svelte-kit sync` fails with `+server.test.ts`.
2. **DOMPurify RETURN_DOM handling:** `DOMPurify.sanitize(html, { RETURN_DOM: true })` returns `HTMLBodyElement`, not `Document`. Implementation reads `innerHTML` from the returned element directly (documented here; contract unchanged).

## Scope pressure

_None._

## Unresolved open questions

| Plan question | Outcome |
| ------------- | ------- |
| `isomorphic-dompurify` vs manual `dompurify` + `jsdom` | **Resolved:** used `isomorphic-dompurify` as frozen; works on server |
| Rename `SUPPLEMENTAL_TEXT_MAX_CHARS` | **Resolved:** renamed to `SANITIZED_BODY_MAX_CHARS` in prepare module |
| Manual golden URL list | **Deferred:** human post-merge smoke per plan |

## Known gaps

- Full-repo `pnpm run lint` and `pnpm run check` fail on pre-existing issues outside this task scope (MG-05: touched paths verified clean / tests green).
- Client Vitest project requires Playwright chromium installed (`pnpm exec playwright install chromium`) in fresh environments.
