# Build log — calendar-page

Builder-owned. Entries are per phase; later phases append below.

## Phase 1 — Pure model, schema, types (complete)

### Files created

| Path                                          | Purpose                                                              | Key decisions                                                                                                                                                                                                                                                        |
| --------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/api/calendar/calendar.schemas.ts`    | Zod `.strict()` schemas                                              | Added `CalendarMonthSchema` and `CalendarCellSchema` (not named in the plan) so every exported view-model type is `z.infer`-derived per ADR-008.                                                                                                                     |
| `src/lib/api/calendar/calendar.types.ts`      | Inferred types, `CheckoutIndex`, `CheckoutIndexSource`               | `CheckoutIndexSource` is a `Pick<SavedRecipe, …>` so callers pass full rows or slim fixtures without a parallel hand-written interface.                                                                                                                              |
| `src/lib/api/calendar/calendar.model.ts`      | Pure helpers (see plan "Interface contracts")                        | Day math uses `setUTCFullYear` + `getUTC*` (avoids `Date.UTC` two-digit-year quirk); no string `Date` parsing. `earliestYear` is cached per index in a `WeakMap` so month navigation never rescans history. Year selector capped at `MAX_YEAR_OPTIONS` (100). |
| `src/lib/api/calendar/calendar.model.test.ts` | UNIT tests (57)                                                      | Covers AC-01–AC-10 (model parts), AC-24, AC-36. Written by Builder; Tester may extend.                                                                                                                                                                               |
| `src/lib/api/calendar/index.ts`               | Barrel                                                               | Matches `src/lib/api/recipe/index.ts`.                                                                                                                                                                                                                               |
| `src/lib/api/calendar/README.md`              | Module doc                                                           | Records the time-zone, memory, and forbidden-import rules.                                                                                                                                                                                                           |

### Files modified

_None._ (No change to `db.ts`, sync/cloud files, routes, or `asidenav.svelte` — AC-25 holds so far.)

### Command evidence

| Command                                                                                              | Result                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm exec prettier --write src/lib/api/calendar`                                                    | Formatted                                                                                      |
| `TZ=UTC pnpm exec vitest run --project server src/lib/api/calendar`                                  | **pass** — 57/57                                                                               |
| `TZ=America/Los_Angeles pnpm exec vitest run --project server src/lib/api/calendar`                  | **pass** — 57/57                                                                               |
| `TZ=Pacific/Auckland pnpm exec vitest run --project server src/lib/api/calendar`                     | **pass** — 57/57                                                                               |
| `pnpm exec eslint src/lib/api/calendar`                                                              | **pass** — no output                                                                           |
| `pnpm exec prettier --check src/lib/api/calendar`                                                    | **pass**                                                                                       |
| `pnpm run check`                                                                                     | Fails project-wide (16 errors, 3 warnings, 9 files) — all pre-existing; **0 matches in `api/calendar`** |
| Static grep of non-test calendar files for cloud/server/recommendations/openai/dexie/`$app`/`$lib/db`/`toISOString` | No hits. Only `new Date(0)` (epoch seed in `utcDate`, not a string parse)       |

Did not run: `pnpm run test` (full suite) and `pnpm run lint` (project-wide) — deferred to the Tester/Validator stages; scoped lint and format for touched paths are clean.

### Deviations from plan

_None._

### Scope pressure

_None._

### Unresolved open questions

| Plan question | Outcome                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Q8            | Deferred — no repair of legacy entries (out of scope); calendar normalises on read.             |
| Q9            | Deferred — no ADR-012 amendment drafted unless requested.                                       |
| Q10           | Budgets accepted as proposed; measured in Phase 2 (AC-37).                                      |

### Known gaps

- AC-37 (perf measurement) and AC-35 (no re-query on navigation) are Phase 2 work; only the in-Node ~60k-date smoke test exists so far.
- `selectCalendarMonth` relies on the index being immutable (cache keyed by Map identity). Phase 2's store must create a **new** Map on every rebuild and never mutate one in place.

