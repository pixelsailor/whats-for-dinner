## Verdict

PASS_WITH_NOTES

## AC audit

| AC ID | Status | Evidence |
| ----- | ------ | -------- |
| AC-01 | ✅ met | `src/lib/stores/recent-recipes-reconcile.test.ts`: “AC-01: first snapshot sorts…” |
| AC-02 | ✅ met | `src/lib/stores/recent-recipes-reconcile.test.ts`: “AC-02: later last_opened… does not reorder…” asserts `second.list === first.list` |
| AC-03 | ✅ met | `src/lib/stores/recent-recipes-reconcile.test.ts`: “AC-03: newly written last_opened… prepends + tail drop…” |
| AC-04 | ✅ met | `src/lib/stores/recent-recipes-reconcile.test.ts`: “AC-04: title change updates row…” |
| AC-05 | ✅ met | `src/lib/stores/recent-recipes-reconcile.test.ts`: “AC-05: deleted id is removed…” |
| AC-06 | ✅ met | `src/lib/stores/recent-recipes-reconcile.test.ts`: “AC-06: older opened recipe never in list…” |
| AC-07 | ⚠️ partial | Manual/offline-only (no automated assertion in unit tests); intended behavior is wired via `markAsOpened()` calling `markLastOpenedLocally()` without a delay timer in `src/routes/recipes/[...id]/+page.svelte` |
| AC-08 | ⚠️ partial | Manual/offline-only (no automated assertion); once-per-route-id guard is based on `markedAsOpenedRecipeId` in `src/routes/recipes/[...id]/+page.svelte` and is reset on route `id` change |
| AC-09 | ✅ met | Code review: `markAsOpened()` calls only `markLastOpenedLocally()`; no `applyRecipeChange`/`saveChanges` from `markAsOpened()` in `src/routes/recipes/[...id]/+page.svelte` |
| AC-10 | ✅ met | Code review: `markedAsOpenedRecipeId` once-per-route-id guard in `src/routes/recipes/[...id]/+page.svelte` |
| AC-11 | ✅ met | `src/lib/api/cloud/last-opened-pending.test.ts`: “AC-11: re-open before flush…” |
| AC-12 | ✅ met | `src/lib/api/cloud/last-opened-pending.test.ts`: “AC-12: empty pending does not call…” |
| AC-13 | ✅ met | `src/lib/api/cloud/last-opened-pending.test.ts`: “AC-13: non-empty pending issues one update per id…” |
| AC-14 | ✅ met | `src/lib/api/cloud/last-opened-pending.test.ts`: “AC-14: offline retains pending…” and “AC-14: no write access…” |
| AC-15 | ⚠️ partial | Manual/offline-only reconnect/visibility timing; wired in `src/routes/+layout.svelte` via `document.visibilitychange` and `network.online` transition calling `flushPendingLastOpenedIfNeeded()` |
| AC-16 | ✅ met | Code review: interval stop is returned from `startLastOpenedBatchSync()` and called in `src/routes/+layout.svelte` cleanup (`stopLastOpenedBatchSync()`) |
| AC-17 | ⚠️ partial | Manual/component inspection required; wiring exists in `src/lib/ui/asidenav/asidenav.svelte` using `active={recipe.id === openRecipeId}` and `data-[active]:bg-dark-10` |
| AC-18 | ⚠️ partial | Manual/component inspection required; `deriveOpenRecipeId()` supports `/recipes/shared/{id}` in `src/lib/ui/asidenav/asidenav.svelte` |
| AC-19 | ⚠️ partial | Manual/component inspection required; `deriveOpenRecipeId()` returns `null` for `/recipes/new` in `src/lib/ui/asidenav/asidenav.svelte` |
| AC-20 | ✅ met | `src/lib/api/cloud/last-opened-pending.test.ts`: asserts Dexie update payload omits `updated_at`; helper uses `synced:false` with `last_opened` in `src/lib/api/cloud/last-opened-pending.ts` |
| AC-21 | ⚠️ partial | Out-of-scope for unit tests; should be verified by spot-checking existing edit/favorite/checkout/delete flows (only last-opened open path was refactored) |
| AC-22 | ✅ met | `src/lib/api/cloud/last-opened-pending.test.ts`: asserts flusher updates only pending map entries, not arbitrary content-pending rows |
| AC-23 | ⚠️ partial | Manual/offline-only validation that “Recent Recipes reads from Dexie, not HTTP cache” for offline mode; architecture suggests this via `recentlyOpenedStore` backed by Dexie in `src/lib/stores/recipes.ts` |
| AC-24 | ⚠️ partial | Manual/offline-only smoke: offline open + Dexie-populated sidenav (not executed as automated evidence in this run) |
| AC-25 | ⚠️ partial | Manual/offline-only validation: flush deferral doesn’t block core flows when skipped |
| AC-26 | ⚠️ partial | Manual/offline-only validation: no new blocking error UI when flush is skipped |
| AC-27 | ⚠️ partial | A11y requirement “active Recent Recipes link exposes `aria-current=\"page\"`” is not explicitly set in `src/lib/ui/asidenav/asidenav.svelte`; bits-ui types/implementation inspected show `active` prop but no explicit `aria-current` wiring evidence in the composed link markup |
| AC-28 | ✅ met | `src/lib/stores/recent-recipes-reconcile.test.ts`: reconciler unit tests cover first-load sort/cap, no reorder on later `last_opened`, title in place, delete removal, prepend + tail drop, older never-listed exclusion |
| AC-29 | ✅ met | `src/lib/api/cloud/last-opened-pending.test.ts`: flusher unit tests cover empty pending no-op, non-empty updates per id w/ latest value, offline/no write permission retains pending, re-open overwrites pending |
| AC-30 | ⚠️ partial | In-scope UNIT tests passed (14); full `pnpm run test` / project-wide `pnpm run check` / `pnpm run lint` recorded as failing due to pre-existing or environment issues in `build-log.md` / `test-report.md` |
| AC-31 | ✅ met | No scope-expanding deviations recorded in `build-log.md` (“Deviations from plan: None”) |

