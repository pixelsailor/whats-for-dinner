# Plan — calendar-page

Status: **REVISED after human review of D1 — awaiting final go-ahead.** D1 is resolved as **"A first; escalate only if measurement shows a need"** (see below). All other defaults in Open questions were accepted by the human.

## Objective restatement

A `/calendar` route renders one month at a time as a classic grid (weekday names across the top, every day numbered), lists the recipes made on each day (from `SavedRecipe.checkout_history`) as single-line, truncated pills that link to `/recipes/{id}`, adapts to any viewport width, and offers navigation to move between months and pick a month and year — as a normal page (no dialogs/popovers for content), working offline and anonymously, with no Supabase/cloud table added.

## Risk and phase strategy

| Field          | Value                                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manifest tier  | **medium** — new route + nav entry; read-path design with a defined escalation ladder; a11y/responsive UI                                                                    |
| Phase count    | **5** core phases (+ escalation steps E1/E2, **not built unless triggered**)                                                                                                 |
| Skipped stages | None — full pipeline (Planner → Builder → Tester → Validator)                                                                                                                |
| Change budget  | New files under `src/lib/api/calendar/`, `src/lib/stores/calendar.ts`, `src/lib/ui/calendar/`, `src/routes/calendar/`, `docs/calendar/`; one edit to `asidenav.svelte`. No `db.ts` change in the core phases. |

### Decision D1 — RESOLVED: start with A, measure, escalate only if needed

Human direction: use a dedicated Dexie table (B) **only if it brings a real memory/performance benefit**; if A is simpler, implement A first and move up only if A proves insufficient. ADR-012 is treated as a "don't paint yourself into a corner" guardrail, not a hard ban — but because A complies with it anyway, no ADR change is needed to proceed.

**Why A is sufficient (findings from the codebase):**

- The root layout permanently subscribes `recentlyOpenedStore`, whose `liveQuery` runs `db.recipes.toArray()` after **every** write to `recipes` — including every recipe open (`markLastOpenedLocally`). The app already pays a full-table read on every write, app-wide, regardless of what the calendar does. A calendar table would not remove that cost.
- While `/calendar` is mounted, writes to `recipes` are rare (sync downloads, edits in another tab); clicking a pill navigates away and unsubscribes the calendar store. Re-indexing frequency is therefore very low.
- The only calendar-specific cost is one extra full read on page open (the same read `/recipes` and `/recommendations` already do) plus one O(total checkouts) pass.
- A table (B) adds: ~11 write sites to keep in sync (routes, `SyncService` `put`/`bulkPut`/`update`, trash, edit), a Dexie migration/backfill, a sync-time rebuild (anonymous users never sync, so backfill-on-upgrade is mandatory anyway), plus drift risk. Its only upside is an indexed month query that avoids reading all recipes.

**"How and when" decisions for A (binding on the Builder):**

| Question                         | Decision                                                                                                                                                                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **When is data read?**           | Lazily, only while `/calendar` is mounted. `readable`/`liveQuery` stores start on first subscribe and stop on last unsubscribe — no layout-level or app-start work, no caching in Dexie/localStorage.                                                                   |
| **How often is it rebuilt?**     | **Once per change to `recipes`, not per month navigation.** The index covers all history; month navigation (prev/next/selects/URL) is a pure in-memory slice with no Dexie access.                                                                                       |
| **What stays in memory?**        | Not recipe documents. The store's query function builds the index **inside** the `liveQuery` callback and returns only the slim index, so ingredient/instruction payloads are garbage-collected immediately. Does **not** derive from `unsortedRecipesStore` (which would retain full recipe arrays for the page's lifetime). A dedicated query is justified under `local-data-dexie-ownership.mdc` ("unless profiling shows a separate query is required"; here the justification is memory). |
| **Index shape**                  | `Map<isoDate, CalendarRecipeEntry[]>` where **one `{ id, title }` object is created per recipe and shared by reference** across all its dates (memory ≈ one pointer per checkout). Per-recipe `Set` dedupes repeated dates during the build.                            |
| **Sorting**                      | Not done at build time. Only the visible month's ≤31 day-lists are sorted (title `localeCompare`, then `id`) when sliced.                                                                                                                                              |
| **Delivery to the UI**           | UI never sees the full index. It consumes a **month-scoped store contract** (`calendarMonthStore(month)`, below). This is the seam: escalation steps swap the implementation behind it without touching components.                                                     |

