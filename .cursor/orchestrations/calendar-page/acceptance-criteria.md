# Acceptance Criteria — calendar-page

Each criterion is independently verifiable by Tester or Validator. IDs are stable; `plan.md` references them. D1 is resolved as **"A first, escalate only on measurement"**. Criteria marked **(E1)** or **(E2)** apply only if an escalation step is triggered and approved by the human (multi-entry index, or dedicated table); otherwise mark them N/A in `test-report.md`.

## Functional — pure model (Phase 1)

- [ ] AC-01: `parseCalendarMonthParam('2026-11', fallback)` returns `{ year: 2026, month: 11 }`; `formatCalendarMonthParam` round-trips it to `'2026-11'`.
- [ ] AC-02: Missing, empty, malformed (`'2026-13'`, `'2026-00'`, `'26-1'`, `'abc'`) or array-like input returns the supplied fallback and never throws.
- [ ] AC-03: `shiftCalendarMonth` moves by ±1 and by larger deltas correctly across year boundaries (Dec 2026 +1 → Jan 2027; Jan 2026 −1 → Dec 2025).
- [ ] AC-04: `buildMonthGrid` returns weeks of exactly 7 cells, with the 1st on the correct weekday, correct day count per month (28/29/30/31 incl. leap-year Feb 2024 and non-leap Feb 2026), blank `filler` cells before the 1st and after the last day, and 4, 5 or 6 weeks as appropriate (fixtures: a 28-day Feb starting on Sunday = 4 weeks; a 31-day month starting on Friday/Saturday = 6 weeks).
- [ ] AC-05: `weekStart: 1` shifts the grid to Monday-first; default is Sunday-first.
- [ ] AC-06: Exactly one cell has `isToday: true`, and only when the viewed month contains `todayIso`.

## Functional — data (Phases 1–2)

- [ ] AC-07: `buildCheckoutIndex` places every recipe on every date in its `checkout_history`; multiple recipes on one date all appear; one recipe on multiple dates appears on each.
- [ ] AC-08: A recipe repeated on the same date appears once for that date; entries within a day are ordered by `title.localeCompare` then `id`, independent of `checkout_history` order and of input recipe order.
- [ ] AC-09: Legacy timestamp-style entries (e.g. `'2026-03-04T10:00:00.000Z'`, space-separated datetimes) are bucketed by their date part via `toIsoDate`; unparseable entries are skipped; `null`, `undefined` and `[]` histories produce no entries and no errors.
- [ ] AC-10: Recipes with `deleted_at` set, or `is_current === false`, do not appear; they reappear when `deleted_at` is cleared (restore) (default per Open question Q2).
- [ ] AC-11: `checkoutIndexStore` emits the `{ data, loading, error }` envelope (initially `loading: true, data: null`) and updates live when a recipe's `checkout_history` or title changes, without a page reload.

## Functional — UI (Phase 3)