## Phase 2 — Slim-index store, month-scoped seam, perf check (complete)

### Files created

| Path                                        | Purpose                                                               | Key decisions                                                                                                                                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/stores/calendar.ts`                | `checkoutIndexStore` (internal) and `calendarMonthStore(month$)`      | Index is built **inside** the `liveQuery` fn via `createLiveQueryStore`, so recipe documents are not retained. Not derived from `unsortedRecipesStore`. `calendarMonthStore` is a `derived([index, month])`: month change = pure in-memory slice.             |
| `src/lib/stores/calendar.test.ts`           | UNIT (server project, 6 tests)                                        | Stubs `dexie` `liveQuery` with a one-shot observable (real `liveQuery` never emits without IndexedDB). Fresh module per test (`vi.resetModules`) because `readable` keeps its last value. Covers AC-11 envelope, AC-26 slim entries, AC-35 zero re-read on 12 month changes. |
| `src/lib/stores/calendar.svelte.test.ts`    | COMP (client project, real Chromium + IndexedDB, 1 test)              | Real Dexie: initial load, month navigation with no loading flash, live add, title edit, soft delete, restore all propagate. Run unsandboxed (Chromium cannot launch in the terminal sandbox).                                                                  |

### Files modified

| Path                                                    | What changed                                                                                  | Why |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --- |
| `.cursor/orchestrations/calendar-page/plan.md`          | `calendarMonthStore` takes `Readable<CalendarMonth>`; rationale recorded in the contract.     | See Deviations. |

No change to `db.ts`, sync/cloud files, routes, or `asidenav.svelte` (AC-25 holds).

### Perf measurement (AC-37) — synthetic library, real IndexedDB, headless Chromium

Library: 2,000 recipes, each with ~15 ingredients / 10 instructions (~5 KB of text) and 30 checkouts spread over ~6 years (60,000 dates, 2,190 distinct days). Three runs; one temporary benchmark test (deleted after measuring) using `performance.now()`, CDP `Emulation.setCPUThrottlingRate`, and `HeapProfiler.collectGarbage` + `Runtime.getHeapUsage`.

| Metric                                       | 1x CPU (3 runs)   | 4x CPU throttle (3 runs) | Budget (plan)     |
| -------------------------------------------- | ----------------- | ------------------------ | ----------------- |
| `db.recipes.toArray()`                       | 49.4 – 51.4 ms    | 80.2 – 83.2 ms           | —                 |
| `buildCheckoutIndex`                         | 17.9 – 20.0 ms    | 45.3 – 47.7 ms           | —                 |
| `selectCalendarMonth` (one month)            | 3.3 – 4.5 ms (first call; includes `earliestYear` scan) | 0.3 – 0.8 ms | —       |
| **toArray + build + select**                 | **71.5 – 73.8 ms**| 126.7 – 128.8 ms         | `toArray + build` > 100 ms at 1x |
| Retained heap with index (after GC)          | **0.7 – 0.8 MB**  | n/a                      | > ~10 MB          |

- An earlier run with unrealistically clustered dates (84 distinct days) gave the same picture (69.5 ms total, 0.5 MB), so the result is not sensitive to date distribution.
- Not measured: **first-render time** (needs the Phase 3 UI) — to be added in Phase 3 against the 250 ms / 600 ms budgets. **Transient peak** during `toArray()` (all 2,000 documents, roughly 10 MB of text) was not measured; it is released immediately after the index is built.
- 4x throttle total (~128 ms) exceeds 100 ms, but that budget was defined for desktop; the 600 ms throttled budget applies to first render.

**E1 trigger: NOT fired** (on the store-level metrics). Verdict is provisional until the first-render number is recorded in Phase 3.

### Command evidence

| Command                                                                                                | Result                                                                              |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `pnpm exec vitest run --project server src/lib/stores/calendar src/lib/api/calendar`                   | **pass** — 63/63 (57 model + 6 store)                                               |
| `pnpm exec vitest run --project client src/lib/stores/calendar` (unsandboxed)                          | **pass** — 1/1 real-Dexie test                                                       |
| `pnpm exec eslint src/lib/stores/calendar*.ts src/lib/api/calendar`                                    | **pass** — clean                                                                    |
| `pnpm exec prettier --check src/lib/stores src/lib/api/calendar`                                       | **pass**                                                                            |
| `pnpm run check`                                                                                       | Fails project-wide (16 errors, 3 warnings, 9 files) — unchanged from Phase 1; none in calendar files |
| `pnpm exec eslint src/lib/stores`                                                                      | 1 **pre-existing** error in `recent-recipes-reconcile.test.ts` (import sort) — not touched |
| `grep` for cloud/server/recommendations/openai imports in `src/lib/stores/calendar.ts`                 | No hits                                                                             |

Not run: full `pnpm run test`, project-wide `pnpm run lint` (Tester/Validator stages).

### Deviations from plan

1. **`calendarMonthStore` signature:** `(month: Readable<CalendarMonth>)` instead of `(month: CalendarMonth)`. Reason: Svelte 5 unsubscribes the old `$store` before subscribing the new one when a store expression changes, which would stop the `liveQuery` and re-read Dexie with a loading flash on every month change — violating AC-35. Plan contract updated. Phase 3 route must create it once, driven by `derived(page, …)` from `$app/stores`.
2. **Perf check scope:** first-render time deferred to Phase 3 (needs UI). Store-level numbers recorded now.
3. **Added** a permanent real-Dexie client test (`calendar.svelte.test.ts`) — not listed in the file map; replaces the throwaway benchmark and covers AC-11 live updates, which the Node stub cannot.

### Scope pressure

_None._

### Known gaps

- Every write to `recipes` while `/calendar` is mounted rebuilds the full index (including `last_opened`-only writes). Acceptable: those writes happen on recipe-page open, after the calendar has unmounted; not optimised.
- Node store tests stub `liveQuery`; real behaviour is covered only by the client test (needs Playwright Chromium and, in this environment, an unsandboxed run).
- The browser test and perf run used Playwright's throwaway profile; the app's real IndexedDB was not touched.

## Phase 3 — Route and UI (complete, with one open layout finding)

### Files created

| Path                                              | Purpose                                                       | Key decisions                                                                                                                                                                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/calendar/+page.svelte`                | `/calendar` route                                             | Month from `?month=` via `page` from `$app/state` (not deprecated `$app/stores`), bridged to the store layer with `toStore(() => requestedMonth)` from `svelte/store`; `calendarMonthStore` created **once**. Loading / error / empty-month / never-made states. `max-w-7xl` container (plan asked the Builder to record this choice). |
| `src/lib/ui/calendar/MonthGrid.svelte`            | Semantic month `<table>`                                      | `table-fixed w-full`; `<caption class="sr-only">`; `<th scope="col">` with sr-only full name + short (≥`sm`) / narrow (<`sm`) visual labels; `<time datetime>` day numbers; `aria-current="date"` + filled circle + outline on today; pills `block truncate whitespace-nowrap` as `<a href=resolve('/recipes/[...id]')>` with `title`. |
| `src/lib/ui/calendar/MonthNav.svelte`             | Prev / next / Today links + month & year selects              | Links are real anchors via `Button href`; selects are native, labelled (`sr-only`), and call `goto(resolve(...))`. No state of its own.                                                                                                                                  |
| `src/lib/api/calendar/calendar.labels.ts` (+test) | Month/weekday labels via `DateFormatter`                      | Uses `@internationalized/date` as suggested. Fixed `en-US` locale (not `navigator`) so SSR and browser text match. UTC-zoned formatting so names cannot shift with TZ. Exported from the barrel.                                                                      |
| `src/lib/ui/calendar/MonthGrid.svelte.test.ts`    | COMP (client project), 14 tests                               | Structure, `aria-current`, hrefs, ordering, truncation styles, fillers, and layout at 320/375/768/1280/1920 px (no horizontal scroll, 7 equal columns, one-line pills, busy-day row grows). Imports `app.css` so Tailwind applies in the test browser.                  |
| `src/lib/ui/calendar/MonthNav.svelte.test.ts`     | COMP (client project), 6 tests                                | Link hrefs, labelled selects, viewed-year inclusion, `goto` targets (mocked), Tab order.                                                                                                                                                                                |

