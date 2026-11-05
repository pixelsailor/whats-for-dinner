# Validation report — calendar-page

Validator run after Builder (Phases 1–5 + DEF-1 remediation) and Tester. Nothing in the application was changed by the Validator; two throwaway probes and browser scripts were created and deleted (see *Test and command evidence*).

## Verdict

**PASS_WITH_NOTES**

No acceptance criterion is ❌ not met and no required checklist item (MG-\*, or items required by `plan.md` / Accepted ADRs) is ❌. Residual ⚠️ items the human must accept at Gate 6:

1. **AC-16** is ⚠️ partial by an explicit **human exception** (phone widths, app-wide side-rail overlay; layout overhaul planned).
2. **AC-32** is ⚠️ partial: axe-clean in the calendar content, but no screen-reader pass, axe is not repeatable in CI, and targets are 24 px (pills) / app-standard 36 px (controls on `md+`), not 44 px.
3. **Offline caveat discovered by the Validator** (see AC-20 / OFF-02): a *hard reload or direct URL* to a calendar month that was never fetched as a document fails offline because of the existing per-URL service-worker document cache (same behaviour as the existing `/recipes?sort=…`). In-app navigation, bare `/calendar`, and previously visited month URLs work offline. The design doc's "Fully functional offline" should carry this caveat.
4. First-render budget wording ambiguity (one 282 ms production sample at 1×; see AC-37).

## AC audit

Independent re-verification this run is marked **(V)**.

