# Plan — recent-recipes-behavior

Source design (frozen): [`/home/cxiius/.cursor/plans/recent_recipes_behavior_e76f145e.plan.md`](../../../../.cursor/plans/recent_recipes_behavior_e76f145e.plan.md)

## Objective restatement

Recent Recipes in the sidenav stays stable after the first catalog snapshot (insert-only membership, in-place title updates, delete removal, cap 15), `last_opened` is written to Dexie immediately on every recipe open without bumping `updated_at` or triggering immediate cloud sync, pending `last_opened` values flush to cloud on a 30-second batch timer only when non-empty, and the currently open recipe link is visually and semantically active in the sidenav.

## Risk and phase strategy

| Field | Value |
| ----- | ----- |
| Manifest tier | **medium** — Dexie SoT (ADR-002), sync batching (ADR-005), offline-first local writes (ADR-001/ADR-004), layout sync wiring, sidenav UI |
| Phase count | **4** — reconciler/store, immediate local write, batched cloud flush, active highlight |
| Skipped stages | None — full pipeline (Planner → Builder → Tester → Validator) |
| Change budget | Touch only allowlisted paths; no content-edit sync redesign, ADR amendments, or unrelated refactors |

Phases are ordered so the stable list and local write paths land before cloud batching and UI polish. Each phase is PR-sized and independently verifiable against AC IDs.

## Scope boundary

### In scope

- Stable Recent Recipes reconciler (first snapshot sorted by `last_opened` desc, cap **15**; later insert-only prepend, in-place title update, delete removal; ignore `last_opened`-only reordering).
- Replace live re-sort in `recentlyOpenedStore` with reconciler-backed output consumed by `+layout.svelte`.
- Immediate local `last_opened` write on recipe page open (remove 1s delay, remove daily skip); dedicated helper — **not** `applyRecipeChange` / `saveChanges`.
- `last_opened`-only Dexie write: set `synced: false`, **do not** bump `updated_at`.
- Pending `last_opened` set + 30s batch flush via `SyncService.updateRecipeAndSyncLocal` with `{ id, last_opened }` only; no network when pending empty.
- Flush on reconnect / visibility resume (alongside existing layout sync signals) when pending non-empty.
- Highlight open recipe in asidenav Recent Recipes (`active` + `bg-dark-10`; `/recipes/{id}` and `/recipes/shared/{id}`; ignore `/recipes/new`).
- Unit tests for reconciler and pending flush helper (Tester implements).

### Out of scope

- Redesigning content-edit, favorite, checkout, delete/restore sync paths (remain immediate `saveChanges` / sync).
- Treating all `synced: false` rows as `last_opened` batch candidates.
- ADR create/update or alignment-gap remediation beyond faithful implementation.
- Changing service worker, AI, auth, or unrelated sidenav sections.
- E2E / Playwright Test suite adoption.
- Raising or lowering cap below/above **15** (replaces current `slice(0, 9)`).

## Phases

| Phase | Goal | Done when |
| ----- | ---- | --------- |
| 1 | Stable Recent Recipes reconciler + store | AC-01–AC-05, AC-14; reconciler unit tests planned |
| 2 | Immediate local `last_opened` on open | AC-06–AC-08, AC-17; no `applyRecipeChange` for open path |
| 3 | Batched pending `last_opened` cloud flush | AC-09–AC-12, AC-16; flush helper unit tests planned |
| 4 | Active highlight in sidenav | AC-13, AC-19 |

### Phase 1 — Stable list reconciler and store

- **Deliverables:**
  - Pure `reconcileRecentRecipes` function with rules from source design.
  - Store wrapper (module-level stable state + catalog subscription) replacing live re-sort in `recentlyOpenedStore`; cap **15**.
  - `+layout.svelte` continues `$derived($recentlyOpenedStore.data ?? [])` into asidenav (no contract change for prop shape: `{ id, title, … }[]`).
- **Files touched:** `src/lib/stores/recipes.ts`, new reconciler module (see file map), optionally `src/lib/stores/index.ts` barrel.
- **Dependencies:** None.

### Phase 2 — Immediate local `last_opened` write

- **Deliverables:**
  - `markLastOpenedLocally(recipeId, timestamp)` (or equivalent) under `$lib/api/cloud` or `$lib/stores`.
  - Refactor `markAsOpened` in recipe detail page: remove `lastOpenedDelay`, `markAsOpenedTimer`, daily skip, and `@internationalized/date` imports used only for that skip; keep once-per-route-id guard; write when `workingRecipe` is available (bounded re-invoke when recipe loads is OK — **no** initial delay timer).
  - Dexie update: `last_opened`, `synced: false`; preserve existing `updated_at`.
  - Register id in pending set (Phase 3 helper API may be stubbed in same commit if Phase 2+3 land together — prefer Phase 2 marking API callable from page).
