# Acceptance Criteria — recent-recipes-behavior

Each criterion is independently verifiable by Tester or Validator. Map to **Validation commands** in `plan.md` and layers in `test-matrix.md`.

## Functional — stable Recent Recipes list

- [ ] **AC-01:** On first catalog snapshot after load, Recent Recipes contains non-deleted recipes with `last_opened` set, sorted by `last_opened` descending, unique by `id`, capped at **15** entries.
- [ ] **AC-02:** After the first snapshot, updating `last_opened` on a recipe **already in** the Recent Recipes list does **not** reorder the list and does **not** cause a visible list replacement (same order and membership).
- [ ] **AC-03:** When a recipe not currently in the list receives a new `last_opened` newer than the last seen value for that `id`, it is **prepended**; if the list exceeds 15, the **tail** entry is dropped.
- [ ] **AC-04:** When a recipe in the list has its **title** changed, the sidenav row updates the title **in place** without changing position.
- [ ] **AC-05:** When a recipe in the list is **deleted** (or absent from the active catalog), it is **removed** from Recent Recipes and the vacancy is **not** backfilled from older recipes.
- [ ] **AC-06:** An older recipe that was **never** in the stable list does **not** appear in Recent Recipes solely because the catalog re-emitted with an updated `last_opened`.

## Functional — immediate local `last_opened` on open

- [ ] **AC-07:** Opening a recipe detail page writes `last_opened` to Dexie **immediately** when the recipe for the current route id is available — **no** 1-second (or other) delay timer.
- [ ] **AC-08:** `last_opened` is written on **every** open, including when the recipe is already in Recent Recipes and when it was already opened **today** (no daily skip).
- [ ] **AC-09:** The open path uses a dedicated local helper (`markLastOpenedLocally` or equivalent) and does **not** call `applyRecipeChange` or `saveChanges`.
- [ ] **AC-10:** A once-per-route-id guard prevents repeated Dexie writes for the same route id during a single page visit (no write loop on recipe mutations).

## Functional — batched cloud sync of pending `last_opened`

- [ ] **AC-11:** Each local `last_opened` write adds or overwrites that recipe id in a pending set with the **latest** timestamp; re-opening before flush yields a **single** pending entry with the newer value.
- [ ] **AC-12:** A **30-second** interval invokes flush logic; when the pending set is **empty**, **no** cloud/network request is made.
- [ ] **AC-13:** When pending is non-empty and cloud write is available and the browser appears online, each pending id is PATCHed via `SyncService.updateRecipeAndSyncLocal` with payload **`{ id, last_opened }` only** (latest local value); successful ids are cleared from pending.
- [ ] **AC-14:** When offline, logged out, or missing cloud write permission, pending entries are **retained** and **no** flush request is attempted.
- [ ] **AC-15:** On browser **reconnect** (offline → online) and **visibility resume** (existing layout hooks), a flush is attempted when pending is non-empty (still no-op when empty).
- [ ] **AC-16:** The batch interval is **cleared on layout teardown** (no orphaned timers).

## Functional — active highlight in sidenav

- [ ] **AC-17:** While viewing `/recipes/{id}`, the matching Recent Recipes link has bits-ui **`active`** set and receives the same **`bg-dark-10`** background treatment used on hover.
- [ ] **AC-18:** While viewing `/recipes/shared/{id}`, the matching Recent Recipes link is active when that id appears in the list (same highlight rules).
- [ ] **AC-19:** `/recipes/new` does **not** mark any Recent Recipes link active; highlight applies **only** to Recent Recipes links, not other sidenav items.

## Architectural / ADR

- [ ] **AC-20:** `last_opened`-only local writes set `synced: false` but do **not** bump `updated_at` (ADR-005 view metadata).
- [ ] **AC-21:** Content edits, favorites, checkout history, delete, and restore continue to use the existing immediate `saveChanges` / sync paths unchanged (out of scope for batching).
- [ ] **AC-22:** The pending `last_opened` flusher does **not** treat every `synced: false` recipe row as a batch candidate; content-pending rows are excluded from last_opened-only PATCH batching.
- [ ] **AC-23:** Dexie remains the system of record for `last_opened`; Recent Recipes reads through the store read model, not HTTP cache (ADR-002).

## Offline, connectivity, and capability

- [ ] **AC-24:** Opening a recipe and updating `last_opened` works **without** network, Supabase session, or OpenAI; Recent Recipes remains populated from Dexie (ADR-001).
- [ ] **AC-25:** Failure or deferral of cloud flush for `last_opened` does **not** block viewing or navigating the local recipe book (ADR-004 graceful enhancement).
- [ ] **AC-26:** No new user-facing error blocks core recipe flows when batch flush is skipped due to offline or missing write permission (existing offline banner behavior unchanged).

## Accessibility

- [ ] **AC-27:** The active Recent Recipes link exposes **`aria-current="page"`** via bits-ui `active` on `NavigationMenu.Link` (ADR-013, ADR-014).

## Test evidence

- [ ] **AC-28:** Automated unit tests in `src/lib/stores/recent-recipes-reconcile.test.ts` cover: first-load sort/cap; no reorder on later `last_opened`; title in place; delete without backfill; prepend with tail drop at 15; older never-listed recipe excluded — **or** gaps documented in `test-report.md` with reason.
- [ ] **AC-29:** Automated unit tests in `src/lib/api/cloud/last-opened-pending.test.ts` cover: empty pending → no cloud call; non-empty → one update per id with latest `last_opened` then clear on success; offline/no write access → pending retained; re-open before flush → single pending entry with newer timestamp — **or** gaps documented in `test-report.md` with reason.
- [ ] **AC-30:** `pnpm run test`, `pnpm run check`, and `pnpm run lint` pass for touched paths (**MG-05**), with evidence in `test-report.md` / `build-log.md`.

## Out of scope (non-goals)

- [ ] **AC-31:** Content-edit sync redesign, ADR amendments, service worker changes, and unrelated sidenav refactors were **not** introduced (Validator N/A check — absence of such changes).
