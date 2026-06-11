# Test report — recipe-import-dom-flow

Layer-level plan vs actual: [`test-matrix.md`](./test-matrix.md). Layer definitions: [`docs/test-matrix-template.md`](../../../docs/test-matrix-template.md).

## Coverage map

| AC ID | Test file | Test name(s) | Notes |
| ----- | --------- | ------------ | ----- |
| AC-01 | `src/routes/api/import/url/server.test.ts` | `returns validated recipe on success` | API success path only; client `persistRecipe`, Toast, dialog close, and navigation — see Uncovered |
| AC-02 | `src/routes/api/import/url/server.test.ts` | `returns 400 when body is invalid`, `returns 403 when AI permission is missing`, `returns preparation failure with stable error shape` | Server error JSON; dialog Toast + `dialogStatus` — manual |
| AC-03 | `src/lib/api/recipe-import/recipe-import.prepare.test.ts` | `prepares json_ld content from JSON-LD fixture` | |
| AC-04 | `src/lib/api/recipe-import/recipe-import.sanitize.test.ts` | `strips scripts and event handlers from body innerHTML`, `preserves article markup in sanitized body HTML` | Also asserted via `prepareImportContent` JSON-LD fixture |
| AC-05 | `src/lib/api/recipe-import/recipe-import.prepare.test.ts` | `prepares html_text when article body has recipe cues` | |
| AC-06 | `src/lib/api/recipe-import/recipe-import.prepare.test.ts` | `throws when CSR shell has no recipe signal` | |
| AC-06 | `src/routes/api/import/url/server.test.ts` | `returns preparation failure with stable error shape` | Asserts 422 + `importRecipeFromURL` not called |
| AC-07 | — | — | Manual — see Uncovered |
| AC-08 | `src/routes/api/import/url/server.test.ts` | `runs server fetch/prepare before AI extraction`, `returns preparation failure with stable error shape` | Mock call order; no OpenAI on prep failure |
| AC-09 | `src/routes/recipes/new/import-url-boundary.test.ts` | `posts URL only to the import API without client fetch or DOMPurify` | Source inspection; `fetchDomBodyContent.ts` deleted |
| AC-10 | `src/lib/api/ai/ai.server.service.test.ts` | `sends primary block and sanitized body in model input, not URL-only` | |
| AC-11 | `src/lib/api/ai/ai.server.service.test.ts` | `does not inject user dietary preferences into extraction instructions` | |
| AC-12 | `src/routes/api/import/url/server.test.ts` | `returns 400 when body is invalid`, `rejects strict body with extra client-supplied HTML fields` | `ImportUrlPostBodySchema` strict `{ url }` |
| AC-13 | — | — | Manual OFFL — see Uncovered |
| AC-14 | — | — | Manual OFFL — see Uncovered |
| AC-15 | — | — | Inspection — no SW/cache changes in task scope |
| AC-16 | — | — | Manual — no dialog markup changes per build-log |
| AC-17 | `src/lib/api/recipe-import/recipe-import.sanitize.test.ts` | all four `sanitizeRecipePageBody` tests | Script stripping, article markup, empty/malformed HTML |
| AC-18 | `src/lib/api/recipe-import/recipe-import.prepare.test.ts` | `prepares json_ld content…`, `prepares html_text…`, `throws when CSR shell…` | |
| AC-19 | `src/lib/api/ai/ai.server.service.test.ts` | `sends primary block and sanitized body in model input, not URL-only` | |
| AC-19 | `src/routes/api/import/url/server.test.ts` | `returns validated recipe on success` | Route passes `prepared` with `sanitizedBodyContent` to AI mock |
| AC-20 | — | — | `pnpm run test` green (91/91); touched-path eslint green; full-repo lint/check pre-existing failures per build-log |
| AC-21 | — | — | N/A — out of scope verification |
| AC-22 | — | — | N/A — ADR-017 unchanged |

## Uncovered criteria

| AC ID | Reason | Follow-up |
| ----- | ------ | --------- |
| AC-01 | End-to-end client flow (dialog submit → `persistRecipe` → Toast success → navigate) requires browser harness or manual smoke | Human: import a public JSON-LD recipe URL on `/recipes/new` while online with AI enabled |
| AC-02 | Dialog `toast.error` and `dialogStatus = 'error'` are Svelte UI side effects not exercised by route tests | Human: trigger 422/403 from dialog; confirm Toast + dialog stays open |
| AC-07 | `persistRecipe` cloud-sync failure path needs Dexie + sync mock or manual repro | Human: save imported recipe with cloud sync failing; confirm local save + sync error Toast + navigation |
| AC-13 | `canUseAI` gate hides Import button and shows capability Toast — UI/capability matrix | Human: disable AI permission; confirm button hidden and Toast on forced path |
| AC-14 | Offline manual save on New Recipe without import | Human: offline smoke on `/recipes/new` manual save (ADR-001 regression) |
| AC-15 | No automated test — inspection only | Validator: confirm no service-worker or Cache Storage changes |
| AC-16 | No dialog markup changes in this task | Skipped — quick manual if UI touched later |

## Test stability notes

_None identified._ Server tests use Vitest mocks (no network, no OpenAI). Client boundary test reads static source files (deterministic). Client Vitest project requires Playwright chromium in fresh CI/dev environments (`pnpm exec playwright install chromium`).

## Command evidence

| Command | Result | Notable output |
| ------- | ------ | -------------- |
| `pnpm run test` | pass | 14 files, 91 tests passed |
| `pnpm exec eslint` (task test files) | pass | No issues on 5 test files |

Full-repo `pnpm run lint` and `pnpm run check` were not re-run this session; build-log documents pre-existing failures outside task scope. Touched production paths were verified clean by Builder.

## Commands to run

```bash
# Full suite
pnpm run test

# Task-focused server unit/integration
pnpm run test:unit -- --run --project server src/lib/api/recipe-import/
pnpm run test:unit -- --run --project server src/lib/api/ai/ai.server.service.test.ts
pnpm run test:unit -- --run --project server src/routes/api/import/url/
pnpm run test:unit -- --run --project server src/routes/recipes/new/import-url-boundary.test.ts

# Touched-path lint (production + tests)
pnpm exec eslint \
  src/lib/api/recipe-import/recipe-import.sanitize.ts \
  src/lib/api/recipe-import/recipe-import.prepare.ts \
  src/lib/api/ai/ai.server.service.ts \
  src/routes/api/import/url/+server.ts \
  src/routes/recipes/new/+page.svelte

# Types (full repo may have pre-existing errors)
pnpm run check
```

## Blockers

N/A.
