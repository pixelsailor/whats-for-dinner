# Test report — calendar-page

Layer-level plan vs actual: [`test-matrix.md`](./test-matrix.md). Layer definitions: [`docs/test-matrix-template.md`](../../../docs/test-matrix-template.md).

**Summary:** 120 calendar-related tests (75 server, 45 browser, after remediation). `pnpm run test`: **28 files / 253 passed, 1 skipped (human-skipped boundary test)**. One defect was found (**DEF-1**, pill touch-target height, WCAG 2.2 AA); it was pinned, then **fixed by the Builder and re-verified** (see *Remediation* below). No blockers for Validation.

## Coverage map

Test files (all new this run): `M` = `src/lib/api/calendar/calendar.model.test.ts`, `L` = `src/lib/api/calendar/calendar.labels.test.ts`, `B` = `src/lib/api/calendar/calendar.boundaries.test.ts`, `S` = `src/lib/stores/calendar.test.ts`, `SD` = `src/lib/stores/calendar.svelte.test.ts` (real Dexie), `G` = `src/lib/ui/calendar/MonthGrid.svelte.test.ts`, `N` = `src/lib/ui/calendar/MonthNav.svelte.test.ts`, `P` = `src/routes/calendar/page.svelte.test.ts` (real route + real Dexie), `PS` = `src/routes/calendar/page.states.svelte.test.ts`, `A` = `src/lib/ui/asidenav/asidenav.svelte.test.ts`.

