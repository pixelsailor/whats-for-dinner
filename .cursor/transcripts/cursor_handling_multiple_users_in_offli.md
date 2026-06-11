# Handling multiple users in offline mode

_Exported on 6/5/2026 at 09:22:00 CDT from Cursor (3.6.31)_

---

**User**

I just realized that WFD has no means of handling multiple users locally. Theoretically, if they were logged in they would only see and sync their owned recipes, but what happens when they're offline or have logged out? If the local db contains recipes from multiple users how does it determine which to show? Does it show everything? Is syncing restricted to the owner_id or would every recipe be synced when a connection was re-established? Identify the issue and propose a solution for handling multiple users within the contraints of off-line mode and local data.

---

**Cursor**

I’ll trace how recipes are stored, filtered, and synced today, then compare that against the offline/local-data ADRs so the recommendation fits WFD’s constraints.

So far the ADRs confirm the intended model: Dexie is the on-device authority, Supabase is an account-scoped replica, and local recipe use must survive logged-out/offline states. I’m now checking whether the implementation has a local identity boundary that can enforce that.

The implementation appears to index `owner_id`, but the primary recipe stores read `db.recipes.toArray()` and filter only by deletion/current state. That strongly suggests local views are not scoped by active/local user identity today.

The sync path has the same gap: remote reads are owner-scoped, but the local side of the sync plan pulls every active Dexie recipe before comparing/uploading. That means signing in as user B on a browser containing user A’s local rows could plan A’s rows as `localOnly` for B’s cloud.

There are also local creation paths that intentionally write `owner_id: null` when not synced immediately. Without a separate local principal, those anonymous/local rows cannot later be distinguished between “current browser guest” and “a previously signed-in user who is currently offline/logged out.”

Yes, this is a real product/data-boundary issue.

Today WFD has `owner_id`, but that field is cloud ownership, not a reliable local-user partition. Local recipe reads are global:

```27:35:src/lib/stores/recipes.ts
/** Returns all active recipes sorted by title */
export const recipesStore = createLiveQueryStore(async () => {
  const all = (await db.recipes.toArray()) as unknown as SavedRecipe[] | undefined;
  if (!all) {
    return [];
  }
  const active = all.filter((r) => !r.deleted_at && r.is_current);
  return active.sort((a, b) => a.title.localeCompare(b.title));
});
```

Sync has the same local-side problem:

```303:306:src/lib/api/cloud/sync.service.ts
private async getLocalActiveRecipes(): Promise<SavedRecipe[]> {
  const all = await db.recipes.toArray();
  return all.filter(isActive);
}
```

Remote cloud reads are owner-scoped:

```214:219:src/lib/api/cloud/cloud.service.ts
async downloadAllRemoteRecipes(): Promise<SavedRecipe[] | null> {
  const { data, error }: { data: SavedRecipe[] | null; error: Error | null } = await this.supabase
    .from('recipes')
    .select('*')
    .eq('owner_id', this._userId)
    .is('archived', null);
```

But uploads assign missing `owner_id` to the currently signed-in user:

```150:158:src/lib/api/cloud/cloud.service.ts
prepareRecipeForUpload(recipe: Recipe | SavedRecipe): SavedRecipe {
  const saved = recipe as SavedRecipe;

  return {
    ...saved,
    owner_id: saved.owner_id ?? this._userId,
    synced: true,
    sync_error: null
  };
}
```

So the answers are:

- Offline/logged out local views likely show every active/current recipe in IndexedDB, regardless of whose cloud account it came from.
- Remote downloads are restricted to `owner_id`.
- Sync planning is not locally restricted to the current owner/profile, so recipes from another local user can be treated as `localOnly` and uploaded into the newly signed-in user’s cloud account if confirmed or auto-synced.
- `owner_id: null` local recipes are especially ambiguous because they mean “not cloud-owned yet,” not “belongs to this local person.”

## Proposed Solution

Add a local identity boundary separate from cloud identity.

Introduce a required local owner field, for example `local_owner_id`, on every locally owned Dexie row: recipes, preferences, cached suggestions, and any future durable local domains. Keep `owner_id` as the Supabase/cloud owner. They answer different questions:

- `local_owner_id`: which local WFD profile/library can see and mutate this row on this browser.
- `owner_id`: which cloud account owns the remote replica when synced.

Add a small Dexie table such as `local_profiles`:

- `id`: local UUID.
- `display_name`: “Guest”, email, or user-chosen label.
- `linked_user_id`: Supabase user id when this local profile is bound to an account.
- `created_at`, `last_active_at`.
- Optional future fields: local passcode/encryption metadata.

Add an app-local “active profile” record, probably in Dexie or a tiny app metadata table. All recipe stores become scoped by that active profile:

- recipe list: `local_owner_id === activeLocalProfileId`
- trash: same profile, including tombstones
- single recipe reads: reject/not found if the recipe id exists but belongs to a different local profile
- recommendations: only active profile recipes
- suggestions/preferences: only active profile data

Sync should take an explicit context:

```ts
{
  localProfileId: string;
  cloudUserId: string;
}
```

Then:

- Local sync candidates are only rows with `local_owner_id === localProfileId`.
- Upload is allowed only when `owner_id` is `null` or equals `cloudUserId`.
- If `owner_id` belongs to another cloud user, quarantine it as a local identity conflict, do not upload.
- Downloaded cloud rows are saved with `owner_id = cloudUserId` and `local_owner_id = localProfileId`.
- First-sync confirmation applies only to the active local profile, not the whole IndexedDB database.

## Offline Behavior

This still fits the offline-first ADRs. Offline mode does not require Supabase. It only requires WFD to know the current local profile.

Recommended UX:

- First launch creates a default local profile.
- Sign in links or switches to a local profile associated with that Supabase user.
- Sign out does not delete local data. It either keeps the same active local profile with “cloud sync paused” messaging, or offers “switch to Guest/local profile.”
- If offline and the cloud session is unavailable, WFD keeps using the last active local profile.
- On shared devices, provide a “Switch local user” entry. This is accidental-mixing protection, not strong security; real privacy would require browser/OS account separation or future local encryption/passcode.

## Migration Path

For existing IndexedDB rows:

- Add `local_owner_id` and a `local_profiles` table in a Dexie migration.
- For rows with non-null `owner_id`, create or reuse a linked local profile per `owner_id`.
- For rows with `owner_id: null`, assign them to the current/default local profile and mark them as unlinked local rows.
- Before first cloud sync after migration, show a confirmation for unlinked local rows: “Sync these local recipes to this account?” Do not silently upload them.
- If existing rows contain multiple cloud `owner_id` values, split them into separate local profiles immediately.

This is worth tracking as an ADR/alignment gap: current implementation lacks a local identity model, and `owner_id` alone cannot satisfy both offline continuity and multi-user isolation.