| AC ID | Status | Evidence |
| ----- | ------ | -------- |
| AC-01 | ✅ | `calendar.model.test.ts › parseCalendarMonthParam / formatCalendarMonthParam › parses a valid YYYY-MM value and round-trips it` (75/75 server tests pass **(V)**, incl. under 3 `TZ`s). |
| AC-02 | ✅ | `…returns the fallback for invalid input %j without throwing` (13 inputs); `page.svelte.test.ts › falls back to the current month for %j without redirecting` (4 inputs). |
| AC-03 | ✅ | `shiftCalendarMonth › moves by one month / crosses year boundaries / handles multi-month…`. |
| AC-04 | ✅ | `buildMonthGrid › always returns weeks of exactly seven cells`, 4-week Feb 2026, leap Feb 2024 (5 weeks), 6-week Aug 2026, `getDaysInCalendarMonth` table; `MonthGrid.svelte.test.ts › renders blank filler cells…`. |
| AC-05 | ✅ | `buildMonthGrid › defaults to Sunday-first and shifts to Monday-first…`; `calendar.labels.test.ts › rotates to Monday-first`. |
| AC-06 | ✅ | `marks exactly one cell as today…` / `…no cell…`; real build: exactly 1 `aria-current="date"` **(V)**. |
| AC-07 | ✅ | `buildCheckoutIndex › places multiple recipes on one date and one recipe on multiple dates`. |
| AC-08 | ✅ | `lists a recipe once when the same date is repeated`; `selectCalendarMonth › sorts independently of input recipe order and history order`; `MonthGrid › orders recipes within a day by title`. |
| AC-09 | ✅ | `buckets legacy timestamp entries by their date part`; `skips unparseable entries and tolerates null, empty, and missing history`. |
| AC-10 | ✅ | `excludes soft-deleted and non-current recipes`; restore case; `page.svelte.test.ts › hides recipes that are in the trash`; real build with a trashed recipe seeded: not shown **(V)**. |
| AC-11 | ✅ | `calendar.test.ts` (envelope, errors) + `calendar.svelte.test.ts` (real IndexedDB: live add / edit / delete / restore). Node tests stub `liveQuery`; real behaviour proven by the browser test. |
| AC-12 | ✅ | Real build **(V)**: 1 `h1`, month `h2` "November 2026", 7 weekday headers (full names), 30 `<time>` elements, 1 `<main>`; no dialog/popover code in calendar files (`calendar.boundaries.test.ts` scans imports; grep of `src/lib/ui/calendar`, `src/routes/calendar`). |
| AC-13 | ✅ | `aria-current="date"` asserted (unit + real build); non-colour cue (filled circle + outline) at `MonthGrid.svelte` today styling, screenshot-reviewed. |
| AC-14 | ✅ | `MonthGrid › exposes the full untruncated title…` (ellipsis / nowrap / hidden); layout test per width bounds pill height to one line + padding; real build pill height 24 px **(V)**. |
| AC-15 | ✅ | Pill `href` `/recipes/{id}` and `title` asserted; real build hrefs `/recipes/00000000-…0001` **(V)**; click-through verified in Build. |
| AC-16 | ⚠️ | Component tests at 320 / 375 / 768 / 1280 / 1920 px pass (7 equal columns, no horizontal scroll). Real app 768 / 1024 / 1280 / 1920: 0 px horizontal overflow **(V)**. **Waived below 640 px by human decision** (`acceptance-criteria.md` AC-16; `build-log.md` "Human decision recorded"). |
| AC-17 | ✅ | `MonthGrid › grows the busy day row without clipping any recipe and without widening columns`. |
| AC-18 | ✅ | `MonthNav › offers previous, next, and Today as real links`; `page.svelte.test.ts › builds previous / next links from the URL month`; back/forward verified in Build. |
| AC-19 | ✅ | `MonthNav` select tests (labelled, viewed year present, `goto` URLs); `page.svelte.test.ts › offers years from the earliest checkout to now, plus the viewed year`. |
| AC-20 | ✅ with caveat | Production build + service worker, browser offline **(V)**: warm `/calendar?month=2026-11` loaded with data; bare `/calendar` loaded; in-app Next/selects/Today worked (Build/Test scripted run). **Caveat:** offline direct load of `/calendar?month=2026-12` (never fetched as a document) → `net::ERR_FAILED`. Same for the existing `/recipes?sort=created_at` → pre-existing per-URL SW cache (`src/service-worker.js` `networkFirst`; ADR-010 / GAP-009), not calendar code. |
| AC-21 | ✅ | Logged-out fresh load of the production build **(V)**: 53 requests, **0** fetch/xhr/external. `calendar.boundaries.test.ts › imports nothing from cloud, server, AI, or recommendations modules`. |
| AC-22 | ✅ | `page.svelte.test.ts` (empty month status + full grid; nothing-ever-made helper + link); `page.states.svelte.test.ts` (spinner with nav; error name + message; spinner → grid). SSR/console cleanliness verified manually in Build. |
| AC-23 | ✅ | `calendar.boundaries.test.ts` (imports; no `+server`/`+page.server`; no `src/routes/api/…`), mutation-proven by Tester; `git status`: no files under `src/routes/api`. |
| AC-24 | ✅ | 75/75 under `TZ=UTC`, `America/Los_Angeles`, `Pacific/Auckland` **(V)**; boundary test: only `new Date(0)`, no `toISOString`. |
| AC-25 | ✅ | `git status`: `src/lib/db.ts`, `src/lib/api/cloud/**`, `src/service-worker.js`, `src/routes/+layout.svelte`, `src/hooks.server.ts` unmodified **(V)**; boundary test asserts no calendar/checkout text in `db.ts` or cloud code and no Supabase calendar migration. |
| AC-26 | ✅ | `calendar.boundaries.test.ts › keeps recipe documents out of the store…` (index built via `buildCheckoutIndex(await db.recipes.toArray())`, no `unsortedRecipesStore`); components import neither `checkoutIndexStore` nor `$lib/db`; `calendar.test.ts › retains only slim entries`. |
| AC-27 | ✅ | `docs/calendar/README.md` ("E1 trigger not fired", measurements); `build-log.md` Phases 2–3; no E1/E2 code (AC-25). |
| AC-28 | N/A | E1 not built. |
| AC-29 | N/A | E2 not built. |
| AC-30 | N/A | E2 not built. |
| AC-31 | ✅ | `asidenav.svelte.test.ts` (5 tests); `asidenav.svelte:148-160` (`aria-label` only when collapsed; `active` → `aria-current="page"`). Detached mobile nav state untested (known). |
| AC-32 | ⚠️ | Independent axe-core 4.14 run **(V)** against the production build, `<main>` only, seeded month: **0 violations at 768 / 1024 / 1280 / 1920**; pills 24 px. Structural tests: one `h1`, `h2`, caption, `th scope="col"`, `<time datetime>`, labelled selects, Tab order. **Not met / unverified:** 44 px (pills 24 px; controls use `h-input` = 36 px on `md+`, 44 px below `md` per `app.css` `--input-height` / `--input-height-mobile`) — "where feasible"; no screen-reader pass; axe is a one-off, not CI. |
| AC-33 | ✅ | `test-report.md` + `test-matrix.md`: every AC mapped or listed under Uncovered with reason; Tester claims verified **(V)** below. |
| AC-34 | ✅ | `docs/calendar/README.md`, `src/lib/api/calendar/README.md`, `README.md:96` Documentation Map line, ADR-012 §A cell now links the design doc; `git diff` on ADR-012 is a single table cell (status and decision text unchanged). |
| AC-35 | ✅ | `calendar.test.ts › changes month with ZERO extra Dexie reads and no loading flash`; `calendar.svelte.test.ts`; `page.states… › replaces the spinner with the grid once data arrives, without remounting the navigation`; route creates the store once (`+page.svelte:32`). |
| AC-36 | ✅ | `buildCheckoutIndex › shares one entry object per recipe…`, `selectCalendarMonth` tests, 60k-date smoke test. |
| AC-37 | ✅ with note | `build-log.md` Phases 2–3 tables and `docs/calendar/README.md`: toArray ≈ 50 ms, build ≈ 18–20 ms, heap ≈ 0.7–0.8 MB; first render 170–282 ms (1×) / 440–558 ms (4×) against an empty-library baseline of 118–201 / 260–273 ms. Methodology recorded. Not independently re-measured; the single 282 ms sample exceeds 250 ms only if app boot counts against the calendar (plan did not say). |