## ADR compliance

| ADR | Status | Evidence |
| --- | ------ | -------- |
| ADR-001 | ✅ met | Last-opened marking and Recent Recipes list remain Dexie/local-first and do not gate on cloud/auth in `src/lib/api/cloud/last-opened-pending.ts`, `src/routes/recipes/[...id]/+page.svelte`, and `src/lib/stores/recipes.ts` |
| ADR-002 | ✅ met | Recent Recipes store is a Dexie LiveQuery read model (`recentlyOpenedStore` + reconciler) and last_opened writes go through Dexie (`db.recipes.update`) |
| ADR-004 | ✅ met | Cloud flush is enhancement-only: `flushPendingLastOpened` no-ops when `canWriteCloud` is false or `online` is false; layout flush wiring uses capability signals from `deriveCloudCapability` |
| ADR-005 | ✅ met | `last_opened` is view metadata: batch patches use `{ id, last_opened }` only, pending `synced:false` written without `updated_at` (unit test asserts); reconciler logic does not drive conflict resolution |
| ADR-013 | ✅ met | `NavigationMenu.Link` is used for Recent Recipes links in `src/lib/ui/asidenav/asidenav.svelte` |
| ADR-014 | ⚠️ partial | `active` is set on Recent Recipes links, but explicit `aria-current=\"page\"` is not verified in composed markup |
| ADR-016 | ✅ met | Frontend data flow follows layered defaults: Dexie-backed store provides the list; layout owns side effects (interval + reconnect/visibility flush); recipe page invokes domain helper for last_opened marking |

## Checklist audit

