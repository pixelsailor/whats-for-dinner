# Test matrix — recipe-import-dom-flow

Layer definitions and runners: [`docs/test-matrix-template.md`](../../../docs/test-matrix-template.md).

Per-run AC evidence: [`test-report.md`](./test-report.md) (Tester).

## Planned coverage (Planner)

| Layer ID | AC IDs                                   | Approach / notes                                                                                                                                         |
| -------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UNIT     | AC-03, AC-04, AC-05, AC-06, AC-17, AC-18 | `recipe-import.sanitize.test.ts` (new); update `recipe-import.prepare.test.ts`; fixtures for JSON-LD, HTML article, CSR shell                            |
| UNIT     | AC-10, AC-11                             | `ai.server.service.test.ts` (new): mock `getOpenAI` / `responses.create`; assert `input` and `instructions` strings                                      |
| INTG     | AC-01, AC-02, AC-06, AC-08, AC-12        | `src/routes/api/import/url/+server.test.ts` (new): mock `fetchAndPrepareRecipeImport` + `importRecipeFromURL`; assert status codes and JSON error shapes |
| OFFL     | AC-13, AC-14                             | Manual: disable AI / go offline on `/recipes/new`; confirm import gated and manual save works locally                                                    |
| COMP     | AC-02, AC-13, AC-16                      | Optional: only if `+page.svelte` dialog markup changes — Vitest browser harness for Toast + disabled state; otherwise manual in test-report              |

### AC → layers (summary)

| AC ID | Layers          | Notes                                                             |
| ----- | --------------- | ----------------------------------------------------------------- |
| AC-01 | INTG, OFFL      | Automated route success path; manual end-to-end optional          |
| AC-02 | INTG, COMP/OFFL | Route error JSON; manual Toast in dialog                          |
| AC-03 | UNIT            | JSON-LD fixture                                                   |
| AC-04 | UNIT            | Sanitize strips script; body innerHTML preserved                  |
| AC-05 | UNIT            | HTML-only recipe fixture                                          |
| AC-06 | UNIT, INTG      | CSR shell → 422, no AI call (mock assert)                         |
| AC-07 | OFFL            | Manual cloud sync failure — or skip with documented untested risk |
| AC-08 | INTG, UNIT      | Pipeline order via mocks                                          |
| AC-09 | UNIT/OFFL       | No client sanitize module; grep + bundle boundary                 |
| AC-10 | UNIT            | Mock OpenAI input shape                                           |
| AC-11 | UNIT            | Instructions string assertion                                     |
| AC-12 | INTG            | Body schema `{ url }` only                                        |
| AC-13 | OFFL            | Manual capability gating                                          |
| AC-14 | OFFL            | Manual offline save                                               |
| AC-15 | n/a             | Inspection — no SW changes                                        |
| AC-16 | OFFL/COMP       | Manual unless dialog UI changed                                   |
| AC-17 | UNIT            | Sanitize spec required                                            |
| AC-18 | UNIT            | Prepare spec required                                             |
| AC-19 | UNIT, INTG      | AI mock + route mock                                              |
| AC-20 | UNIT, INTG      | Full `pnpm run test` + lint/check                                 |
| AC-21 | n/a             | Out of scope checklist                                            |
| AC-22 | n/a             | ADR compliance inspection                                         |

## Actual coverage (Test)

| Layer ID | AC IDs | Test file(s) / evidence | Status |
| -------- | ------ | ----------------------- | ------ |
| UNIT | AC-03, AC-04, AC-05, AC-06, AC-17, AC-18 | `recipe-import.sanitize.test.ts`, `recipe-import.prepare.test.ts` | done |
| UNIT | AC-09, AC-10, AC-11 | `import-url-boundary.test.ts`, `ai.server.service.test.ts` | done |
| INTG | AC-01 (partial), AC-02 (partial), AC-06, AC-08, AC-12, AC-19 | `server.test.ts` | done |
| OFFL | AC-07, AC-13, AC-14 | Manual steps in `test-report.md` Uncovered criteria | n/a |
| COMP | AC-02, AC-13, AC-16 | Not implemented — no dialog markup changes | n/a |

### Gaps vs plan

- **AC-01 / AC-02 client UI:** Route INTG covers API contract; dialog Toast, `dialogStatus`, and navigation remain manual per plan COMP/OFFL optional path.
- **AC-07:** Cloud sync failure during `persistRecipe` remains manual-only (no Dexie/sync harness).
- **AC-13 / AC-14:** Capability and offline smoke deferred to human QA per planned OFFL layer.

## Residual risk

- Cloud sync failure Toast during import persist (AC-07) remains manual-only.
- DOMPurify/JSDOM behavior on real publisher HTML varies; golden fixtures cover representative cases only.
- Netlify cold-start impact of JSDOM not measured in CI.
- Client boundary test uses source inspection, not bundle graph analysis — Validator **AI-01** complements for import graph.