## ADR compliance

| ADR | Status | Evidence |
| --- | ------ | -------- |
| ADR-001 | ✅ | Works offline and anonymously with Dexie only; 0 network requests logged out **(V)**; no auth/Supabase/OpenAI imports (boundary test). |
| ADR-002 | ✅ | Dexie stays system of record; `checkout_history` untouched; reads only through `src/lib/stores/calendar.ts`; no `db` import in routes/components (boundary test). Dedicated `liveQuery` is a documented exception to `local-data-dexie-ownership.mdc` ("unless profiling shows…") justified on memory (`docs/calendar/README.md`; store header). The plan's justification is by construction rather than a measured comparison against `unsortedRecipesStore` — acceptable, noted. |
| ADR-005 | ✅ | No sync code touched; calendar shows what sync merged; no new sync semantics (`src/lib/api/cloud/**` unmodified). |
| ADR-008 | ✅ | Zod schemas in `src/lib/api/calendar/calendar.schemas.ts`, object schemas `z.strictObject`; types via `z.infer` (`calendar.types.ts`); URL param validated with `safeParse` (`parseCalendarMonthParam`). Note: view-model schemas are type sources only (never parsed) — appropriate for in-memory derived data. |
| ADR-009 | ✅ | Read-only display; calendar code does not import `$lib/recommendations` (boundary test); same active-recipe predicate (`!deleted_at && is_current`). |
| ADR-012 §A | ✅ | Client-only; no API route; no cloud import; no AI; no new Dexie table; design doc at `docs/calendar/README.md`; ADR text unchanged except the link cell. Escalation (E1/E2) deliberately deferred. |
| ADR-013 | ⚠️ | Month/year selectors are native `<select>` and the grid is a native `<table>`; the existing `/recipes` page uses the bits-ui `Select` wrapper (`src/lib/ui/Select.svelte`). ADR-013 §3 allows native elements only "if no bits-ui primitive matches"; one does (Select). The plan explicitly chose native elements under ADR-014 §1 (native-first) and was approved, so this is a documented, human-approved choice, not a breach — flagged for consistency. |
| ADR-014 | ✅ / ⚠️ | One `h1` ("Calendar" via `AppBar.Text`), `h2` month, semantic table, real `href`s, labelled controls, keyboard-operable, non-colour "today", visible focus (`focus-visible:outline-2` on pills). 44 px target not met (documented, "where feasible"); 24 px AA minimum met (axe **(V)**). |
| ADR-015 | ✅ | Month navigation uses real URLs/links; Dexie-dependent data requires JS as ADR states; SSR renders only the loading state. |
| ADR-016 | ✅ | `{ data, loading, error }` envelope via `createLiveQueryStore`; no TanStack Query, no `$effect`+`fetch`; no non-test `$effect` in calendar code (grep **(V)**). |