- **Files touched:** `src/routes/recipes/[...id]/+page.svelte`, new pending-mark helper module.
- **Dependencies:** Phase 1 (reconciler must react to new membership for ids not yet in list).

### Phase 3 — Batched cloud sync of pending `last_opened`

- **Deliverables:**
  - In-memory pending map `id → latest last_opened ISO string`; overwrite on re-open before flush.
  - `flushPendingLastOpened({ syncService, canWriteCloud, online })` — no-op when pending empty; per-id `updateRecipeAndSyncLocal({ id, last_opened })` on success clear; retain pending on offline / no write access / failure.
  - `startLastOpenedBatchSync` / stop cleanup: **30s** interval in `+layout.svelte`; also call flush on existing online-reconnect and visibility-resume hooks when pending non-empty; clear interval on layout teardown.
  - Content-pending rows must not be selected by this flusher.
- **Files touched:** new helper under `src/lib/api/cloud/`, `src/routes/+layout.svelte`, optional `src/lib/api/cloud/index.ts` export.
- **Dependencies:** Phase 2 marking API.

### Phase 4 — Active highlight in sidenav

- **Deliverables:**
  - Derive open recipe id from `$app/state` `page.url.pathname` (`/recipes/{id}`, `/recipes/shared/{id}`; exclude `/recipes/new`).
  - On Recent Recipes `NavigationMenu.Link`: set bits-ui `active` when ids match; apply `bg-dark-10` for active state (same token as hover); scope to Recent Recipes links only.
- **Files touched:** `src/lib/ui/asidenav/asidenav.svelte`.
- **Dependencies:** None (can run parallel to Phase 3 if needed).

## Component/file map

| Path | Action | Purpose |
| ---- | ------ | ------- |
| `src/lib/stores/recent-recipes-reconcile.ts` | **create** | Pure reconciler: first snapshot sort, cap 15, insert-only prepend, title in place, delete removal, ignore `last_opened`-only reorder |
| `src/lib/stores/recipes.ts` | **modify** | Wire `recentlyOpenedStore` through reconciler + stable module state; remove live `last_opened` re-sort; cap 15; keep deprecated `recentlyOpened` readable aligned or document deprecation-only |
| `src/lib/api/cloud/last-opened-pending.ts` | **create** | Pending map, `markLastOpenedPending`, `flushPendingLastOpened`, optional `startLastOpenedBatchSync` / `stopLastOpenedBatchSync` |
| `src/lib/api/cloud/index.ts` | **modify** (if needed) | Re-export public pending/flush APIs |
| `src/routes/recipes/[...id]/+page.svelte` | **modify** | Refactor `markAsOpened`: immediate local write via helper; remove delay/daily skip/timer state tied to open |
| `src/routes/+layout.svelte` | **modify** | Start/stop 30s batch interval; invoke flush on reconnect/visibility when pending non-empty |
| `src/lib/ui/asidenav/asidenav.svelte` | **modify** | Derive open recipe id; `active` + `bg-dark-10` on matching Recent Recipes links |
| `src/lib/stores/recent-recipes-reconcile.test.ts` | **create** (Tester) | Unit tests for reconciler scenarios in source design |
| `src/lib/api/cloud/last-opened-pending.test.ts` | **create** (Tester) | Unit tests for flush helper scenarios in source design |

**Read-only dependencies (do not expand scope):**

- `src/lib/db.ts` — existing `last_opened` index; no schema migration expected.
- `src/lib/api/cloud/sync.service.ts` — reuse `updateRecipeAndSyncLocal`; no signature change required.
- `src/routes/recipes/new/+page.svelte` — already sets `last_opened` on create; new id appears via reconciler prepend rules.

## Interface contracts

### Types

```ts
/** Minimal row exposed to sidenav; full SavedRecipe fields not required. */
export type RecentRecipeListItem = {
  id: string;
  title: string;
  last_opened: string;
};

/** Per-id last seen last_opened for membership-add decisions. */
export type LastOpenedSeenMap = Map<string, string>;
```

### Reconciler — `src/lib/stores/recent-recipes-reconcile.ts`