### Files modified

| Path                                  | What changed                                                                                                                                                                                    | Why |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `src/lib/stores/calendar.ts`          | `calendarMonthStore` envelope now also carries `month` (the month `data` was computed for). Added exported `CalendarMonthEnvelope` type.                                                          | Heading, selects and grid render from one atomic value instead of racing the URL-derived month. |
| `src/lib/stores/calendar.test.ts`     | Assertions for the new `month` field.                                                                                                                                                           | Follows the store change. |
| `src/lib/api/calendar/index.ts`       | Re-exports `calendar.labels`.                                                                                                                                                                   | Barrel. |

Not touched: `db.ts`, sync/cloud files, recommendations, `asidenav.svelte` (Phase 4), `src/routes/api/**` (AC-23, AC-25 hold).

### Verification on the real app (headless Chromium against `vite dev`, throwaway profile, seeded IndexedDB)

| Check                                                                 | Result |
| --------------------------------------------------------------------- | ------ |
| Direct load of `/calendar?month=2026-11` — console errors/warnings, hydration warnings | None (`CONSOLE []`) |
| Next-month link → URL `?month=2026-12`, heading "December 2026"      | pass |
| Month select → `2026-03`; year select → `2025-03`, correct pill shown | pass |
| Browser back restores previous month                                  | pass |
| `?month=garbage` → current month (no redirect, no error)              | pass |
| Click a pill → `/recipes/<id>`                                        | pass |
| Soft-deleted recipe's checkout not shown                               | pass |
| Document `scrollWidth == clientWidth` at 1280 / 768 / 375 / 320 px     | pass |
| Screenshots reviewed at 1280 / 768 / 375; empty-month state            | Layout, truncation (single-line ellipsis), today marker, filler cells, "No recipes were made in August 2026." all as designed |