## Checklist audit

`docs/validation-checklist.md`. Applicable sections: merge-ready gates, offline, connectivity (limited), anonymous, schema, accessibility, tests, and annex REC/SW (touched adjacently). Auth, cloud, AI, and self-hosted sections are N/A (no change to those boundaries) except where a guard row applies.

| ID | Status | Evidence / N/A reason |
| -- | ------ | --------------------- |
| MG-01 | ✅ | ADRs cited in `plan.md` read; compliance table above. No new alignment-gap entry needed; see Recommended R5 for the accepted layout exception. |
| MG-02 | ✅ | No durable architecture change (no table/index/route); design doc created per ADR-012. |
| MG-03 | ✅ | This report. |
| MG-04 | ✅ | `test-report.md` has AC coverage map, uncovered table, commands; `test-matrix.md` actual coverage filled. |
| MG-05 | ✅ | `eslint`, `prettier --check`, and `svelte-autofixer` clean on every touched path; `svelte-check`: 16 errors / 3 warnings in 9 **pre-existing** files (`last-opened-pending.test.ts`, `stores/preferences.ts`, `ui/List/List.svelte`, `ui/PxlIconButton.svelte`, `ui/Tooltip.svelte`, `routes/recipes/new/import-url-boundary.test.ts`, `routes/recipes/trash/+page.svelte`, `routes/suggestions/+page.svelte`, `vite.config.ts`) — none touched by this change **(V)**. Project-wide `eslint .` (27 errors / 19 warnings) and `prettier --check .` (2 files) likewise only in untouched files **(V)**. |
| OFF-01 | ✅ | Calendar reads Dexie only; no blocking on auth/Supabase/OpenAI/network. |
| OFF-02 | ⚠️ | Loading vs data vs error states are distinct (`page.states.svelte.test.ts`). Document-cache behaviour for uncached month URLs offline is the app-wide SW policy (see AC-20 caveat). |
| OFF-03 | N/A | Calendar performs no optional network work. |
| OFF-04 | N/A | Service worker unmodified. |
| OFF-05 | ✅ | Dexie system of record; no Cache Storage use by calendar code. |
| NET-01–NET-04 | N/A | Calendar surfaces no connectivity/capability messaging. |
| ANO-01 | ✅ | `/calendar` and its nav link are available with no session (logged-out run **(V)**). |
| ANO-02 | N/A | No onboarding change. |
| ANO-03 | ✅ | No registered-only behaviour. |
| AUTH-01 | N/A | No session/guard changes. |
| AUTH-02 | ✅ | Logged-out users see local data **(V)**. |
| AUTH-03 | ✅ | No sign-in required. |
| CLD-01, CLD-02, CLD-04 | N/A | No cloud code. |
| CLD-03 | ✅ | Calendar never writes to `recipes`. |
| AI-01 | ✅ | No server-only/AI imports in calendar client code (boundary test). |
| AI-02–AI-05 | N/A | No AI paths. |
| SH-01–SH-04 | N/A | No provider/self-hosting seams touched. |
| SCH-01 | ✅ | Schemas in `src/lib/api/calendar/`. |
| SCH-02 | ✅ | Object schemas are `z.strictObject`; the param schema is a string regex. |
| SCH-03 | ✅ | Types are `z.infer`; `CheckoutIndexSource` is a `Pick<SavedRecipe,…>`. |
| SCH-04 | ✅ | `parseCalendarMonthParam` uses `safeParse`; invalid input falls back. |
| A11Y-01 | ✅ | Native `a`, `select`, `label`, `table`; see ADR-013 note. |
| A11Y-02 | ✅ | One `<main>` **(V)**; month navigation is real URLs. |
| A11Y-03 | ✅ | Heading order `h1` → `h2`; icon-only prev/next have `aria-label`; collapsed sidenav link has an accessible name; selects labelled. |
| A11Y-04 | ✅ / N/A | No dialogs added; no animation added (reduced motion trivially respected). |
| A11Y-05 | ✅ | `svelte-autofixer` clean on `+page.svelte`, `MonthGrid.svelte`, `MonthNav.svelte`, `asidenav.svelte` (changed block), `AsidenavHarness.svelte` (Builder), `PageHarness.svelte` (Validator re-run). |
| TST-01 | ✅ | Every AC (AC-01–AC-37) appears in `test-report.md` Coverage map or Uncovered. |
| TST-02 | ✅ | Unit, store, real-Dexie, component, route, and boundary tests exist; flaky/browser residuals listed under Test stability notes. |
| TST-03 | ✅ | Offline/anonymous smoke documented (manual scripted run) and re-run by Validator **(V)**; OFFL row in `test-matrix.md`. |
| TST-04 | ✅ | Commands in `test-report.md` re-run **(V)**; same results. |
| TST-05 | ✅ | `test-matrix.md` Actual vs Planned; gaps listed under *Gaps vs plan*. |
| REC-01 | N/A | Calendar is not the recommendations engine. |
| REC-02 | ✅ | Separate code paths; no recommendations imports. |
| REC-03 | ✅ | Non-current and soft-deleted rows excluded in `buildCheckoutIndex`. |
| SW-01, SW-02 | N/A | Service worker unmodified. |
| SW-03 | ⚠️ | Manual smoke run by the Validator: warm offline loads of `/calendar?month=…`, bare `/calendar`, and `/recipes` succeed; uncached URL variants fail (pre-existing, see AC-20). |