```ts
export const RECENT_RECIPES_MAX = 15;

/**
 * Reconcile stable Recent Recipes list against a catalog snapshot.
 * @param stableList - Current stable list (empty on first run).
 * @param catalog - Active recipes from Dexie (non-deleted; reconciler filters `last_opened` presence).
 * @param lastSeenLastOpenedById - Map updated across calls; tracks last observed last_opened per id.
 * @param isFirstSnapshot - True only on first catalog emission after store init.
 * @returns Next stable list and updated seen map; when only last_opened changed on existing members, list reference/order unchanged.
 */
export function reconcileRecentRecipes(
  stableList: RecentRecipeListItem[],
  catalog: SavedRecipe[],
  lastSeenLastOpenedById: LastOpenedSeenMap,
  isFirstSnapshot: boolean
): {
  list: RecentRecipeListItem[];
  lastSeenLastOpenedById: LastOpenedSeenMap;
  changed: boolean;
};
```

**Behavior (normative — from source design):**

1. **First snapshot:** recipes with `last_opened`, unique by `id`, sort `last_opened` desc, take 15; seed `lastSeenLastOpenedById`.
2. **Later — order:** preserve `stableList` order; do not move ids when only `last_opened` changes.
3. **Add:** if id not in list and `last_opened` is newer than `lastSeenLastOpenedById.get(id)` (including first time set), prepend; if length > 15, drop tail. Do not add older recipes never in list on unrelated catalog re-emits.
4. **Remove:** drop ids absent from catalog or deleted; do not backfill vacancy.
5. **Title:** update title in place when id remains.
6. **No-op:** if the only delta is `last_opened` (or other non-title fields) for ids already in list, return unchanged list (`changed: false`).

### Store — `recentlyOpenedStore` in `src/lib/stores/recipes.ts`

- Subscribes to catalog via existing live query pattern (e.g. all non-deleted current recipes from `db.recipes`).
- Holds module-level `stableList` and `lastSeenLastOpenedById`.
- On each catalog emission: call `reconcileRecentRecipes`; emit `{ data: list, loading, error }` via `createLiveQueryStore` or equivalent readable wrapper.
- **Contract to layout:** `RecentRecipeListItem[]` (compatible with asidenav `{ id, title }` usage).

### Pending last_opened — `src/lib/api/cloud/last-opened-pending.ts`

```ts
/** Persist last_opened locally and queue for batch cloud flush. Must NOT bump updated_at. */
export async function markLastOpenedLocally(
  recipeId: string,
  lastOpened: string
): Promise<void>;

/** Read-only view of pending ids → latest last_opened ISO string. */
export function getPendingLastOpenedIds(): ReadonlyMap<string, string>;

/**
 * Flush pending last_opened patches when online and cloud write allowed.
 * No network I/O when pending map is empty.
 * Uses SyncService.updateRecipeAndSyncLocal with { id, last_opened } only.
 * Clears each id from pending on success; retains on skip/failure.
 */
export async function flushPendingLastOpened(options: {
  syncService: SyncService;
  canWriteCloud: boolean;
  online: boolean;
}): Promise<void>;

/** Start 30s interval flush; returns stop function (clear interval). */
export function startLastOpenedBatchSync(options: {
  getSyncService: () => SyncService | null;
  getCanWriteCloud: () => boolean;
  getOnline: () => boolean;
  intervalMs?: number; // default 30_000
}): () => void;
```

**Dexie write in `markLastOpenedLocally`:**

```ts
await db.recipes.update(recipeId, {
  last_opened: lastOpened,
  synced: false
  // explicitly omit updated_at
});
```

Then add/overwrite pending map entry.

### Recipe page — `markAsOpened()` contract

- Input: current route id + loaded `workingRecipe`.
- Guard: `markedAsOpenedRecipeId === routeId` → return (once per route id per visit).
- Action: `await markLastOpenedLocally(recipe.id, new Date().toISOString())` when recipe matches route id.
- **Forbidden:** `applyRecipeChange`, `saveChanges`, `updated_at` mutation, immediate `SyncService` call.
- Remove: `lastOpenedDelay`, `markAsOpenedTimer`, daily `parseDate` / `todaytz` skip.

### Layout — batch wiring

- On mount (browser): `stop = startLastOpenedBatchSync({ … })` using existing `canWriteCloud`, `network.online`, and `SyncService` construction pattern from `runSync`.
- On `$effect` online transition to online and on visibility resume (existing hooks ~lines 176–189, 213–227): `void flushPendingLastOpened(...)` when pending non-empty.
- On teardown: call `stop()`.

### Asidenav — active link

```ts
import { page } from '$app/state';

/** Returns recipe id from /recipes/{id} or /recipes/shared/{id}; null for /recipes/new and non-recipe routes. */
function deriveOpenRecipeId(pathname: string): string | null;
```

```svelte
<NavigationMenu.Link
  href="/recipes/{recipe.id}"
  active={recipe.id === openRecipeId}
  class="sidenav-link h-input-mobile md:h-input hover:bg-dark-10 data-[active]:bg-dark-10"
/>
```