**Escalation ladder (do not build unless a trigger fires):**

| Step   | What                                                                                                                                                                                                                                                                                                                              | Trigger (proposed budgets — human may adjust)                                                                                                                                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A**  | Full-table read → slim index in memory (core phases).                                                                                                                                                                                                                                                                             | Default.                                                                                                                                                                                                                                                                                          |
| **E1** | **Multi-entry index, no new table.** `version(4)` adds `*checkout_history` to the `recipes` index list. Month read becomes `db.recipes.where('checkout_history').between('YYYY-MM-01', nextMonthStart, true, false)` (+ `.distinct()`), loading only recipes made that month; earliest year via `orderBy('checkout_history').limit(1).keys()` (no documents loaded). IndexedDB maintains the index on every write path — **no hooks, no backfill code, no drift, no sync step** (Dexie re-indexes existing rows on upgrade; verify). | Measured on a synthetic library of **2,000 recipes × ~30 checkouts each**: calendar first-render **> 250 ms** on desktop or **> 600 ms** with 4× CPU throttle, **or** `toArray()` + index build **> 100 ms** at that size, **or** retained heap for the store **> ~10 MB**. |
| **E2** | **Dedicated `recipe_checkouts` table** (`[recipe_id+date], date`), kept in sync via Dexie hooks, backfilled in the upgrade, rebuilt after sync. Full spec retained at the bottom of this plan.                                                                                                                                      | Only if E1 is implemented and **still** misses the budgets above, or a product need arises that an index cannot serve (e.g. per-day metadata such as notes/ratings per checkout). Requires a Proposed ADR amendment that the human accepts.                                                       |

Note for E1/E2: a non-ISO legacy `checkout_history` entry that does not start with `YYYY-MM-DD` would be invisible to an index range query, whereas A normalises everything via `toIsoDate`. If E1/E2 is ever built, its Dexie upgrade must first normalise `checkout_history` (reuse `normalizeCheckoutHistory`) — see Risks.

## Scope boundary

### In scope

- New route `/calendar` (month view), month from the URL: `?month=YYYY-MM` (invalid/missing → current month in the local time zone).
- Month grid: weekday header row, numbered days, today highlighted, blank filler cells for days outside the month; Sunday-first.
- Per-day recipe pills (single line, truncated, full title via `title` and accessible name), each a real link to the recipe page.
- Navigation: previous, next, "Today", month selector, year selector.
- Sidenav entry "Calendar" (existing `CalendarIcon`).
- Loading, error, empty-month, and never-made-anything states.
- Pure model + Zod schemas; a month-scoped store seam; unit + component tests; a **perf smoke test and recorded measurement** that decides whether escalation is needed.
- Feature design doc `docs/calendar/README.md` and a one-line Documentation Map entry.

### Out of scope

- E1/E2 implementation (unless a trigger fires and the human approves).
- Editing/adding/removing checkout dates from the calendar (display-only).
- Day-detail pages/popups, drag-and-drop, week/agenda views, print/export.
- Meal planner / future-date planning (ADR-012 §D).
- Any Supabase table, API route (`src/routes/api/**`), server module, or `$lib/api/cloud` import from calendar code.
- Changing `checkout_history` semantics, the recipe detail page, recommendations (ADR-009).
- Migrating legacy non-ISO `checkout_history` entries in storage (the recipe detail page already has a mini-migration); the calendar normalises on read and never writes.
- Calendar sharing; i18n beyond `Intl` month/weekday names.