| AC ID | Test file | Test name(s) | Notes |
| ----- | --------- | ------------ | ----- |
| AC-01 | M | `parseCalendarMonthParam / formatCalendarMonthParam › parses a valid YYYY-MM value and round-trips it`; `zero-pads single-digit months and short years when formatting` | |
| AC-02 | M, P | M: `returns the fallback for invalid input %j without throwing` (13 inputs incl. `'2026-13'`, `'2026-00'`, `'26-1'`, arrays, objects, numbers). P: `falls back to the current month for %j without redirecting` (`garbage`, `2026-13`, `2026-1`, none) | Route-level check proves no redirect/throw. |
| AC-03 | M | `shiftCalendarMonth › moves by one month`; `crosses year boundaries in both directions`; `handles multi-month and multi-year deltas` | |
| AC-04 | M, G | M: `buildMonthGrid › always returns weeks of exactly seven cells`; `lays out a 28-day February starting on Sunday as exactly 4 weeks`; `handles leap-year February…`; `needs 6 weeks for a 31-day month starting on Saturday`; `puts every day number on the right weekday`; `getDaysInCalendarMonth › %j has %i days`. G: `renders blank filler cells without numbers or content` | |
| AC-05 | M | `buildMonthGrid › defaults to Sunday-first and shifts to Monday-first with weekStart 1`; `L: getWeekdayLabels › rotates to Monday-first` | |
| AC-06 | M, G | M: `marks exactly one cell as today…`; `marks no cell as today when the month does not contain it`. G: `marks only today's number with aria-current=date`; `marks no day as current when the month does not contain today` | |
| AC-07 | M | `buildCheckoutIndex › places multiple recipes on one date and one recipe on multiple dates` | |
| AC-08 | M, G | M: `lists a recipe once when the same date is repeated`; `selectCalendarMonth › returns only the requested month and sorts by title then id`; `sorts independently of input recipe order and history order`. G: `orders recipes within a day by title` | |
| AC-09 | M | `buckets legacy timestamp entries by their date part`; `skips unparseable entries and tolerates null, empty, and missing history` | |
| AC-10 | M, SD, P | M: `excludes soft-deleted and non-current recipes`; `includes a recipe again once deleted_at is cleared (restore)`. SD: soft delete + restore step in `loads, navigates months without re-reading, and updates live`. P: `hides recipes that are in the trash` | Real-Dexie and real-route confirmation. |
| AC-11 | S, SD | S: `checkoutIndexStore › starts loading and then emits a date index`; `reports query failures through the envelope`; `calendarMonthStore › is loading until the index arrives, then slices the month`; `propagates errors`. SD: live add / title edit / delete / restore propagate | Node store tests stub `liveQuery`; live behaviour proven only by SD (real IndexedDB). |
| AC-12 | G, P | G: `renders a table named for the month with seven weekday column headers`; `numbers every day of the month in <time datetime> elements`. P: `shows the URL month as one h1 and one month h2`; `lists recipes made on each day as links to their pages` | "No popups" is by construction (no dialog/popover code in calendar files); not separately asserted. |
| AC-13 | G, P | G: `marks only today's number with aria-current=date`. P: month `h2` asserted | "More than colour alone" (filled circle + outline) is a styling choice verified by screenshot review in Build, not by assertion — see Uncovered. |
| AC-14 | G | `exposes the full untruncated title on long recipe pills` (computed `text-overflow: ellipsis`, `white-space: nowrap`, `overflow: hidden`); `fits a %ipx-wide viewport…` (pill height ≤ one line + padding) ×5 widths | |
| AC-15 | G, P | G: `lists every recipe made on a day as links to the recipe page`; `exposes the full untruncated title…` (`title` attribute). P: `lists recipes made on each day as links to their pages` | Click-through navigation to `/recipes/{id}` verified in the real app during Build; not an automated test (see Uncovered). |
| AC-16 | G | `fits a 320 / 375 / 768 / 1280 / 1920px-wide viewport with seven equal columns, no horizontal scroll, one-line pills` | **Waived below 640 px in the real app by human decision** (app-wide side-rail overlay). Component-level fit is tested at all five widths; sidenav expanded/collapsed on desktop is not part of the component harness (manual, Build). |
| AC-17 | G | `grows the busy day row without clipping any recipe and without widening columns`; layout test with 12 pills on one day | |
| AC-18 | N, P | N: `offers previous, next, and Today as real links`. P: `builds previous / next links from the URL month` | Browser back/forward verified in the real app during Build (not automated). |
| AC-19 | N, P | N: `has labelled month and year selectors reflecting the viewed month`; `includes a viewed year that has no data in the year list`; `navigates when a month is chosen, keeping the year`; `navigates when a year is chosen, keeping the month`. P: `offers years from the earliest checkout to now, plus the viewed year` | |
| AC-20 | — | see Uncovered | Manual scripted run (production build, browser set offline). |
| AC-21 | B, — | B covers the static half (see AC-23). Network half: manual scripted run | Zero fetch/xhr/external requests logged-out and offline. |
| AC-22 | P, PS | P: `shows the grid plus a status line for a month with no recipes`; `shows the grid plus helper text when nothing was ever made`. PS: `shows a spinner and the navigation, but no grid, while loading`; `shows the error name and message instead of a blank page or grid`; `replaces the spinner with the grid once data arrives, without remounting the navigation` | Direct-load SSR hydration/console cleanliness is manual (see Uncovered). PS replaces the store (a real live query resolves too fast to observe "loading"). |
| AC-23 | B | `imports nothing from cloud, server, AI, or recommendations modules`; `adds no server route or API route for the calendar` | Mutation-proven: a temporary file importing `$lib/api/cloud` made this fail. |
| AC-24 | M, L, B | M: `time-zone independence`. L: `does not shift at month boundaries in any time zone`. B: `never parses a date string with new Date() or serializes via toISOString` (mutation-proven). Run under 3 `TZ` values | See Command evidence. |
| AC-25 | B | `keeps the Dexie schema, cloud layer, and Supabase free of calendar state` | Replaces the plan's `git diff --stat` check with a git-independent source check. |
| AC-26 | B, S | B: `keeps recipe documents out of the store and components out of Dexie`. S: `retains only slim entries, never recipe documents` | |
| AC-27 | B (partial) | `documents the feature where ADR-012 and the README point` asserts `docs/calendar/README.md` contains "E1 trigger not fired" and "local-only" | The measurements themselves are a manual record — see AC-37. |
| AC-28 | — | **N/A** (E1 not built) | |
| AC-29 | — | **N/A** (E2 not built) | |
| AC-30 | — | **N/A** (E2 not built) | |
| AC-31 | A | `links to /calendar with a visible label when expanded`; `keeps an accessible name when collapsed and the text label is hidden`; `is keyboard focusable`; `is marked as the current page on /calendar`; `sits after Recommendations` | Mobile-overlay (detached) nav state is not covered. |
| AC-32 | G, N, P, PS + **manual axe** (re-run after DEF-1 fix: 0 violations in `<main>`) | G: `renders a table named for the month with seven weekday column headers`; `numbers every day… in <time datetime>`. N: `is keyboard operable: links and selects are tabbable in order`. P: `shows the URL month as one h1 and one month h2`; `gives every link and selector an accessible name`; `keeps pills and day numbers in document order for Tab navigation`. G: `MonthGrid touch targets › every recipe pill is at least 24px tall at a %ipx viewport` (320 / 768 / 1280) | **Met** for target size (DEF-1 fixed). Screen-reader pass and a CI-repeatable axe check remain uncovered. |
| AC-33 | this report | — | Satisfied by this document + `test-matrix.md`. AC-16/17/20/21 documented below. |
| AC-34 | B | `documents the feature where ADR-012 and the README point` (four doc files exist and cross-link; ADR-012 link present) | "ADR-012 status/decision text unchanged" verified by diff review: one table cell changed. |
| AC-35 | S, SD, PS | S: `changes month with ZERO extra Dexie reads and no loading flash` (12 changes, one `toArray`). SD: no loading flash across month changes with real Dexie. PS: `replaces the spinner with the grid once data arrives, without remounting the navigation` | |
| AC-36 | M | `buildCheckoutIndex › shares one entry object per recipe across all of its dates`; `selectCalendarMonth › …` (month-only, sorted, `earliestYear` incl. `null`, first/last day, no mutation); `performance smoke › indexes ~60,000 dates quickly enough…` | |
| AC-37 | — | Manual measurements in `build-log.md` (Phases 2 and 3) and `docs/calendar/README.md` | Not an automated pass/fail test by design. |