(Exact active styling class may use bits-ui `data-active` variant — match existing hover token `bg-dark-10`.)

## ADR references

- **ADR-001 (Product operating model):** Opening and viewing recipes must not require network, auth, or cloud. `last_opened` writes are local-first; Recent Recipes remains usable offline from Dexie. This task must not block recipe detail on sync.
- **ADR-002 (Local data ownership):** Dexie remains system of record for `last_opened`. Writes go through `markLastOpenedLocally` / store helpers, not ad hoc route persistence. `recentlyOpenedStore` stays a LiveQuery read model over Dexie.
- **ADR-004 (Account and cloud enhancement):** Cloud flush is enhancement-only; anonymous/offline users still get immediate local `last_opened` and stable sidenav list. Pending values retained until write permission and connectivity allow flush.
- **ADR-005 (Sync and conflict resolution):** `last_opened` is view metadata — must not drive destructive conflict resolution; `last_opened`-only writes must **not** bump `updated_at`. Mark `synced: false` for local pending state. Batch PATCH scoped to `{ id, last_opened }` only; content/checkout/delete paths unchanged. Do not conflate content-pending rows with this batcher.
- **ADR-008 (Schema-led domain contracts):** Reuse existing `SavedRecipe` / `last_opened` field from `recipe.schemas.ts`; no new persisted schema. Helper params use ISO strings consistent with existing timestamptz usage.
- **ADR-013 (bits-ui):** Use `NavigationMenu.Link` `active` prop for current recipe highlight in Recent Recipes.
- **ADR-014 (Semantic HTML and accessibility):** bits-ui `active` on `NavigationMenu.Link` must set `aria-current="page"` for the open recent recipe link.
- **ADR-016 (Frontend data flow):** Catalog subscription stays Dexie LiveQuery; layout owns side-effectful batch interval and reconnect flush; recipe page calls domain helper rather than imperative sync in `$effect` beyond open marking.

## Validation commands

| Step | Owner | Command or check | Pass criteria |
| ---- | ----- | ---------------- | ------------- |
| Lint / format | Builder / Validator (**MG-05**) | `pnpm run lint` | No new errors in touched paths |
| Typecheck | Builder / Validator (**MG-05**) | `pnpm run check` | No new errors in touched paths |
| Unit — reconciler | Tester (**MG-04**, **TST-01**) | `pnpm run test:unit -- --run --project server src/lib/stores/recent-recipes-reconcile.test.ts` | AC-01–AC-05, AC-20 |
| Unit — pending flush | Tester | `pnpm run test:unit -- --run --project server src/lib/api/cloud/last-opened-pending.test.ts` | AC-09–AC-11, AC-16, AC-21 |
| Full unit suite | Tester | `pnpm run test` | All tests pass |
| Offline local open (**OFF-01**) | Tester / Validator | Manual or documented: open recipe with DevTools offline; sidenav updates membership for new open; no cloud request on open | AC-06, AC-17, AC-18 |
| Reconnect flush (**OFF-03**, **NET-**) | Tester / Validator | Manual: pending last_opened while offline → go online → flush within 30s or on reconnect hook | AC-12 |
| Active link a11y (**A11Y-**) | Validator | Inspect active Recent Recipes link for `aria-current="page"` | AC-19 |
| Content sync unchanged | Validator | Confirm favorite/edit/checkout/delete still call `saveChanges` / immediate sync | AC-15 |

## Risks

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Reconciler state lost on full page reload resets order to first-snapshot sort | Low | Medium | Accept per design (only first snapshot sorts); document in build-log if product questions arise |
| `synced: false` from `last_opened` conflated with content pending in other sync paths | Med | High | Scope flusher to explicit pending map only; never scan all unsynced rows (**AC-16**) |
| `updateRecipeAndSyncLocal` failure path sets `updated_at` on error | Low | Med | Pass only `{ id, last_opened }`; verify in unit test mock that `updated_at` unchanged locally except via existing sync.service behavior on failure |
| Module-level stable list diverges if catalog subscription missed | Low | Med | Single store module owns state; unit tests + manual sidenav check |
| Cap change 9→15 surprises users expecting shorter list | Low | Low | Approved design explicitly caps at 15 |

## Rollback

- **Code:** Revert the implementing commit(s); restore prior `recentlyOpenedStore` live sort, delayed `markAsOpened`, and immediate `applyRecipeChange` path.
- **Data / Dexie:** No migration. Local `last_opened` values written under new logic remain valid. Pending in-memory map clears on reload; `synced: false` rows continue through existing full sync paths.
- **Config / env:** None.

## Open questions

None — source design is complete and approved. Builder must not invent alternatives (batch interval, cap, reconciler rules, or sync scope).