## Phases

| Phase | Goal                                             | Done when                                                                                     |
| ----- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 1     | Pure calendar model, schema, types               | AC-01–AC-09, AC-24 unit-tested; `pnpm run check` clean for new files                          |
| 2     | Slim-index store + month-scoped seam + perf check | AC-10, AC-11, AC-25, AC-26, AC-27; perf measurement recorded in `build-log.md`               |
| 3     | `/calendar` route + grid + nav UI                | AC-12–AC-22, AC-32 verifiable in browser; component test green                                |
| 4     | Sidenav entry                                    | AC-31                                                                                         |
| 5     | Docs + validation sweep                          | AC-23, AC-33, AC-34; lint/check/test per Validation commands; escalation decision recorded    |

### Phase 1 — Pure model, schema, types

- **Deliverables:** Month-param schema; month arithmetic; index builder; month slice; month-grid builder; year-range helper. All pure — no Dexie/DOM.
- **Files touched:** `src/lib/api/calendar/*`.
- **Dependencies:** None. Reuses `toIsoDate`, `isoDateToday` from `$lib/api/recipe` (do not re-implement date parsing).

### Phase 2 — Slim-index store, month-scoped seam, perf check

- **Deliverables:**
  - `checkoutIndexStore`: `createLiveQueryStore(async () => buildCheckoutIndex(await db.recipes.toArray()))` — index is built inside the query function (see "How and when" table).
  - `calendarMonthStore(month)`: a `derived` store over `checkoutIndexStore` returning `CalendarMonthData` for that month only. Components use **only** this.
  - Perf check: a synthetic-library benchmark (2,000 recipes × ~30 checkouts, realistic recipe bodies for the read test) recording: `toArray()` time, `buildCheckoutIndex` time, month-slice time, approximate retained heap (DevTools heap snapshot / `performance.memory` in Chromium), and first-render time at 4× CPU throttle. Results go in `build-log.md` with an explicit **"E1 trigger: fired / not fired"** line.
  - A unit-level smoke test with a generous ceiling (e.g. 60,000 dates in < 500 ms in Node) purely to catch accidental O(n²) — not a perf budget.
- **Files touched:** `src/lib/stores/calendar.ts`, tests.
- **Dependencies:** Phase 1. `db` access stays in the store layer (no `db.*` in routes/components).

### Phase 3 — Route and UI

- **Deliverables:** `/calendar` page with `PageHeader`/`AppBar` (`h1` "Calendar"), month heading (`h2`), `MonthNav`, `MonthGrid`; all states; responsive behaviour per "UI specification".
- **Files touched:** `src/routes/calendar/+page.svelte`, `src/lib/ui/calendar/MonthGrid.svelte`, `src/lib/ui/calendar/MonthNav.svelte`, `src/lib/ui/calendar/*.svelte.test.ts`.
- **Dependencies:** Phases 1–2.

### Phase 4 — Sidenav entry

- **Deliverables:** "Calendar" `NavigationMenu.Link` with `CalendarIcon` after "Recommendations", in expanded and collapsed nav (label hidden when collapsed, accessible name retained).
- **Files touched:** `src/lib/ui/asidenav/asidenav.svelte`.
- **Dependencies:** Phase 3.

### Phase 5 — Docs and validation sweep

- **Deliverables:** `docs/calendar/README.md` (envelope summary, D1 outcome and escalation ladder with triggers and measured numbers, URL contract, time-zone rule, states, "local-only, no sync" statement), `src/lib/api/calendar/README.md`, Documentation Map line in root `README.md`, ADR-012 §A "Deeper design home" link. Run validation commands.
- **Dependencies:** Phases 1–4.

## Component/file map

