# Test matrix — calendar-page

Layer definitions and runners: [`docs/test-matrix-template.md`](../../../docs/test-matrix-template.md).

Per-run AC evidence (test names, uncovered list, commands executed): `test-report.md` (created by Tester).

## Planned coverage (Planner)

| Layer ID | AC IDs                                   | Approach / notes                                                                                                                                                                                                                                                     |
| -------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UNIT     | AC-01–AC-10, AC-24                       | `src/lib/api/calendar/calendar.model.test.ts` (Vitest `server` project). Fixtures: Feb 2024 (leap) / Feb 2026, 6-week months, year boundaries, dup/legacy/null history, deleted + non-current recipes. Run under three `TZ` values for AC-24 (`TZ=… pnpm exec vitest run --project server src/lib/api/calendar`). |
| UNIT     | AC-36                                    | Index shape (shared entry objects), `selectCalendarMonth` (month-only, sorted, `earliestYear`), and the ~60k-date smoke test with a generous ceiling.                                                                                                                  |
| UNIT     | AC-11, AC-35                             | Store test with `unsortedRecipesStore` mocked (pattern: `src/routes/page.svelte.test.ts` mocks) — envelope shape and recomputation. Live-update behaviour verified against real Dexie only if `fake-indexeddb` is acceptable; otherwise covered by manual check and listed as a gap.        |
| COMP     | AC-12–AC-15, AC-18, AC-19, AC-22, AC-32  | `src/lib/ui/calendar/MonthGrid.svelte.test.ts` (+ `MonthNav`) via `vitest-browser-svelte` (Vitest `client` project): weekday header, day numbers, `aria-current`, pill `href`/`title`, truncation class/computed `text-overflow`, nav hrefs, select labels, state rendering with the store mocked. |
| COMP     | AC-16, AC-17                             | Browser-project test sets viewport widths (320/768/1280) and asserts `document.documentElement.scrollWidth <= clientWidth` and 7 equal column widths; many-pills day grows only its row. If flaky, demote to manual QA.                                                 |
| OFFL/MAN | AC-27, AC-37                             | Perf measurement on a synthetic 2,000 × ~30 library (DevTools Performance with 4× CPU throttle, heap snapshot). Numbers and "E1 trigger" verdict recorded in `build-log.md`; Validator reviews. Not an automated pass/fail test.                                      |
| INTG     | AC-23, AC-25, AC-26                      | Static checks: `grep` for forbidden imports/paths in calendar files; `git diff --stat` shows no `db.ts`/cloud changes (D1=A).                                                                                                                                         |
| OFFL     | AC-20, AC-21                             | Manual (DevTools offline, logged-out profile, Network panel clear of Supabase/OpenAI/api requests). Record steps in `test-report.md`.                                                                                                                                  |
| COMP/MAN | AC-31                                    | Component or manual check of sidenav in expanded, collapsed, and mobile states.                                                                                                                                                                                       |
| UNIT/COMP | AC-28 **(E1)**, AC-29 **(E2)**          | Real-IndexedDB migration + parity test (browser project; `fake-indexeddb` would be a new devDependency — requires human approval); random-data parity "escalated read == A read".                                                                                      |
| INTG     | AC-30 **(E2)**                           | ADR/index doc review; grep `SyncService`/cloud for table references.                                                                                                                                                                                                  |
| N/A      | AC-33, AC-34                             | Process/doc criteria — checked by Validator.                                                                                                                                                                                                                         |

### AC → layers (summary)

| AC ID         | Layers   | Notes                                              |
| ------------- | -------- | -------------------------------------------------- |
| AC-01–AC-06   | UNIT     | Pure functions                                     |
| AC-07–AC-10   | UNIT     | Index builder                                      |
| AC-11         | UNIT     | Store envelope; live update may be manual          |
| AC-35         | UNIT/MAN | Read counter/spy on month navigation               |
| AC-36         | UNIT     | Index shape, month slice, smoke test               |
| AC-26, AC-27, AC-37 | INTG/MAN | Static checks + recorded perf measurement    |
| AC-12–AC-15   | COMP     |                                                    |
| AC-16–AC-17   | COMP/MAN | Layout assertions; manual fallback                 |
| AC-18–AC-19   | COMP     |                                                    |
| AC-20–AC-21   | OFFL     | Manual                                             |
| AC-22         | COMP     | Plus manual direct-load/console check for SSR      |
| AC-23, AC-25  | INTG     | Static/diff checks                                 |
| AC-24         | UNIT     | Three `TZ` runs                                    |
| AC-28–AC-30   | UNIT/COMP/INTG | **E1/E2 only**                                |
| AC-31         | COMP/MAN |                                                    |
| AC-32         | COMP/MAN | Axe/Lighthouse or screen-reader pass               |
| AC-33–AC-34   | N/A      | Process/doc                                        |