## Test and command evidence

Re-run by the Validator **(V)** unless noted:

| Command / check | Result |
| --------------- | ------ |
| `pnpm run test` | **28 files, 253 passed, 1 skipped** (the human-skipped `import-url-boundary`). Matches `test-report.md`. |
| `TZ=UTC`, `TZ=America/Los_Angeles`, `TZ=Pacific/Auckland` + `pnpm exec vitest run --project server src/lib/api/calendar src/lib/stores/calendar` | 75/75 each. |
| Vitest JSON reporter, per file | Server: model 57, labels 5, store 6, boundaries 7 = **75**. Client: `MonthGrid` 17, `MonthNav` 6, asidenav 5, real-Dexie store 1, route 13, route states 3 = **45**. **Total 120, 0 failed** — matches the Tester's counts. |
| `pnpm exec eslint .` / `prettier --check .` / `pnpm run check` | Failures only in files this change did not modify (lists in MG-05). |
| Production build + `vite preview`, headless Chromium, seeded IndexedDB, logged out | 0 fetch/xhr/external requests; 1 `h1`, 1 `main`, 30 `<time>`, 7 weekday headers, 1 `aria-current="date"`, trashed recipe hidden, pills 24 px, 0 px horizontal overflow; axe `<main>`: 0 violations at 768 / 1024 / 1280 / 1920. |
| Service-worker offline matrix (preview build, SW active, browser offline) | Warm `/calendar?month=2026-11` ✅, bare `/calendar` ✅, `/recipes` ✅; uncached `/calendar?month=2026-12` ❌ and uncached `/recipes?sort=created_at` ❌ (the latter is an existing page, confirming the behaviour is app-wide). |
| Extreme-month probe (temporary test, deleted) | `?month=0000-01 … 9999-12` never throws; year selector stays tiny (≤ 2 options). Two cosmetic edge defects at the ends of the representable range — see Recommended R2. |
| Boundary mutation check (Tester) | Reviewed in `test-report.md`; the suite guards AC-23/24/25/26/34. |
| Not run | Lighthouse; screen-reader pass; real-device/touch testing; Firefox/WebKit (Chromium only). |