| Path                                             | Action              | Purpose                                                                                                               |
| ------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/lib/api/calendar/calendar.schemas.ts`       | create              | Zod `.strict()` schemas: month param, `CalendarRecipeEntry`, `CalendarMonthData`.                                      |
| `src/lib/api/calendar/calendar.types.ts`         | create              | `z.infer` re-exports + `CheckoutIndex` alias.                                                                         |
| `src/lib/api/calendar/calendar.model.ts`         | create              | Pure functions (see contracts).                                                                                       |
| `src/lib/api/calendar/calendar.model.test.ts`    | create              | UNIT tests incl. perf smoke.                                                                                          |
| `src/lib/api/calendar/index.ts`                  | create              | Barrel, matches `src/lib/api/recipe/index.ts`.                                                                        |
| `src/lib/api/calendar/README.md`                 | create              | Module doc (api layer convention).                                                                                    |
| `src/lib/stores/calendar.ts`                     | create              | `checkoutIndexStore` (slim, dedicated `liveQuery`) + `calendarMonthStore(month)`.                                     |
| `src/lib/ui/calendar/MonthGrid.svelte`           | create              | Semantic `<table>` month grid + pills.                                                                                |
| `src/lib/ui/calendar/MonthNav.svelte`            | create              | Prev/next/today links + month/year `<select>`s.                                                                       |
| `src/lib/ui/calendar/MonthGrid.svelte.test.ts`   | create              | COMP tests (browser project).                                                                                         |
| `src/routes/calendar/+page.svelte`               | create              | Route: parse `page.url.searchParams`, wire store → grid, states.                                                      |
| `src/lib/ui/asidenav/asidenav.svelte`            | modify              | Add "Calendar" link after "Recommendations".                                                                          |
| `docs/calendar/README.md`                        | create              | Feature design doc.                                                                                                   |
| `README.md`                                      | modify (1 line)     | Documentation Map link only.                                                                                          |
| `adrs/ADR-012-feature-roadmap-boundaries.md`     | modify (notes only) | Link design doc in §A. Status/decision text unchanged.                                                                |
| _(E1 only)_ `src/lib/db.ts`                      | modify              | `version(4)` adding `*checkout_history` index (+ normalising upgrade).                                                |
| _(E1 only)_ `src/lib/stores/calendar.ts`         | modify              | Replace store internals behind `calendarMonthStore`; UI untouched.                                                    |
| _(E2 only)_ `src/lib/db.ts`, `sync.service.ts`, new Proposed ADR | modify/create | See "Conditional design: E2".                                                                                         |

## Interface contracts

### Timezone and date rule (all phases)

`checkout_history` values are calendar dates (`YYYY-MM-DD`), not instants. **Never** build days with `new Date('YYYY-MM-DD')` or compare via `toISOString()` (UTC parsing shifts days in negative-offset zones). Do date math on integers or `Date.UTC(...)` + `getUTC*`. "Today" is `isoDateToday()` (local zone). Month/weekday names: `Intl.DateTimeFormat(locale, { timeZone: 'UTC' })` on a `Date.UTC(...)` value.

### `calendar.schemas.ts`

```ts
// ?month=YYYY-MM
export const CalendarMonthParamSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const CalendarRecipeEntrySchema = z.strictObject({
  id: z.uuid(),
  title: z.string()
});

export const CalendarMonthDataSchema = z.strictObject({
  /** ISO date -> entries for days in the requested month only; sorted (title, then id). */
  days: z.map(z.iso.date(), z.array(CalendarRecipeEntrySchema)),
  /** Earliest year that has any checkout, or null when none exist. Drives the year selector. */
  earliestYear: z.number().int().nullable()
});
```

### `calendar.model.ts` (pure; all unit-tested)

```ts
type CalendarMonth = { year: number; month: number }; // month 1-12

parseCalendarMonthParam(raw: string | null, fallback: CalendarMonth): CalendarMonth;
formatCalendarMonthParam(m: CalendarMonth): string;             // 'YYYY-MM'
shiftCalendarMonth(m: CalendarMonth, delta: number): CalendarMonth;
getCurrentCalendarMonth(todayIso?: string): CalendarMonth;      // from isoDateToday()