## Uncovered criteria

| AC ID | Reason | Follow-up |
| ----- | ------ | --------- |
| AC-20 | Offline behaviour was verified with a scripted Playwright run against a production build (browser set offline: Next month, month/year selects, Today all worked; zero fetch/xhr/external requests). The script was a throwaway and is not committed; the repo has no standalone Playwright suite (test-matrix template: Playwright is a Vitest provider only). | Validator may re-run manually (DevTools → Offline). Adopt a Playwright Test suite if recurring OFFL regression coverage is wanted. |
| AC-21 | Network-request absence is the same manual run. The static half (no cloud/server/API imports) is automated (B). | As above. |
| AC-13 (part) | "Today distinguished by more than colour" is a visual property: filled circle + outline + `aria-current`. `aria-current` is asserted; the non-colour cue is verified by screenshot only. | Optional visual-regression tooling. |
| AC-15 (part) | Actual click-through navigation to `/recipes/{id}` was verified in the real app, not asserted in a test (`goto`/SvelteKit router is stubbed in COMP tests; `href` is asserted). | None needed. |
| AC-18 (part) | Browser back/forward restoring months was verified in the real app, not automated. | None needed. |
| AC-22 (part) | Direct-load of `/calendar?month=…` with no hydration warnings or console errors verified manually (Build: console clean). Not automated. | None needed. |
| AC-32 (part) | Screen-reader pass not performed; the axe runs were one-offs using `axe-core` installed in a temp dir (no project dependency added), so they are **not repeatable in CI**. The target-size regression itself is now an automated test. | Consider adding `axe-core` + a COMP test if broader a11y regression coverage is wanted (needs human approval for a new devDependency). |
| AC-37 | Performance measurement, not a pass/fail test. | Validator reviews numbers. |
| AC-28, AC-29, AC-30 | N/A — E1/E2 not built. | — |

