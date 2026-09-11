# Test report — recent-recipes-behavior

Layer-level plan vs actual: [`test-matrix.md`](./test-matrix.md). Layer definitions: [`docs/test-matrix-template.md`](../../../docs/test-matrix-template.md).

## Coverage map

| AC ID | Test file | Test name(s) | Notes |
| ----- | --------- | ------------ | ----- |
| AC-01 | `src/lib/stores/recent-recipes-reconcile.test.ts` | AC-01: first snapshot sorts by last_opened descending and caps at 15 | Pass |
| AC-02 | `src/lib/stores/recent-recipes-reconcile.test.ts` | AC-02: later last_opened change on existing id does not reorder and returns same list reference | Pass |
| AC-03 | `src/lib/stores/recent-recipes-reconcile.test.ts` | AC-03: newly written last_opened on id not in list prepends and drops tail at 15 | Pass |
| AC-04 | `src/lib/stores/recent-recipes-reconcile.test.ts` | AC-04: title change updates row in place without changing position | Pass |
| AC-05 | `src/lib/stores/recent-recipes-reconcile.test.ts` | AC-05: deleted id is removed without backfill from older recipes | Pass |
| AC-06 | `src/lib/stores/recent-recipes-reconcile.test.ts` | AC-06: older opened recipe never in list does not appear on unrelated catalog update | Pass |
| AC-07 | — | see Uncovered criteria | Manual OFFL |
| AC-08 | — | see Uncovered criteria | Manual OFFL |
| AC-09 | — | see Uncovered criteria | Code review + OFFL; open path uses `markLastOpenedLocally` per build-log |
| AC-10 | — | see Uncovered criteria | Manual OFFL |
| AC-11 | `src/lib/api/cloud/last-opened-pending.test.ts` | AC-11: re-open before flush keeps a single pending entry with the newer timestamp | Pass |
| AC-12 | `src/lib/api/cloud/last-opened-pending.test.ts` | AC-12: empty pending does not call the cloud sync client | Pass |
| AC-13 | `src/lib/api/cloud/last-opened-pending.test.ts` | AC-13: non-empty pending issues one update per id with latest last_opened and clears on success | Pass |
| AC-14 | `src/lib/api/cloud/last-opened-pending.test.ts` | AC-14: offline retains pending and makes no request; AC-14: no write access retains pending and makes no request | Pass |
| AC-15 | — | see Uncovered criteria | Manual OFFL (layout reconnect/visibility) |
| AC-16 | — | see Uncovered criteria | Manual OFFL (layout teardown) |
| AC-17 | — | see Uncovered criteria | Manual COMP |
| AC-18 | — | see Uncovered criteria | Manual COMP |
| AC-19 | — | see Uncovered criteria | Manual COMP |
| AC-20 | `src/lib/api/cloud/last-opened-pending.test.ts` | AC-20: writes last_opened and synced:false without bumping updated_at | Pass |
| AC-21 | — | see Uncovered criteria | Manual / Validator spot-check |
| AC-22 | `src/lib/api/cloud/last-opened-pending.test.ts` | AC-22: flushes only pending map ids, not arbitrary content-pending rows | Pass |
| AC-23 | — | see Uncovered criteria | Manual OFFL |
| AC-24 | — | see Uncovered criteria | Manual OFFL |
| AC-25 | — | see Uncovered criteria | Manual OFFL |
| AC-26 | — | see Uncovered criteria | Manual OFFL |
| AC-27 | — | see Uncovered criteria | Manual COMP a11y |
| AC-28 | `src/lib/stores/recent-recipes-reconcile.test.ts` | All six reconciler scenarios (AC-01–AC-06) | Pass — AC-28 satisfied |
| AC-29 | `src/lib/api/cloud/last-opened-pending.test.ts` | Empty / non-empty / offline+no-write / re-open pending scenarios | Pass — AC-29 satisfied |
| AC-30 | — | see Uncovered criteria / Command evidence | In-scope UNIT green; full `pnpm run test` / check / lint have pre-existing gaps |
| AC-31 | — | see Uncovered criteria | Validator N/A / absence review |

## Uncovered criteria