### First-render measurement (completes AC-37)

Synthetic library as in Phase 2 (2,000 recipes × 30 checkouts, ~5 KB text each), real IndexedDB, headless Chromium, 4 runs per cell. "grid at" = time from navigation start until the first `<tbody td>` exists (includes whole-app boot + hydration, not just the calendar). Compared against an **empty library** baseline with the same method.

| Build            | CPU   | Empty library (grid at, ms) | 2,000 × 30 library (grid at, ms) | Calendar-attributable (≈ difference) | Budget         |
| ---------------- | ----- | --------------------------- | -------------------------------- | ------------------------------------ | -------------- |
| `vite preview` (production build) | 1x | 118 – 201 | 170 – 282 (median ≈ 230) | ≈ 70 – 100 ms | 250 ms |
| `vite preview`   | 4x    | 260 – 273                   | 440 – 558                        | ≈ 190 – 290 ms                       | 600 ms         |
| `vite dev`       | 1x / 4x | n/m                       | 171 – 256 / 450 – 567            | n/m                                  | (not production) |

Notes: the one 282 ms production sample at 1x exceeds 250 ms **only if** app boot is counted against the calendar; the app's own boot is ≈ 120 – 200 ms of that. All 4x samples are under 600 ms. Run-to-run variance is large (~±50 ms).

**E1 trigger: NOT fired.** Store-level (Phase 2) and first-render numbers are within the budgets on the calendar-attributable measure. Caveat for the human: the budget text in the plan did not say whether app boot counts; on a strict "page load to grid" reading the 1x production median (≈ 230 ms) is within, but not far from, 250 ms. No E1/E2 code was written.

### Command evidence