/** Whole-history index. Unsorted; one shared {id,title} object per recipe; per-recipe dedupe of dates. */
buildCheckoutIndex(recipes: readonly SavedRecipe[]): Map<string, CalendarRecipeEntry[]>;

/** Slice one month out of the index; sorts only those days; computes earliestYear from index keys. */
selectCalendarMonth(index: ReadonlyMap<string, CalendarRecipeEntry[]>, m: CalendarMonth): CalendarMonthData;

type CalendarCell =
  | { kind: 'filler' }
  | { kind: 'day'; day: number; iso: string; isToday: boolean; entries: CalendarRecipeEntry[] };
/** Weeks of exactly 7 cells; `weekStart` default 0 (Sunday). */
buildMonthGrid(m: CalendarMonth, data: CalendarMonthData, opts?: { todayIso?: string; weekStart?: 0 | 1 }): CalendarCell[][];

/** Inclusive years for the year <select>: earliestYear (or current) .. current year, always including the viewed year. */
getCalendarYearRange(earliestYear: number | null, viewed: CalendarMonth, todayIso?: string): number[];
```

`buildCheckoutIndex` rules:

- Include only recipes where `!deleted_at && is_current` (same predicate as `recipesStore`). Do **not** import `isActiveRecipe` from `$lib/api/cloud`.
- Normalise each history entry with `toIsoDate`; skip `null`/unparseable; handle `null`/`undefined`/`[]` histories.
- A recipe repeated on the same date yields **one** entry for that date.
- No time-of-day ordering exists; never use position in `checkout_history` as an ordering signal.

### `src/lib/stores/calendar.ts` — the seam

```ts
/** Internal. One liveQuery; builds the slim index inside the query fn. */
export const checkoutIndexStore: Readable<{
  data: Map<string, CalendarRecipeEntry[]> | null;
  loading: boolean;
  error: Error | null;
}>;