## Defects

### DEF-1 — Recipe pills were 20 px tall (axe `target-size`, serious; WCAG 2.2 AA 2.5.8 Target Size (Minimum) = 24 px) — **FIXED**

- **Found by:** axe-core 4.14 against the production build at 1280 (nav expanded and collapsed) and 768 px: every pill (123 × 20, 157 × 20, 88 × 20 px). Empty month: 0 violations.
- **Fix (Builder, after this report's first draft):** `MonthGrid.svelte` pill `py-0.5` → `py-1` (16 px line + 8 px = 24 px).
- **Remediation evidence:** the `it.fails` pin went red once the fix was in (confirming it); it was replaced by the permanent test `MonthGrid.svelte.test.ts › MonthGrid touch targets (AC-32) › every recipe pill is at least 24px tall at a %ipx viewport` (320, 768, 1280). Production build re-audited with axe-core, `<main>` only, at 1280 expanded, 1280 collapsed, 768, and 1024: **0 violations**, every pill measured exactly 24 px, no horizontal overflow. Full suite 253 passed, 1 skipped.
- **Residual:** 24 px meets the AA minimum, not the 44 px ADR-014 prefers "where feasible"; not feasible in a seven-column grid.

### Axe findings outside the calendar (pre-existing, not defects of this change)

With axe scoped to `<main>` the calendar page has **only** `target-size` (empty month: **0** violations). The whole-page extras come from the existing sidenav/layout and are unchanged by this work:

| Rule (impact) | Element | Note |
| ------------- | ------- | ---- |
| `landmark-unique` (moderate) | `<nav aria-label="main">` (sidenav `NavigationMenu.Root`; two such navs share a name) | Existing. |
| `link-name` (serious) | Home icon link (`a[href="/"]`), `/recipes/new` icon link (expanded); My Recipes link (collapsed) | Existing. **The new Calendar link is not flagged** in either state. |
| `button-name` (critical) | Log-in `<button>` when the sidenav is collapsed | Existing. |
| `region` (moderate) | "Recent recipes" heading and helper paragraph in the sidenav | Existing. |

## Test stability notes

- **Shared IndexedDB across browser test files.** `calendar.svelte.test.ts`, `page.svelte.test.ts` (and any future Dexie-backed client test) read and clear the same `meal_assistant` database in the same browser origin. They pass reliably when files run one after another (5 repeated targeted runs and 3 full runs, all green) but would interfere if the client project were ever configured to run files in parallel. Each test seeds and clears in `beforeEach`/`afterEach`.
- **Viewport leakage.** `MonthGrid.svelte.test.ts` calls `page.viewport(w, h)` and does not restore it; later files in the same browser inherit the last size. No current test depends on viewport size, but one added later might.
- **Polling assertions** (`expect.poll`, 5 s ceiling) wait on real IndexedDB live queries in `calendar.svelte.test.ts` and `page.svelte.test.ts`. No run came close to timing out (settle times were not instrumented).
- **Layout assertions** depend on real rendering: equal-column tolerance is 1.5 px and the one-line pill check allows 1 px of slack. Stable across runs here; a different font or zoom could shift sub-pixel results.
- **Performance smoke** (`performance smoke` in `calendar.model.test.ts`) asserts < 500 ms for ~60,000 dates in Node (the whole model test file runs in well under a second; exact time not instrumented). A heavily loaded CI machine could in theory exceed this; it is a gross-regression guard, not a budget.
- The temporary `it.fails` pin for DEF-1 was removed when the defect was fixed; the replacement is an ordinary test.
- **Browser tests need Playwright Chromium.** In the agent terminal sandbox Chromium cannot launch, so browser runs were executed unsandboxed (throwaway profile; the app's real IndexedDB is not touched).
- **Boundary tests** read source via `import.meta.glob(?raw)`: they scan only the listed directories and the store file, so a calendar file added elsewhere would not be scanned.

## Command evidence

| Command | Result | Notable output |
| ------- | ------ | -------------- |
| `pnpm run test` (3 consecutive runs, before the fix) | **pass** | 28 files; 250 passed, 1 expected fail, 1 skipped (human-skipped `import-url-boundary`). Identical each run. |
| `pnpm run test` (after the DEF-1 fix) | **pass** | 28 files; **253 passed, 1 skipped**; no expected-fail remaining. |
| axe-core 4.14 re-run after the fix (production build rebuilt; `<main>` only; 1280 expanded / 1280 collapsed / 768 / 1024) | **0 violations** | Pills exactly 24 px; 0 px horizontal overflow. |
| `pnpm exec vitest run --project client src/routes/calendar src/lib/ui/calendar src/lib/ui/asidenav src/lib/stores/calendar` ×5 | **pass** | 42 passed each run (before the expected-fail test was added). |
| `TZ=UTC pnpm exec vitest run --project server src/lib/api/calendar src/lib/stores/calendar` | **pass** | 75/75 |
| `TZ=America/Los_Angeles pnpm exec vitest run --project server src/lib/api/calendar src/lib/stores/calendar` | **pass** | 75/75 |
| `TZ=Pacific/Auckland pnpm exec vitest run --project server src/lib/api/calendar src/lib/stores/calendar` | **pass** | 75/75 |
| Mutation check: temporary `src/lib/ui/calendar/ZzTemp.ts` importing `$lib/api/cloud` and using `new Date('…').toISOString()` | boundary tests **failed (2)** as intended | File deleted afterwards; boundary suite 7/7 again. |
| `pnpm exec eslint` on all calendar/asidenav/route paths | **pass** | clean |
| `pnpm exec prettier --check` on same paths | **pass** | |
| `pnpm run check` | 16 errors / 3 warnings in 9 files | Identical to the Builder's baseline; **none in calendar/asidenav files**. (An early draft of `calendar.boundaries.test.ts` added 4 type errors via `node:fs`; rewritten to `import.meta.glob` and re-verified.) |
| axe-core 4.14 against production build (`vite preview`), headless Chromium, seeded IndexedDB — 1280 expanded, 1280 collapsed, 768, empty month; whole page and `<main>` only (before the fix) | 1 calendar defect | DEF-1 (now fixed) and the pre-existing sidenav table. Temp dir and script removed. |

Not run: Lighthouse; screen-reader pass; `pnpm run lint` project-wide (fails on pre-existing files — `last-opened-pending.test.ts` Prettier, ESLint in `suggestions/recipe/+page.svelte`; not part of this change).

## Commands to run

```bash
# Everything (both Vitest projects)
pnpm run test

# Calendar unit tests (Node)
pnpm exec vitest run --project server src/lib/api/calendar src/lib/stores/calendar

# Time-zone independence (AC-24)
TZ=UTC pnpm exec vitest run --project server src/lib/api/calendar src/lib/stores/calendar
TZ=America/Los_Angeles pnpm exec vitest run --project server src/lib/api/calendar src/lib/stores/calendar
TZ=Pacific/Auckland pnpm exec vitest run --project server src/lib/api/calendar src/lib/stores/calendar

# Calendar browser tests (needs Playwright Chromium; unsandboxed if run inside a restricted sandbox)
pnpm exec vitest run --project client src/routes/calendar src/lib/ui/calendar src/lib/ui/asidenav src/lib/stores/calendar

# Static checks
pnpm exec eslint src/lib/api/calendar src/lib/stores/calendar.ts src/lib/ui/calendar src/lib/ui/asidenav src/routes/calendar
pnpm run check
```

Manual (AC-20, AC-21, AC-37): `pnpm run build && pnpm exec vite preview`, open `/calendar`, DevTools → Network → Offline; step through Next/Previous, month/year selects, Today; confirm no fetch/xhr requests.

## Blockers

N/A. DEF-1 was routed back, fixed by the Builder, and re-verified (see *Defects*).