| Command                                                                                            | Result |
| -------------------------------------------------------------------------------------------------- | ------ |
| `pnpm run test`                                                                                    | **pass** — 24 files / 222 tests passed, 1 skipped (the skipped boundary test, set by the human) |
| `pnpm exec vitest run --project client src/lib/ui/calendar`                                        | **pass** — 20/20 |
| `pnpm exec vitest run --project server src/lib/api/calendar src/lib/stores/calendar`               | **pass** — 68/68 |
| `pnpm exec eslint` on all calendar files                                                           | **pass** — clean |
| `pnpm exec prettier --check` on calendar paths                                                     | **pass** |
| `svelte-autofixer` on `+page.svelte`, `MonthGrid.svelte`, `MonthNav.svelte`                         | No issues. (Its "unused eslint-disable" suggestion on a draft of `MonthNav` was wrong — ESLint required it; superseded by inlining `resolve()` in `goto()`, after which no directive is needed.) |
| `pnpm run check`                                                                                   | Same 16 errors / 3 warnings in 9 files as before; **none in calendar files** |
| `pnpm run build`                                                                                   | **pass** |
| `pnpm run lint` (project-wide)                                                                     | Fails on **pre-existing** issues only: Prettier on `skills/system/run-workflow/SKILL.md` and `src/lib/api/cloud/last-opened-pending.test.ts`; 28 ESLint errors elsewhere (e.g. `suggestions/recipe/+page.svelte`). None in calendar files. |

Ran browsers/dev servers unsandboxed (Chromium cannot launch in the terminal sandbox). Temporary screenshot/measurement scripts and images were deleted.

### Deviations from plan

1. **Store envelope gained `month`** (see Files modified).
2. **`$app/stores` → `$app/state` + `toStore`.** Phase 2's note suggested `derived(page, …)` from `$app/stores`; that module is deprecated, so the route uses `page` from `$app/state` and `toStore`.
3. **Added `calendar.labels.ts`** (not in the file map) to hold `DateFormatter`-based labels per the human's note about `@internationalized/date`.
4. **Sidenav not yet linked** — Phase 4, as planned. Until then `/calendar` is reachable only by URL.

### Scope pressure / OPEN FINDING (needs a human decision)

**On viewports < 640 px the existing layout covers the left 57 px of every page with the collapsed side-rail, hiding the Sunday column of the calendar** (AC-16 not satisfied in the real app at 320 / 375 px, even though the grid itself fits the screen — the component tests pass because they render the grid in isolation).

- Evidence: at 375 px the screenshot shows only M–S columns; `.nav-container` is `w-0` on mobile but the `<aside>` branch in `src/routes/+layout.svelte` still renders (`absolute z-10 w-fit`, 57 px wide) when `vp.layout === 'mobile--collapsed'`. `/recipes` is clipped identically ("y Recipes", "n titles"), so this is a **pre-existing layout issue affecting all pages**, not calendar-specific.
- Probable fix (not applied; outside the calendar scope and touches all pages): do not render the rail for `mobile--collapsed` — each page's `AppBar` already provides a "Show navigation" button for mobile.
- Alternative (calendar-only workaround, not applied): add ~3.5 rem left padding below `sm`. Would double-offset if the layout is fixed later.

### Known gaps

- Default month (when `?month` is absent) and "today" use the runtime's local time zone; the server render shows only the loading state, so the only possible hydration difference is the heading/selects around a month boundary when server and browser zones differ. Not observed.
- ~~Pills are ~20 px tall~~ — **superseded: fixed to 24 px after the Tester's axe finding (see Remediation below).** The ADR-014 44 px target is still not met for pills (infeasible in a 7-column grid). Navigation controls use the standard `.button` sizes.
- No axe/Lighthouse run yet (AC-32 evidence is structural: roles, headings, labels, Tab order tests).
- 6-week months make the page taller than the viewport on short screens (vertical scroll, by design).

### Human decision recorded after Phase 3