/** Public. The only thing components import. */
export function calendarMonthStore(month: Readable<CalendarMonth>): Readable<{
  data: CalendarMonthData | null;
  loading: boolean;
  error: Error | null;
}>; // A: derived(checkoutIndexStore, selectCalendarMonth). E1/E2: replaced internals, same contract.
```

**Amended in Phase 2:** the parameter is a `Readable<CalendarMonth>`, not a plain value. Svelte 5 unsubscribes the previous `$store` before subscribing to its replacement, so creating a new store per month would drop the subscriber count to zero, stop the `liveQuery`, and re-read Dexie with a loading flash. The route creates `calendarMonthStore(month$)` **once**, where `month$ = derived(page, …)` from `$app/stores` parses `?month=` (no `$effect` bridge needed). Verified by AC-35.

### Route contract

- URL: `/calendar?month=YYYY-MM`; the URL is the source of truth for the visible month. Missing/invalid → current month, **without** redirect.
- `MonthNav` props: `{ month: CalendarMonth; years: number[] }`. Prev/next/Today are real `<a href>` (existing `Button href` / `resolve()` pattern — follow `src/routes/recipes/+page.svelte`, including its `svelte/no-navigation-without-resolve` handling). Month/year are native `<select>`s whose `onchange` calls `goto` with the new `?month=`; each has a visible or `sr-only` label.
- `MonthGrid` props: `{ weeks: CalendarCell[][]; monthLabel: string }`.

### UI specification

Structure (ADR-014): one `h1` ("Calendar" via `AppBar.Text`), month heading `h2` (e.g. "November 2026", `aria-live="polite"`), then a semantic `<table>`:

- `<caption class="sr-only">` = month label; `<th scope="col">` per weekday with full name exposed (`abbr`/`sr-only`), short label visually (3 letters ≥ `sm`, 1 letter below).
- One `<td>` per cell; day number in `<time datetime="YYYY-MM-DD">`. Today: visible non-colour-only marker + `aria-current="date"`. Filler cells are empty `<td>`.
- Recipes: `<ul>` of `<li><a href="/recipes/{id}" title="{full title}" class="block truncate whitespace-nowrap …">{title}</a></li>`. Reuse `.tag` / `.tag.subtle` (`src/styles/ui.css`) where they fit; keep a usable touch height.

Responsive (grid always fits the width; no horizontal scroll):

- `table-fixed w-full`; `min-w-0 overflow-hidden` on cells so truncation works; seven equal columns at every width.
- Row height `auto` with a sensible `min-height`; **all** recipes for a day are always shown (no "+N more"). Busy days make their row taller; the page scrolls vertically inside `<main>`.
- Below `sm`: smaller day number/pill text and tighter padding; pills stay one line and truncated (very short visible text is expected; `title`/accessible name carries the rest).
- Chrome: follow other pages (`mx-auto … px-4 py-8 lg:px-8`) but allow a wider max width than `max-w-5xl`; Builder records the chosen value in `build-log.md`.
- No animated transitions on month change (respects `prefers-reduced-motion`).

States (ADR-016 envelope):

| State             | Behaviour                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| loading           | `ProgressSpinner` centred (as `/recipes`); nav controls still render.                                              |
| error             | `error.name` / `error.message` in the same style as `/recipes`; no grid.                                           |
| month empty       | Grid still renders; polite status line "No recipes were made in {Month YYYY}."                                    |
| nothing ever made | Same grid plus helper text linking to `/recipes`; wording at Builder discretion, must not mislead.                |

Offline / anonymous / AI-disabled: no network, session, Supabase, or AI is consulted; fully functional logged-out and offline; no server load function or API route.

### Conditional design: E1 (multi-entry index) — only if triggered

- `src/lib/db.ts`: `this.version(4).stores({ recipes: '<existing v3 index list>, *checkout_history', suggestions: …, prompt_requests: … })`. Include an `.upgrade()` that runs `normalizeCheckoutHistory` over rows with non-canonical entries (so legacy values are indexable). Spike first: confirm on Dexie 4.4.7 that adding a multiEntry index re-indexes existing rows on upgrade and that `where('checkout_history').between(...)` + `.distinct()` and `orderBy('checkout_history').limit(1).keys()` behave as expected against real IndexedDB (browser project / manual).
- Month query returns recipes (not rows); build entries only for dates within the month; keep the same filtering (`!deleted_at && is_current`) and sorting. UI and `calendarMonthStore` contract unchanged.
- Cloud: none. No sync step is needed — the index is maintained by IndexedDB on every write path, including `SyncService.bulkPut`.
- Requires a short human-accepted note recording that ADR-012 §A's "no new Dexie table" is not violated (index, not table) — or, if the human prefers, a one-line amendment.

### Conditional design: E2 (dedicated table) — only if E1 was built and is insufficient

- Schema (`.strict()`, Zod first, ADR-008): `RecipeCheckoutSchema = z.strictObject({ recipe_id: z.uuid(), date: z.iso.date() })`; Dexie `recipe_checkouts: '[recipe_id+date], date'`; store only ids and dates (never titles — they go stale); join to `recipes` at read time inside one `liveQuery`.
- Keep rows in sync centrally with Dexie `recipes` hooks in `db.ts` (spike: second-table writes in the hook transaction); fallback is a reconcile helper at every write site — report before building.
- Initialisation: (1) `version(N).upgrade()` backfill (idempotent; covers anonymous users); (2) idempotent `rebuildRecipeCheckouts()` after sync completion, including the first-sync path (`SyncService.downloadRecipes` / `+layout.svelte` `finishSync()`), as a safety net.
- Local-only: not in `SyncService`, not in Supabase, stated in `docs/calendar/README.md`. Needs a Proposed ADR amendment accepted by the human; parity test "table == derive(recipes)" on random data.

## ADR references

Only **Accepted** ADRs apply.

- **ADR-001 (operating model):** Calendar works offline and anonymously; no mandatory auth, network, or AI (AC-20/21).
- **ADR-002 (local data ownership):** Dexie stays system of record; `checkout_history` on the recipe is the durable data; UI reads through Dexie-backed stores, not `db.*` in components. The dedicated slim `liveQuery` is a documented exception to "prefer derived over duplicate liveQuery" (memory justification).
- **ADR-005 (sync):** No new sync semantics; calendar displays what sync already merged. E1/E2 never sync derived structures.
- **ADR-008 (schema-led):** Month param and view-model shapes get Zod `.strict()` schemas under `src/lib/api/calendar/`; types via `z.infer`.
- **ADR-009 (recommendations inputs):** Read-only display of the same field; must not import `$lib/recommendations` (AC-23).
- **ADR-012 §A (Calendar envelope):** Human has stated it is a guardrail ("don't paint into a corner"), not a hard rule. Core phases comply fully (no new table, client-only, no API route/cloud/AI; design doc at `docs/calendar/README.md`). The `calendarMonthStore` seam is the "no rewrite later" provision; E1/E2 are pre-designed upgrade paths. If E1/E2 is built, record it in ADR-012's notes (human accepts).
- **ADR-013 (bits-ui):** Native `<select>`/`<a>`/`<table>` chosen for accessibility (ADR-014 native-first); no bits-ui primitive needed.
- **ADR-014 (semantic HTML/a11y):** Semantic table, one `h1`, ordered headings, real `href`s, keyboard operable, visible focus, ≥44 px touch targets where feasible, non-colour-only "today".
- **ADR-015 (JS runtime/PE):** Data needs JS (Dexie); navigation still uses real URLs/links so it degrades well and is shareable.
- **ADR-016 (data flow):** Dexie store with `{ data, loading, error }`; no TanStack Query; no `$effect`+fetch.

## Validation commands

| Step                    | Owner               | Command or check                                                                                | Pass criteria                                                           |
| ----------------------- | ------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Format                  | Builder             | `pnpm run format`                                                                               | Clean                                                                   |
| Lint / types            | Builder / Validator | `pnpm run lint`, `pnpm run check`                                                               | No **new** errors in touched paths (note pre-existing ones)             |
| Calendar unit tests     | Test                | `pnpm exec vitest run --project server src/lib/api/calendar`                                    | AC-01–AC-11, AC-24, AC-36 covered                                       |
| Component tests         | Test                | `pnpm exec vitest run --project client src/lib/ui/calendar`                                     | AC-12–AC-15, AC-18, AC-19, AC-22, AC-32 covered (needs Playwright)      |
| Full suite              | Test                | `pnpm run test`                                                                                 | No new failures; pre-existing ones reported, not "fixed"                |
| Offline / anonymous     | Test / Validator    | Dev server, no session, DevTools offline: open `/calendar`, change months/years, click a pill   | AC-20, AC-21                                                            |
| No re-query on nav      | Test / Validator    | DevTools/Dexie logging or a counter in a test double: navigate 12 months                         | AC-35: zero additional `recipes` reads after the first                  |
| Perf measurement        | Builder (record) / Validator (review) | Synthetic 2,000 × ~30 library, 4× CPU throttle; numbers in `build-log.md`            | AC-37: numbers recorded + E1 trigger verdict                            |
| Responsive manual QA    | Human / Validator   | Widths 320, 375, 768, 1280, 1920 px; sidenav expanded/collapsed                                 | AC-14, AC-16, AC-17: no horizontal scroll, one-line truncated pills     |
| Timezone check          | Test                | Unit tests under `TZ=America/Los_Angeles`, `TZ=UTC`, `TZ=Pacific/Auckland`                      | AC-24                                                                   |
| Checklist rows          | Validator           | `docs/validation-checklist.md` offline/schema/a11y rows                                         | Rows cited in `validation-report.md`                                    |

## Risks

| Risk                                                                                         | Likelihood | Impact | Mitigation                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A is slower/heavier than expected on large libraries or low-end phones                      | low        | med    | Measured in Phase 2 against explicit budgets; seam + E1 pre-designed; escalation needs only `db.ts` + store internals.                       |
| Calendar re-queries Dexie on every month change (jank, wasted reads)                        | med        | med    | Single shared `checkoutIndexStore`; AC-35 verifies no reads on navigation.                                                                  |
| Calendar page retains full recipe documents in memory                                       | med        | med    | Index built inside the query fn; do not derive from `unsortedRecipesStore`; heap snapshot in perf check.                                    |
| Off-by-one days from `new Date('YYYY-MM-DD')`                                               | high       | high   | Timezone rule; AC-24 under three `TZ` values.                                                                                               |
| Legacy non-ISO entries mis-bucketed (A) or invisible to an index (E1/E2)                    | med        | med    | A: normalise via `toIsoDate`, skip unparseable. E1/E2: normalising upgrade step + tests with legacy fixtures.                                |
| Truncation not working in table cells (missing `min-w-0`/`table-fixed`)                     | high       | med    | Spec mandates `table-fixed`; COMP + manual 320 px check (AC-14, AC-16).                                                                      |
| Very busy day makes tall rows                                                               | low        | low    | Accepted trade-off (no popups); vertical page scroll.                                                                                       |
| SSR render of Dexie-backed store                                                            | low        | med    | Same pattern as `/recipes`; verify direct load of `/calendar?month=…` has no hydration/console errors (AC-22).                               |
| ESLint `svelte/no-navigation-without-resolve` on query-string links                         | med        | low    | Follow `/recipes` precedent (`resolve()` + documented disable where needed).                                                                |
| Premature optimisation creeps in (hooks/tables built "just in case")                         | med        | med    | AC-25 forbids `db.ts`/table changes in core phases; escalation requires a recorded trigger and human approval.                               |
| Project-wide lint/check/test already failing (seen in earlier runs)                         | med        | low    | Judge touched paths only; list pre-existing failures.                                                                                       |

## Rollback

- **Code:** Revert the calendar commit(s); deleting `src/routes/calendar/`, `src/lib/ui/calendar/`, `src/lib/api/calendar/`, `src/lib/stores/calendar.ts`, `docs/calendar/` and the `asidenav.svelte`/`README.md` lines fully removes the feature; nothing else imports them.
- **Data / Dexie:** Core phases: none (no schema/data change). E1: Dexie cannot downgrade in place; a later `version(5)` simply omits the `*checkout_history` index (index only — no data lost). E2: a later version sets `recipe_checkouts: null` to drop the table (derived data — no user data lost).
- **Config / env:** None.

## Open questions

Resolved by the human: D1 (A first, escalate on measurement) and Q2–Q7 defaults (soft-deleted hidden, Sunday-first, blank filler cells, year select earliest→current + viewed year, nav link after Recommendations, content-height rows with page scroll).

- [ ] **Q8 (informational):** Recipes with legacy non-ISO `checkout_history` entries are only repaired when their detail page is opened; the calendar reads them via `toIsoDate` without writing. _(No repair added — out of scope.)_
- [ ] **Q9 (optional):** Should a short Proposed amendment to ADR-012 §A be drafted stating its intent as a guardrail ("start derived; indexes/tables permitted when justified by measurement")? _(Not in this task unless you ask.)_
- [ ] **Q10:** Are the proposed escalation budgets acceptable (first render > 250 ms desktop / > 600 ms at 4× throttle, `toArray()` + index build > 100 ms, retained heap > ~10 MB, at 2,000 recipes × ~30 checkouts)? _(Yes — they are the Builder's measuring stick; adjust if you have different targets.)_