| ID | Status | Evidence / N/A reason |
| --- | ------ | ---------------------- |
| MG-01 | ⚠️ | ADR-014/AC-27: `aria-current=\"page\"` not explicitly evidenced |
| MG-02 | ✅ | Plan cites only Accepted ADRs; no durable architecture beyond them without ADR deviation |
| MG-03 | ✅ | `validation-report.md` exists and contains AC + ADR + checklist audits |
| MG-04 | ✅ | `test-report.md` exists with 14 in-scope UNIT tests passed and documented pre-existing suite failures |
| MG-05 | ⚠️ | `build-log.md` records project-wide `pnpm run lint` / `pnpm run check` as failing, but touched paths have no new lint/typecheck findings |
| OFF-01 | ✅ | `markLastOpenedLocally` is a Dexie write only; recipe open path does not require cloud |
| OFF-02 | N/A | Change does not introduce new cold/warm/stale shell messaging beyond existing patterns |
| OFF-03 | ✅ | Pending flush is skipped offline/no permission and pending values are retained |
| OFF-04 | N/A | Service worker unchanged in this task |
| OFF-05 | ✅ | Recent Recipes and `last_opened` are persisted/derived from Dexie |
| NET-01 | N/A | No new offline/logged-out/missing-permission copy introduced for these last_opened actions |
| NET-02 | N/A | No new sync UI copy added; gating uses capability/online signals |
| NET-03 | ✅ | Layout re-checks pending flush via interval, reconnect effect, and visibility resume in `src/routes/+layout.svelte` |
| NET-04 | N/A | No new disabled control introduced as part of this task |
| ANO-01 | N/A | Task is local-first and does not add new anonymous gating |
| ANO-02 | N/A | Not applicable |
| ANO-03 | N/A | Not applicable |
| AUTH-01 | N/A | No new session/guard logic added |
| AUTH-02 | N/A | Local-first open marking does not depend on auth |
| AUTH-03 | N/A | Not applicable |
| CLD-01 | ✅ | Cloud flush is enhancement-only; local recipe browsing remains functional even if flush is skipped |
| CLD-02 | ✅ | Flush requires `canWriteCloud`; missing permission prevents network writes and retains pending |
| CLD-03 | ✅ | `flushPendingLastOpened` retains pending entries when offline/no permission/failure |
| AI-01..AI-05 | N/A | Task does not change AI paths |
| SCH-01..SCH-04 | N/A | No new persisted schema or API boundary added |
| A11Y-01..A11Y-04 | N/A | No new interactive widgets introduced besides link state styling |
| A11Y-05 | ✅ | `build-log.md` notes `svelte-autofixer` ran on `asidenav.svelte` |
| TST-01 | ✅ | `test-report.md` maps ACs to tests or explicitly marks manual/uncovered criteria |
| TST-02 | ✅ | New unit tests cover reconciler + pending flusher |
| TST-03 | ⚠️ | Offline smoke is documented as a manual named step, but no command/tool evidence of execution was provided |
| TST-04 | ✅ | Commands are recorded in `build-log.md` / `test-report.md` (including documented failures) |
| TST-05 | ⚠️ | Coverage gaps vs plan remain for manual/offline and A11Y evidence (AC-07/08/15/17–19/24–27) |

## Test and command evidence

| Category | Evidence |
| --- | --- |
| UNIT (in-scope) | `src/lib/stores/recent-recipes-reconcile.test.ts` + `src/lib/api/cloud/last-opened-pending.test.ts`: 14 tests passed (per `test-report.md`) |
| Commands | `pnpm run test` / `pnpm exec vitest run --project server` recorded in `build-log.md` / `test-report.md` as failing due pre-existing/environment gaps; in-scope UNIT pass documented |
| Tooling | `pnpm run lint` / `pnpm run check` project-wide recorded as failing, but touched paths reported clean in `build-log.md` |

## Regressions

No new scope-expanding deviations are recorded in `build-log.md`. The only confirmed behavioral change is increased frequency of `last_opened` writes on open (daily skip removed), which matches the plan’s objective.

## Required remediations

N/A (verdict is not FAIL).

## Recommended remediations

1. Make AC-27 explicit: set `aria-current="page"` on the active Recent Recipes `NavigationMenu.Link` (or verify bits-ui `active` semantics in composed markup) and add a small component/unit assertion or documented DOM check.
2. Produce stronger evidence for the remaining manual/offline ACs (AC-07/08/15/17–19/24–26) by recording actual manual execution steps/results in `test-report.md`.
3. Validate the “updated_at not bumped on last_opened-only writes” invariant end-to-end: confirm `updateRecipeAndSyncLocal` error paths don’t mutate Dexie `updated_at` unexpectedly (plan risk row) and, if needed, extend unit coverage around sync-service failure semantics.

# Validation report — wfd-000

Replace `wfd-000` with `task_id`. Delete guidance comments before handoff.

## Verdict

<!-- Exactly one: PASS | PASS_WITH_NOTES | FAIL -->

## AC audit

<!-- Per AC ID from acceptance-criteria.md: ✅ met | ⚠️ partial | ❌ not met + evidence (file:line or test name) -->

| AC ID | Status | Evidence |
| ----- | ------ | -------- |
| AC-01 |        |          |

## ADR compliance

<!-- Per ADR cited in plan.md -->

| ADR     | Status | Evidence |
| ------- | ------ | -------- |
| ADR-001 |        |          |

## Checklist audit

<!-- Per [docs/validation-checklist.md](../../../docs/validation-checklist.md): mark each applicable item ✅ | ⚠️ | ❌ | N/A + evidence. Summarize blocking IDs in Required remediations when FAIL. -->

| ID    | Status | Evidence / N/A reason |
| ----- | ------ | --------------------- |
| MG-01 |        |                       |

## Test and command evidence

<!-- Planned commands from build-log.md and test-report.md; gaps or failures -->

## Regressions

<!-- Suspected broken existing behavior, or "None identified" -->

## Required remediations

<!-- Numbered, specific fixes for Builder when verdict is FAIL; otherwise "N/A" -->

## Recommended remediations

<!-- Non-blocking improvements -->