## Actual coverage (Test)

Status: planned | done | n/a | blocked. Test names per AC are in [`test-report.md`](./test-report.md).

| Layer ID | AC IDs | Test file(s) / evidence | Status |
| -------- | ------ | ----------------------- | ------ |
| UNIT     | AC-01–AC-10, AC-24, AC-36 | `src/lib/api/calendar/calendar.model.test.ts` (57 tests), `calendar.labels.test.ts` (5); run under `TZ=UTC`, `America/Los_Angeles`, `Pacific/Auckland` (75/75 each with store + boundary tests) | done |
| UNIT     | AC-11, AC-26, AC-35 | `src/lib/stores/calendar.test.ts` (6; Dexie `liveQuery` stubbed) | done |
| COMP     | AC-10, AC-11, AC-35 (real Dexie) | `src/lib/stores/calendar.svelte.test.ts` (1; real Chromium + IndexedDB: load, no loading flash on navigation, live add/edit/delete/restore) | done |
| COMP     | AC-04, AC-06, AC-08, AC-12–AC-17, AC-32 | `src/lib/ui/calendar/MonthGrid.svelte.test.ts` (14 + 3 touch-target regression tests at 320/768/1280, added with the DEF-1 fix) | done |
| COMP     | AC-18, AC-19, AC-32 | `src/lib/ui/calendar/MonthNav.svelte.test.ts` (6) | done |
| COMP     | AC-02, AC-10, AC-12, AC-15, AC-18, AC-19, AC-22, AC-32 | `src/routes/calendar/page.svelte.test.ts` (13; real route + real Dexie) | done |
| COMP     | AC-22, AC-35 | `src/routes/calendar/page.states.svelte.test.ts` (3; loading / error / data transition with a controllable store) | done |
| COMP     | AC-31 | `src/lib/ui/asidenav/asidenav.svelte.test.ts` (5) | done |
| INTG     | AC-21 (static half), AC-23, AC-24, AC-25, AC-26, AC-27 (docs), AC-34 | `src/lib/api/calendar/calendar.boundaries.test.ts` (7; source scan via `import.meta.glob ?raw`; mutation-proven) | done |
| OFFL     | AC-20, AC-21 | Manual scripted Playwright run against `vite preview` with the browser set offline and logged out: 0 fetch/xhr/external requests; Next / selects / Today all worked | done (manual; script not retained) |
| MAN      | AC-32 | axe-core 4.14 one-offs against production build: first run found DEF-1; **re-run after the fix: 0 violations in `<main>`** at 1280 expanded / collapsed, 768, 1024. Sidenav findings are pre-existing | done |
| MAN      | AC-37 | Perf tables in `build-log.md` (Phases 2–3) and `docs/calendar/README.md` | done (recorded by Builder; reviewed by Tester) |
| N/A      | AC-28, AC-29, AC-30 | E1/E2 not built | n/a |
| N/A      | AC-33 | Satisfied by `test-report.md` + this matrix | n/a |

### Gaps vs plan

- **Planned COMP assertion for AC-16 at "sidenav expanded and collapsed on desktop"** was not automated (component harness renders the grid alone). The real-app overflow check was manual (Build) and AC-16 is waived below 640 px by the human.
- **AC-20 / AC-21** are manual, not automated: the repo has no standalone Playwright suite.
- **AC-32:** target size is fixed and covered by an automated test; no screen-reader pass, and axe itself is not repeatable in CI (no project dependency).
- Planned `fake-indexeddb` was not needed — real IndexedDB in the browser project is used instead (no new dependency).
- Added beyond plan: boundary tests, route-level and states tests, and touch-target regression tests (a temporary `it.fails` pin was used until DEF-1 was fixed, then replaced).

## Residual risk

- Browser (COMP) tests need Playwright Chromium; in the agent sandbox they ran unsandboxed.
- Client tests that touch IndexedDB share one origin/database and rely on sequential file execution; viewport set in `MonthGrid` tests is not restored.
- Layout assertions are real-rendering dependent (sub-pixel tolerances).
- Pre-existing project-wide lint/check failures and sidenav a11y findings are outside this change and unaffected.