The side-rail overlay below 640 px is an **accepted exception**: the layout is left as is (a layout overhaul is expected soon; phones are not a primary target — tablets and laptops are). No layout change and no calendar-specific padding workaround. AC-16 is waived for viewports < 640 px in the real app (see `acceptance-criteria.md`); the component-level fit at 320/375 px remains tested. The "Known gaps" entry above stands as documentation, not as a to-do.

## Phase 4 — Sidenav entry (complete)

### Files created

| Path                                                    | Purpose                                | Key decisions |
| ------------------------------------------------------- | -------------------------------------- | ------------- |
| `src/lib/ui/asidenav/asidenav.svelte.test.ts`           | COMP (client project), 5 tests         | Link target, label when expanded, accessible name when collapsed, focusability, `aria-current="page"` on `/calendar`, position after Recommendations. Mocks `$app/state` and (partially) `$app/navigation`. |
| `src/lib/ui/asidenav/__tests__/AsidenavHarness.svelte`  | Test harness                           | Supplies the `viewport` context (getter-backed, no `$effect`) and `Tooltip.Provider`. Mirrors the `routes/__tests__/PageHarness.svelte` pattern. |

### Files modified

| Path                                  | What changed | Why |
| ------------------------------------- | ------------ | --- |
| `src/lib/ui/asidenav/asidenav.svelte` | Added a "Calendar" `NavigationMenu.Link` (`CalendarIcon`, `href="/calendar"`) after "Recommendations"; `active` on `/calendar` (bits-ui sets `aria-current="page"`, styled with the same `data-[active]:bg-dark-10` as Recent recipes); `aria-label="Calendar"` **only when collapsed** (when expanded, the visible text is the name, per ADR-014 §6). | Phase 4 / AC-31. |

Not touched: `+layout.svelte`, sync/cloud, `db.ts`.

### Verification