- [ ] AC-12: `/calendar` shows exactly one month as a grid with seven weekday names across the top and every day of the month numbered 1…N, on a normal page — no dialog, popover, drawer or sheet is used to show calendar content or navigation.
- [ ] AC-13: A month heading (e.g. "November 2026") is visible; today's cell is visually distinguished by more than colour alone and has `aria-current="date"`.
- [ ] AC-14: Each recipe appears as a single-line pill (no wrapping at any width); titles longer than the available width are truncated with an ellipsis.
- [ ] AC-15: Each pill is an `<a>` whose `href` is `/recipes/{id}` (existing route) and which exposes the full, untruncated title (`title` attribute and accessible name); activating it navigates to that recipe's page.
- [ ] AC-16: **(Human exception, below 640 px: waived.** The app targets tablets and laptops; the existing layout's collapsed side-rail overlays the first column on phone widths for every page and a layout overhaul is planned, so no calendar-specific workaround is built. The grid itself is still required to fit at 320/375 px — verified in isolation by component tests.) At viewport widths 320, 375, 768, 1280 and 1920 px the grid fits the available width with seven equal columns and no horizontal scrolling of the page or table, with the sidenav both expanded and collapsed on desktop.
- [ ] AC-17: Every recipe made on a day is shown (no hidden "+N more"); a day with many recipes grows its row height rather than clipping, and other rows are unaffected in width.
- [ ] AC-18: Previous month, next month and "Today" controls are real links (`<a href="/calendar?month=YYYY-MM">`-style) that change the visible month; "Today" returns to the current local month; browser back/forward restores prior months.
- [ ] AC-19: Month and year selectors reflect the visible month; choosing a value navigates to that month/year (URL updates); the viewed year is always present in the year list even if it has no data; selectors are keyboard operable and labelled.

## Offline, connectivity, anonymous (ADR-001, ADR-012)

- [ ] AC-20: With the network offline (DevTools offline) and the app already loaded/cached, `/calendar` renders and month navigation works from local data.
- [ ] AC-21: With no Supabase session (logged out) the page renders the user's local recipes' history; no request to Supabase, OpenAI or any `src/routes/api/**` endpoint is made by calendar code (verify in Network panel).
- [ ] AC-22: Loading shows a spinner; a store error shows the error name/message (no blank page, no uncaught exception); an empty month renders the full grid plus a polite "no recipes this month" message; a library with no checkouts at all renders the grid plus helper text. A direct load of `/calendar?month=2026-11` produces no hydration warnings or console errors.

## Architectural / ADR

- [ ] AC-23: Calendar code (`src/lib/api/calendar/**`, `src/lib/stores/calendar.ts`, `src/lib/ui/calendar/**`, `src/routes/calendar/**`) does not import from `$lib/api/cloud`, `$lib/server/**`, `$lib/recommendations`, `$lib/openai/**`, and adds no file under `src/routes/api/**`; `grep` evidence in `validation-report.md`.
- [ ] AC-24: Day bucketing is time-zone independent: unit tests pass with `TZ=America/Los_Angeles`, `TZ=UTC` and `TZ=Pacific/Auckland`, and no calendar code parses `'YYYY-MM-DD'` via `new Date(string)`.
- [ ] AC-25: Core phases make no change to `src/lib/db.ts`, add no Dexie table or index, add no Supabase table/migration, and leave `SyncService`/`cloud.*` files unmodified (`git diff --stat` evidence).
- [ ] AC-26: Memory discipline: the dedicated store builds the index **inside** its `liveQuery` function and returns only the slim index (no recipe documents retained); it does not derive from `unsortedRecipesStore`; components import only `calendarMonthStore` (not `checkoutIndexStore`, not `db`).
- [ ] AC-27: The escalation decision is recorded in `build-log.md` and `docs/calendar/README.md`: measured numbers, the budgets from `plan.md`, and an explicit "E1 trigger: fired / not fired" verdict. No E1/E2 code exists unless the verdict is "fired" **and** the human approved.
- [ ] AC-28: **(E1)** `src/lib/db.ts` gains `version(4)` adding only the `*checkout_history` multi-entry index (existing tables and indexes preserved), with an upgrade step that normalises non-canonical `checkout_history` entries; behaviour verified against real IndexedDB (browser project or documented manual run) including upgrade from v3 data; `calendarMonthStore`'s contract and all components are unchanged; results are identical to the A implementation on a shared fixture library (parity test).
- [ ] AC-29: **(E2)** A **Proposed** ADR amendment exists and has been **Accepted by the human** before any `recipe_checkouts` code; the table has a Zod `.strict()` schema, stores only `recipe_id` + `date`, is backfilled idempotently on upgrade (including for anonymous users), and matches the index derived from `db.recipes` after first sync and after edits/deletes/restores/hard deletes (parity test).
- [ ] AC-30: **(E2)** The table is not uploaded, downloaded or referenced by `SyncService`/Supabase, and the design doc states it is local-only.
- [ ] AC-31: The sidenav has a "Calendar" link (`CalendarIcon`) to `/calendar` that is present in expanded and collapsed states, keyboard focusable, and has an accessible name even when the text label is hidden (collapsed).

## Accessibility (ADR-014)

- [ ] AC-32: Exactly one `h1` ("Calendar"); the month heading is an `h2`; the grid is a `<table>` with `<caption>` (may be `sr-only`), `<th scope="col">` weekday headers exposing full weekday names to assistive tech, and day numbers in `<time datetime>`; all links/selects are reachable by Tab in logical order with visible focus; touch targets for nav controls are ≥ 44×44 px where feasible; no information is conveyed by colour alone; axe/Lighthouse (or manual screen-reader pass) reports no new critical issues.

## Test evidence

- [ ] AC-33: Automated tests named in `test-report.md` cover AC-01–AC-11 and AC-36 (UNIT) and AC-12–AC-15, AC-18, AC-19, AC-22, AC-32 where feasible (COMP); AC-16, AC-17, AC-20, AC-21 are covered by documented manual/Playwright-browser checks or listed under **Uncovered criteria** with reason. Mapped to layers in `test-matrix.md`.

## Documentation

- [ ] AC-34: `docs/calendar/README.md` exists (envelope summary, D1 outcome, URL contract, time-zone rule, states, local-only/no-sync statement), `src/lib/api/calendar/README.md` exists, root `README.md` Documentation Map links the design doc, and ADR-012 §A "Deeper design home" links it. ADR-012 status and decision text are unchanged unless the human accepted an amendment.

## Efficiency (D1 resolution)

- [ ] AC-35: Navigating between months (prev/next/Today/selects/URL edits within the same page session) performs **zero** additional Dexie reads of `recipes` after the first load and does not re-show the loading state; verified by a read counter/spy in a test or by DevTools logging.
- [ ] AC-36: `buildCheckoutIndex` creates one shared `{ id, title }` object per recipe across all its dates; `selectCalendarMonth` returns only days of the requested month, sorts only those days, and derives `earliestYear` correctly (including `null` when there are no checkouts); a smoke test with ~60,000 dates (2,000 recipes × 30) completes under a generous ceiling (< 500 ms in Node) to catch accidental O(n²).
- [ ] AC-37: `build-log.md` records, for a synthetic 2,000 × ~30 library: `toArray()` time, index-build time, month-slice time, approximate retained heap, and first-render time at 4× CPU throttle, with the methodology used.

## Out of scope / non-goals (must not appear in the diff)

- Any E1/E2 code unless its trigger fired and the human approved.

- Editing/adding/removing checkout dates from the calendar; day-detail popups; week/agenda views; export/print.
- Any server route, Supabase change, AI call, or sync-semantics change.
- Changes to recommendations, the recipe detail page, or the checkout writers.
- Unrelated refactors or fixes to pre-existing lint/check/test failures (report them only).
