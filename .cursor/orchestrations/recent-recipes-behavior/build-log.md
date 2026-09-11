# Build log — recent-recipes-behavior

Builder-owned. Implements all four phases from `plan.md`.

## Files created

| Path | Purpose | Key decisions |
| ---- | ------- | ------------- |
| `src/lib/stores/recent-recipes-reconcile.ts` | Pure `reconcileRecentRecipes` with `RECENT_RECIPES_MAX = 15`, `RecentRecipeListItem`, and `LastOpenedSeenMap` per plan interface contracts | First snapshot sorts by `last_opened` desc; later snapshots preserve order, prepend on newer `last_opened` for ids not in list, in-place title updates, delete removal without backfill, no-op when only `last_opened` changes on existing members (`changed: false`, same list reference) |
| `src/lib/api/cloud/last-opened-pending.ts` | `markLastOpenedLocally`, `getPendingLastOpenedIds`, `flushPendingLastOpened`, `startLastOpenedBatchSync` | Dexie update sets `last_opened` + `synced: false` only (no `updated_at`); in-memory pending map with latest-wins; flush no-ops when empty/offline/no write permission; 30s default interval with returned stop function |

## Files modified

| Path | What changed | Why |
| ---- | ------------ | --- |
| `src/lib/stores/recipes.ts` | Replaced live `last_opened` re-sort in `recentlyOpenedStore` with module-level stable state + reconciler-backed `readable` store; cap raised to 15 via reconciler | Phase 1 — stable Recent Recipes list (AC-01–AC-05) |
| `src/lib/api/cloud/index.ts` | Re-exported pending/flush/batch-sync APIs | Phase 3 — public cloud helper surface |
| `src/routes/recipes/[...id]/+page.svelte` | Refactored `markAsOpened`: immediate `markLastOpenedLocally`, removed delay timer, daily skip, and `applyRecipeChange` path; added `$effect` to invoke when route recipe loads; removed `@internationalized/date` imports used only for daily skip | Phase 2 — immediate local `last_opened` (AC-06–AC-10, AC-20) |
| `src/routes/+layout.svelte` | `startLastOpenedBatchSync` on mount with teardown stop; `flushPendingLastOpenedIfNeeded` on visibility resume and offline→online reconnect | Phase 3 — batched cloud flush (AC-11–AC-16) |
| `src/lib/ui/asidenav/asidenav.svelte` | `deriveOpenRecipeId` from `$app/state` `page.url.pathname`; `active` + `data-[active]:bg-dark-10` on Recent Recipes links only | Phase 4 — active highlight (AC-17–AC-19, AC-27) |

## Command evidence

| Command | Result | Notes |
| ------- | ------ | ----- |
| `pnpm run format` | **PASS** (exit 0) | Reformatted touched files among others |
| `pnpm run lint` | **FAIL** (exit 1) project-wide; **PASS** for touched paths | Pre-existing errors in unrelated files (`Button.svelte`, `suggestions/+page.svelte`, `cloud.model.test.ts`, etc.). Touched paths (`recipes.ts`, `recent-recipes-reconcile.ts`, `last-opened-pending.ts`, `index.ts`, `+layout.svelte`, `[...id]/+page.svelte`, `asidenav.svelte`) have no lint findings after import-order fixes |
| `pnpm run check` | **FAIL** (exit 1) project-wide; **PASS** for touched paths | Pre-existing errors (`vite.config.ts`, `preferences.ts`, `Tooltip.svelte`, test node types, etc.). No svelte-check diagnostics in touched implementation files |

Svelte MCP `svelte-autofixer` run on `asidenav.svelte` (v5): no issues reported.

## Deviations from plan

_None._

## Scope pressure

_None._

## Unresolved open questions

| Plan question | Outcome |
| ------------- | ------- |
| _(none in plan)_ | N/A — implemented per frozen design |

## Known gaps

- **Tester-owned specs not created** — `recent-recipes-reconcile.test.ts` and `last-opened-pending.test.ts` deferred to Tester per pipeline contract.
- **Full reload resets stable order** — per plan risk table; first snapshot re-sorts after full page reload (accepted design).
- **`updateRecipeAndSyncLocal` failure path** — on cloud failure, existing `sync.service.ts` may set `updated_at` on error; batch flusher passes `{ id, last_opened }` only; Validator/Tester should confirm failure semantics (plan risk row).
- **Deprecated `recentlyOpened` readable** — left in place with slice(0, 9) and `@deprecated` JSDoc; only `recentlyOpenedStore` uses reconciler cap 15.

## Phase summary (orchestrator handoff)

| Phase | Status | Deliverables |
| ----- | ------ | ------------ |
| 1 — Stable reconciler + store | Done | `recent-recipes-reconcile.ts`, `recentlyOpenedStore` wiring |
| 2 — Immediate local write | Done | `markLastOpenedLocally`, recipe page `markAsOpened` refactor |
| 3 — Batched cloud flush | Done | `last-opened-pending.ts`, layout interval + reconnect/visibility flush |
| 4 — Active sidenav highlight | Done | `deriveOpenRecipeId`, `NavigationMenu.Link` `active` styling |