- Real app (headless Chromium vs `vite dev`): clicking "Calendar" from `/recipes` navigates to `/calendar`, link gets `aria-current="page"`; collapsed link has `aria-label="Calendar"` and empty text; console clean. Screenshots (expanded + collapsed) reviewed: link sits under Recommendations with the active highlight in both states.
- `svelte-autofixer`: no issues on `asidenav.svelte` (extract of the changed block with its imports), `AsidenavHarness.svelte` (first draft's `$effect` assignment flagged → replaced with a getter, then clean).
- `pnpm run test`: **25 files / 227 passed, 1 skipped** (the human-skipped boundary test). `pnpm exec eslint` on touched paths: clean. `prettier --check` on touched paths: clean. `pnpm run check`: unchanged 16 errors / 3 warnings in 9 files, none in touched files.
- Temporary scripts and screenshots deleted.

### Deviations from plan

- Added `AsidenavHarness.svelte` and a sidenav test file (not in the file map; needed to cover AC-31).

### Known gaps

- Other nav items still have no accessible name when collapsed (e.g. "My Recipes"; "Recommendations" passes `ariaLabel` to an icon that does not apply it). Existing behaviour, left alone.
- The `/calendar` active check is an exact pathname match; it will not highlight if a base path or trailing slash is ever introduced.

## Phase 5 — Docs and validation sweep (complete)

### Files created

| Path                      | Purpose | Key decisions |
| ------------------------- | ------- | ------------- |
| `docs/calendar/README.md` | Feature design doc (required by ADR-012's "first PR" rule) | Envelope/offline table, URL contract, data-flow diagram, memory decisions, time-zone rules, states, a11y and known limitations (including the accepted phone-width exception), the A / E1 / E2 escalation ladder with triggers and **measured numbers**, module map, tests, out-of-scope. States explicitly that the calendar is local-only with no cloud table. |

### Files modified

| Path                                         | What changed | Why |
| -------------------------------------------- | ------------ | --- |
| `src/lib/api/calendar/README.md`             | Removed "added in a later phase" wording; linked the design doc; added `calendar.labels.ts` row and the fixed-locale rule. | Accuracy. |
| `README.md`                                  | One Documentation Map line linking `docs/calendar/README.md`. | README governance (links only). |
| `adrs/ADR-012-feature-roadmap-boundaries.md` | §A "Deeper design home" cell now links `docs/calendar/README.md`. **Status and decision text unchanged.** | AC-34; ADR-012 itself says the first PR updates this link. |

### Validation sweep

| Check | Result |
| ----- | ------ |
| `TZ=UTC`, `TZ=America/Los_Angeles`, `TZ=Pacific/Auckland` — `vitest --project server src/lib/api/calendar src/lib/stores/calendar` | **68/68 pass in each** (AC-24) |
| `pnpm run test` | **25 files / 227 passed, 1 skipped** (human-skipped boundary test) |
| `pnpm exec eslint` on all calendar/asidenav/route files | clean |
| `pnpm exec prettier --check` on calendar code, docs, README, ADR-012 | clean |
| `pnpm run check` | 16 errors / 3 warnings in 9 files — unchanged, **none in touched files** |
| `pnpm run build` | pass |
| Forbidden-import grep (cloud, server, openai, recommendations, `$lib/db`) over calendar code, non-test | none (AC-23) |
| Components import neither `checkoutIndexStore` nor `$lib/db` | none (AC-26) |
| New/changed files under `src/routes/api/**`, `src/lib/db.ts`, `src/lib/api/cloud/**`, `src/routes/+layout.svelte`, Supabase | none (AC-23, AC-25) |
| `new Date(` / `toISOString` in calendar code | only `new Date(0)` (epoch seed) and prose in comments/README (AC-24) |
| Tracked-file diff | `README.md` +1, `ADR-012` ±1 line, `asidenav.svelte` +15 (plus the human's `import-url-boundary.test.ts`, not mine) |
| **Offline / logged-out run** (production build, headless Chromium, seeded IndexedDB) | Logged-out load made **0** fetch/xhr/external requests (53 total, all same-origin static assets). With the browser set **offline**: Next month, month/year selects, and Today all worked and showed the right recipes; **0** fetch/xhr/external requests while navigating (AC-20, AC-21). |

Temporary scripts removed; no dev/preview servers left running.

### Acceptance criteria — builder evidence for the Tester

| AC | Evidence | Status |
| -- | -------- | ------ |
| AC-01–AC-06 | `calendar.model.test.ts` | covered |
| AC-07–AC-10 | `calendar.model.test.ts`; AC-10 restore also in `calendar.svelte.test.ts` (real Dexie) | covered |
| AC-11 | `calendar.test.ts` (envelope) + `calendar.svelte.test.ts` (live update) | covered |
| AC-12–AC-15 | `MonthGrid.svelte.test.ts`; real-app run | covered |
| AC-16 | Component tests at 320–1920 px; real-app overflow check at 1280/768/375/320 | **waived <640 px in the real app by human decision**; component-level fit covered |
| AC-17 | `MonthGrid.svelte.test.ts` (busy day grows, nothing clipped) | covered |
| AC-18, AC-19 | `MonthNav.svelte.test.ts`; real-app next/select/back/Today | covered |
| AC-20, AC-21 | Offline + logged-out run above | covered (manual, scripted) |
| AC-22 | States rendered in real app (empty month, loading); direct load of `?month=` with clean console | covered; error state not exercised in a browser (store error covered in unit tests) |
| AC-23, AC-24, AC-25, AC-26 | Greps/diffs above; three-TZ unit runs | covered |
| AC-27 | Perf numbers + "E1 trigger: not fired" recorded here (Phases 2–3) and in `docs/calendar/README.md`; no E1/E2 code | covered |
| AC-28, AC-29, AC-30 | E1/E2 not built | **N/A** |
| AC-31 | `asidenav.svelte.test.ts`; real-app click-through, expanded + collapsed | covered |
| AC-32 | Structural component tests (roles, caption, headers, `time`, labels, Tab order); screenshots | **partial** — no axe/Lighthouse or screen-reader pass; 44 px touch targets not met for pills (documented) |
| AC-33 | See `test-matrix.md`; Tester to complete | Tester |
| AC-34 | `docs/calendar/README.md`, module README, root README line, ADR-012 §A link; ADR-012 status/decision text unchanged | covered |
| AC-35 | `calendar.test.ts` (12 month changes, one `toArray`); `calendar.svelte.test.ts` (no loading flash); first-render run | covered |
| AC-36 | `calendar.model.test.ts` (shared entry objects, month slice, 60k-date smoke) | covered |
| AC-37 | Phase 2 and Phase 3 measurement tables | covered |

### Deviations from plan (whole run)

1. `calendarMonthStore` takes `Readable<CalendarMonth>` and its envelope also carries `month` (Phases 2–3).
2. `$app/state` + `toStore` instead of `$app/stores` (deprecated).
3. Added `calendar.labels.ts`, a real-Dexie client test, and an `AsidenavHarness` test file (none in the original file map).
4. AC-16 waived below 640 px (human decision).

### Known gaps (consolidated)

- ~~No axe/Lighthouse run; pills are below the 44 px touch-target guideline.~~ Superseded: axe run by Tester; pills now meet the 24 px AA minimum (see Remediation). Lighthouse and screen-reader passes are still not done.
- Phone-width layout issue is pre-existing, app-wide, and accepted.
- First-render budget ambiguity (app boot counted or not) — noted in the design doc; verdict "not fired" holds on the calendar-attributable measure.
- Real-Dexie and browser tests need Playwright Chromium and, in the agent terminal, an unsandboxed run.
- Project-wide `pnpm run lint` and `pnpm run check` still fail on issues outside this change (e.g. Prettier on `last-opened-pending.test.ts`, ESLint in `suggestions/recipe/+page.svelte`).

### Unresolved open questions

| Plan question | Outcome |
| ------------- | ------- |
| Q8 | Deferred — no storage repair of legacy entries; calendar normalizes on read. |
| Q9 | Deferred — no ADR-012 amendment drafted (not requested). |
| Q10 | Budgets applied as proposed; verdict recorded. |


## Remediation — DEF-1 (after Test stage)

**Defect (from `test-report.md`):** axe `target-size` (serious; WCAG 2.2 AA 2.5.8, 24 px minimum) — recipe pills were 20 px tall.

### Files modified

| Path | What changed | Why |
| ---- | ------------ | --- |
| `src/lib/ui/calendar/MonthGrid.svelte` | Pill padding `py-0.5` → `py-1` (16 px line-height + 8 px = 24 px). Nothing else. | DEF-1. |
| `src/lib/ui/calendar/MonthGrid.svelte.test.ts` | Removed the `it.fails` defect pin; replaced with a permanent regression test `every recipe pill is at least 24px tall at a %ipx viewport` (320 / 768 / 1280). | The pin went red when the fix landed (confirmed before replacing it), as designed. |
| `docs/calendar/README.md` | "Known limitations" now states 24 px pills, the 44 px caveat, and the axe result. | Accuracy. |

### Verification

- With the fix and the old `it.fails` test still in place, that test **failed** ("expected fail" now passing) — confirming the fix worked before the test was converted.
- Rebuilt production bundle; axe-core 4.14 (temp dir, no project dependency), `<main>` only, seeded month incl. a busy 5-pill day: **0 violations** at 1280 (nav expanded), 1280 (collapsed), 768, and 1024. Every pill measured **exactly 24 px**; horizontal overflow 0 px at all four widths. Screenshot reviewed: pills slightly roomier, rows still grow for busy days, no clipping.
- `pnpm run test`: **28 files / 253 passed, 1 skipped** (human-skipped boundary test); no expected-fail left. ESLint and Prettier clean on touched paths; `svelte-autofixer` clean on `MonthGrid.svelte`; `pnpm run check` unchanged at 16 errors / 3 warnings, none in touched files.
- Temporary script, screenshot, and `/tmp` axe install removed.

### Deviations / scope pressure

None. The layout tests that bound pill height to "one line + padding" continue to pass unchanged (the padding term grew with the fix).