| AC ID | Reason | Follow-up |
| ----- | ------ | --------- |
| AC-07 | Recipe-page immediate write (no delay timer) is UI/route wiring — planned OFFL manual | Validator: open recipe; confirm Dexie `last_opened` updates without 1s wait |
| AC-08 | Every-open / same-day write is route behavior — planned OFFL manual | Re-open same recipe same day; confirm second local write |
| AC-09 | No automated assertion that page avoids `applyRecipeChange`/`saveChanges`; build-log + source review | Validator code review of `[...id]/+page.svelte` |
| AC-10 | Once-per-route-id guard is page-local — planned OFFL manual | Stay on page, edit recipe; confirm no write loop |
| AC-15 | Layout reconnect/visibility flush not unit-tested (wired in `+layout.svelte`) | Manual: pending offline → go online / visibility resume → flush when signed in with write |
| AC-16 | Interval teardown not unit-tested | Manual: leave layout / hard navigate; confirm no orphaned 30s timer |
| AC-17 | Sidenav active styling — planned COMP manual | Inspect `/recipes/{id}` Recent Recipes link `active` + `bg-dark-10` |
| AC-18 | Shared route highlight — planned COMP manual | Inspect `/recipes/shared/{id}` |
| AC-19 | `/recipes/new` must not activate Recent Recipes — planned COMP manual | Confirm no Recent Recipes link active |
| AC-21 | Content/favorite/checkout/delete sync unchanged — out of unit scope | Validator spot-check existing immediate sync paths |
| AC-23 | Dexie SoT / no HTTP cache for Recent Recipes — architectural OFFL | Offline sidenav still lists from Dexie |
| AC-24 | Offline open without network/session/AI — planned OFFL smoke | DevTools offline; open recipe; sidenav membership updates locally |
| AC-25 | Flush deferral must not block recipe book — planned OFFL | Skip flush offline; continue navigating recipes |
| AC-26 | No new blocking error on flush skip — planned OFFL | Confirm existing offline banner only; no new modal/error |
| AC-27 | `aria-current="page"` via bits-ui `active` — planned COMP manual | Inspect active Recent Recipes link |
| AC-30 | Full suite / check / lint not fully green project-wide | See Command evidence; MG-05 residual for Validator |
| AC-31 | Out-of-scope absence — Validator review | Confirm no ADR/SW/content-sync redesign in diff |

### Named OFFL smoke (AC-07–AC-10, AC-15–AC-16, AC-24–AC-26)

1. DevTools → Offline. Open a recipe detail page: `last_opened` updates in Dexie immediately; no cloud request on open; sidenav may prepend if id was not in list.
2. Re-open the same recipe the same calendar day: another local write occurs (no daily skip).
3. While staying on the recipe page, edit title/ingredients: confirm once-per-route-id guard (no repeated last_opened loop).
4. With pending last_opened (signed in, write allowed): go Online or switch tab visibility — flush runs when pending non-empty; empty pending remains a no-op.
5. Navigate away from app shell (layout teardown): 30s interval stops (no orphaned timer / no flush after unmount).
6. Flush skipped offline / no write permission: recipe book remains usable; no new blocking error UI.

## Test stability notes

- Pending-map cleanup in `last-opened-pending.test.ts` clears the live module Map via `getPendingLastOpenedIds()` cast between tests — deterministic; no timers used for flush assertions.
- `startLastOpenedBatchSync` interval behavior is **not** covered by automated tests (would need fake timers + layout wiring); covered under AC-15/AC-16 manual.
- None of the new UNIT specs use wall-clock sleeps.

## Command evidence

| Command | Result | Notable output |
| ------- | ------ | -------------- |
| `pnpm exec vitest run --project server src/lib/stores/recent-recipes-reconcile.test.ts src/lib/api/cloud/last-opened-pending.test.ts` | **PASS** | 2 files, **14 tests** passed (120ms) |
| `pnpm run test:unit -- --run --project server src/lib/stores/recent-recipes-reconcile.test.ts src/lib/api/cloud/last-opened-pending.test.ts` | **Unreliable filter** | Vitest invoked as `vitest -- --run …` and ran the broader server suite instead of only the two files; prefer `pnpm exec vitest run …` |
| `pnpm exec vitest run --project server` | **FAIL** (pre-existing) | 1 failed: `src/routes/recipes/new/import-url-boundary.test.ts` (page still imports `isomorphic-dompurify`); **15 passed** including both new specs (118 passed / 1 failed tests) |
| `pnpm run test` | **FAIL** (env + pre-existing) | Same server failure; client project errors: Playwright Chromium missing (`pnpm exec playwright install` needed). Outside Tester scope. |
| `pnpm run check` / `pnpm run lint` | **Not re-run** this stage | Builder recorded project-wide FAIL with touched paths clean; Tester did not re-execute (MG-05 residual for Validator) |

## Commands to run

```bash
# In-scope UNIT (recommended — reliable file filter)
pnpm exec vitest run --project server src/lib/stores/recent-recipes-reconcile.test.ts src/lib/api/cloud/last-opened-pending.test.ts

# Plan-equivalent (may broaden filter depending on pnpm/vitest arg parsing)
pnpm run test:unit -- --run --project server src/lib/stores/recent-recipes-reconcile.test.ts
pnpm run test:unit -- --run --project server src/lib/api/cloud/last-opened-pending.test.ts

# Full suite (requires Playwright browsers for client project)
pnpm run test
pnpm run check
pnpm run lint
```

## Blockers

_N/A for in-scope UNIT delivery._ Residual suite failures (`import-url-boundary.test.ts`, missing Playwright browser) are **pre-existing / environment** and outside this task’s allowlisted production files. No production testability hooks were required.

## Residual risk

- COMP/OFFL ACs remain manual until Validator (or a future component spec) covers sidenav active/`aria-current` and layout timer/reconnect flush.
- `SyncService.updateRecipeAndSyncLocal` failure path may still bump `updated_at` inside the service (plan risk); UNIT asserts local `markLastOpenedLocally` omits `updated_at` and that failed flush retains pending — does not assert sync.service error-path Dexie writes.
- Full-reload re-sort of Recent Recipes remains accepted design risk (build-log).