Temporary artifacts removed: `.tmp-*.mjs` scripts, probe test, `/tmp` axe installs. `git status` shows only intended changes plus the human's `import-url-boundary.test.ts` edit.

## Regressions

None identified. Evidence: full suite green (253 passed); the only modified existing production file is `asidenav.svelte` (+15 lines, a new link) with its own tests; the service worker, layout, `db.ts`, and cloud code are untouched; existing pages (`/recipes`) still load offline when warm **(V)**.

Pre-existing issues observed, **not caused by this change**: project-wide lint/check/prettier failures (listed in MG-05); the app-wide sub-640 px side-rail overlay; sidenav a11y findings (duplicate unlabeled `nav`, icon-only links, collapsed login button with no name, content outside landmarks); per-URL document caching in the service worker.

## Required remediations

N/A (verdict is not FAIL).

## Recommended remediations

Non-blocking; severity in brackets.

1. **[Low] Document the offline caveat.** In `docs/calendar/README.md` ("Offline, anonymous, AI" table), qualify "Fully functional" with: in-app month navigation works offline; a hard reload or direct URL to a month never fetched as a document fails offline because the service worker caches documents per full URL (ADR-010 / GAP-009). Optionally have the SW fall back to the cached `/calendar` document for `/calendar?…` navigations (app-wide SW change; needs its own plan).
2. **[Low] Clamp the representable range.** `shiftCalendarMonth` can yield years < 1 or > 9999 (e.g. `?month=9999-12` → Next link targets `?month=10000-01`, which fails `CalendarMonthParamSchema` and falls back to the current month; the label for year 10000 renders "January 9999"; year 0 renders "January 1"). Clamp to 1–9999 or disable the link at the ends. Practically unreachable.
3. **[Low] Documentation conventions.** `src/lib/stores/calendar.ts` and `src/lib/api/calendar/calendar.types.ts` lack the `@fileoverview` / `@module` header required by `.cursor/rules/documentation-conventions.mdc` for substantive files (sibling `stores/recipes.ts` and `recipe.types.ts` share the same omission; exports themselves are all documented).
4. **[Low] ADR-013 consistency.** Revisit native month/year `<select>` vs the bits-ui `Select` wrapper used on `/recipes` during the planned layout/UI overhaul.
5. **[Info] Log the accepted layout exception.** Add the sub-640 px side-rail overlay to `docs/readme-adr-alignment-gaps.md` (or the layout backlog) so the AC-16 waiver is traceable beyond this task folder.
6. **[Info] Accessibility regression coverage.** If wanted, add `axe-core` as a devDependency with a component test (needs human approval); do a screen-reader pass; reconsider 44 px targets for the month controls.
7. **[Info] Commit hygiene.** `src/routes/recipes/new/import-url-boundary.test.ts` is a separate human change (test set to skip, "needs further evaluation"); keep it out of the calendar commit/PR or call it out.
8. **[Info] Gate 6 acceptance.** The human should explicitly accept: the AC-16 waiver; AC-32's residuals; the offline caveat above; the first-render budget ambiguity (one 282 ms production sample); and the manual/scripted nature of AC-20/21 and AC-37.
