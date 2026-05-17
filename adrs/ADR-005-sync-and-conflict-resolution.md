# ADR-005: Sync and conflict resolution

## Status

**Accepted**

## Date

2026-05-08

## Scope

- **In scope:** Synchronization semantics between local Dexie recipe data and account-backed cloud backups, including ownership, timestamps, soft deletes, restore behavior, `checkout_history`, and conflict handling.
- **Out of scope:** The Supabase provider implementation contract, self-hosted database provider setup, sharing/collaboration rules, OpenAI/AI artifact sync, and exact table migrations.

## Context

WFD is offline-first and anonymous-first, with Supabase as an optional enhancement for backup, sync, and sharing. Current local recipe records already include fields such as `updated_at`, `deleted_at`, `last_synced_at`, `synced`, `sync_error`, and `checkout_history`, but without a governing sync ADR implementers can disagree about which copy wins, whether deleted records should disappear immediately, and whether "made this today" history is durable synced data.

### Decision pressure (required)

Sync work is already present in the codebase and will expand with backup and multi-device flows. A clear conflict model is required before more sync behavior is added, because accidental hard deletes, remote-first assumptions, or silent conflict overwrites would violate ADR-001 offline-first continuity and ADR-002 local data ownership.

### Supporting context

- **Problem:** Local Dexie records and Supabase backup records can diverge while devices are offline, logged out, or recovering from sync errors.
- **Options considered:** (1) Remote always wins — rejected; breaks offline-first local ownership. (2) Local always wins — rejected; loses valid edits from other devices. (3) Timestamp-led synchronization with soft-delete tombstones, auto-resolution for clear ordering, and manual resolution for ambiguous concurrent edits — **chosen**.
- **Must stay true:** Core recipe-book behavior remains available without auth/network/Supabase; cloud remains an enhancement; durable data uses schema-led records; transient AI suggestion artifacts are not synced as recipes.

## Decision

We will treat **Dexie as the authoritative editable record on the current device** and Supabase as an **account-scoped backup/sync replica** for durable records that are eligible for cloud sync.

### Sync ownership model

- Local Dexie writes are allowed while offline, logged out, or temporarily unauthorized for cloud features. Those rows become pending sync work when cloud sync is available.
- Supabase stores account-owned backup/sync copies for eligible durable records. It does not become the mandatory runtime source of truth for local recipe-book UX.
- Every syncable record must have a stable app-level `id` that is preserved across local and cloud copies. Sync must not create duplicate recipes for the same logical record.
- A row with `synced: false` or `sync_error` is a local record with unresolved cloud propagation, not invalid local user data.

### Timestamp and state fields

- `created_at` records first creation and should not be used to decide edit freshness.
- `updated_at` records the most recent material user-owned change to recipe content or synced metadata, including soft delete, restore, favorite state, tags, and `checkout_history`.
- `last_synced_at` records the last time the local row was known to match the cloud row.
- `last_opened` is view metadata. It may be synced if product UX requires cross-device recents, but it must not cause destructive conflict resolution by itself.
- `deleted_at` is a soft-delete tombstone. A non-null value means the record is deleted from active recipe views but remains syncable until retention policy allows permanent purge.
- `archived` remains a separate cloud/storage lifecycle state and must not be treated as equivalent to user deletion without an ADR update.

### Soft delete and restore behavior

- Deleting a synced recipe sets `deleted_at`, updates `updated_at`, marks the row unsynced, and propagates the tombstone to cloud on the next sync.
- Sync planning must include tombstoned records. Filtering only active records is insufficient because deletion state must propagate across devices.
- A restore clears `deleted_at`, updates `updated_at`, marks the row unsynced, and propagates the restored active state on the next sync.
- If one side has a newer tombstone and the other side has an older active record, the tombstone wins automatically.
- If one side restores or edits after seeing a tombstone and the other side also changes the deleted record independently, treat it as a conflict unless timestamp ordering clearly proves one side is newer.
- Permanent deletion is only allowed after the tombstone has synced successfully and the configured retention/expiry policy has passed. Permanent cloud deletion must not cause an older unsynced local copy to reappear as active data.

### Conflict resolution

Sync plans will compare local and cloud rows with the same `id`:

- If only local exists, upload it unless it is an expired tombstone eligible for purge.
- If only cloud exists, download it unless local metadata records a newer tombstone for the same `id`.
- If both exist and only one side changed since `last_synced_at`, accept the changed side.
- If both changed and timestamps clearly order the writes, accept the newer `updated_at` value.
- If both changed within the configured ambiguity window, timestamps are equal/missing, or field-level merge would be lossy, surface a manual conflict.
- Manual conflict resolution must offer at least "keep local" and "keep cloud." A future field-level merge UI may be added, but silent lossy merging is prohibited.

### `checkout_history`

- `checkout_history` is durable user-owned recipe metadata and participates in sync with saved recipes.
- Adding or removing a checkout entry updates `updated_at` and marks the recipe unsynced.
- When concurrent changes touch only `checkout_history`, implementations may merge by taking the de-duplicated union of ISO datetime entries and then mark the merged row unsynced for propagation.
- When `checkout_history` changes concurrently with content edits, soft delete, or restore, use the normal conflict rules unless a future merge policy can prove the combined result is non-lossy.

### Explicit exclusions (required)

- **We are not** making Supabase the mandatory source for opening, editing, or searching recipes on a device that already has local data.
- **We are not** syncing transient AI suggestion rows or prompt-request dedup rows as durable cloud recipe data.
- **We are not** allowing hard deletes to be the primary cross-device delete signal.
- **We are not** silently overwriting ambiguous concurrent edits just because one provider clock appears newer.

## Consequences

### Positive

- Preserves offline editing while still supporting multi-device backup and recovery.
- Gives reviewers a concrete rule for tombstones, restores, and `checkout_history`.
- Reduces accidental data loss by requiring manual handling for ambiguous conflicts.

### Negative

- Requires sync code to query tombstoned rows, not just active recipes.
- Manual conflict UX adds product and test surface area.
- Correctness depends on consistent timestamp updates for every durable recipe mutation.

### Risks and mitigations

| Risk                                                        | Mitigation                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Device clock skew causes wrong winner                       | Use manual conflict fallback for close/equal/missing timestamps; prefer provider/server timestamps after successful sync |
| Soft-deleted recipes reappear                               | Keep tombstones until successful sync plus retention expiry; include tombstones in sync plans                            |
| `checkout_history` overwrites across devices                | Treat it as durable metadata; allow only non-lossy union merges for checkout-only concurrent changes                     |
| Existing implementation filters deleted records out of sync | Record an alignment gap until sync planning includes tombstones                                                          |

## Operational impact

- **Performance / cost:** Sync planning must read active and tombstoned syncable recipes, which may require indexes or bounded tombstone retention as data grows.
- **Debugging:** Inspect `updated_at`, `deleted_at`, `last_synced_at`, `synced`, `sync_error`, and `checkout_history` together when diagnosing sync behavior.
- **Developer workflow:** Any mutation helper that changes durable recipe state must update `updated_at` and mark sync state consistently.

## Examples (optional)

- A user deletes a recipe offline. The local row stays in Dexie with `deleted_at`, disappears from active recipe views, and later uploads the tombstone when sync is available.
- A user marks a recipe as made on two devices. If both changes only add checkout entries, sync can merge the two dates without asking the user.
- A user edits ingredients on one device while another device restores a deleted copy. If ordering is not clear, the app shows a manual conflict instead of guessing.

## Compliance (optional)

Not applicable beyond general data-loss prevention expectations for user-owned content.

## Enforcement rules

- **Cursor / agent rules:** Future "Supabase enhancement boundary," "Local data and Dexie ownership," and "ADR compliance" rules should cite this ADR for sync-related changes.
- **Code / architecture:** Sync planning must operate through service/model helpers, validate persisted shapes, include tombstones, and avoid direct component-level cloud reconciliation logic.
- **When to revisit:** Introduce a successor ADR if WFD adopts real-time collaborative editing, provider-neutral sync contracts with materially different semantics, encrypted cloud backups, or field-level merge policies beyond `checkout_history`.

## Supersession notes

- **When to supersede:** If the core invariant changes from local-first Dexie with cloud replica sync to remote-primary or collaborative-source-of-truth sync.
- **Stable identifiers:** This file remains `ADR-005-sync-and-conflict-resolution.md`.

---

## Orchestrated development

Orchestration is not required for writing this ADR alone. It is required for implementation work that changes sync planning, conflict UI, tombstone retention, or durable recipe mutation semantics.

### Relevant ADRs for implementation

- [ADR-001: Product operating model](ADR-001-product-operating-model.md)
- [ADR-002: Local data ownership](ADR-002-local-data-ownership.md)
- [ADR-003: AI suggestion lifecycle](ADR-003-ai-suggestion-lifecycle.md)
- [ADR-004: Account and cloud enhancement model](ADR-004-account-and-cloud-enhancement-model.md)
- ADR-005: Sync and conflict resolution (this document)

### Planning artifact

- Omit until a phased sync implementation plan exists.

### Builder scope boundary

- N/A for this ADR-only change. Implementation work should be split into bounded changes for sync planning, mutation timestamp discipline, conflict UX, and retention/purge behavior.

### Validator expectations

- Verify sync planning includes tombstoned rows and does not restore deleted records accidentally.
- Verify local recipe-book behavior remains usable without auth, network, or Supabase.
- Verify conflict resolution does not silently overwrite ambiguous concurrent edits.

### Test role and evidence

- Add focused tests for local-only upload, cloud-only download, tombstone propagation, restore propagation, newer-side wins, ambiguity/manual conflict, and checkout-history union where implemented.
- Include offline/logged-out scenarios for local edit/delete/restore continuity before sync resumes.

### Alignment gaps

- Record current implementation gaps in [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md) when sync code filters out tombstones, hard-deletes local rows before tombstone propagation, or omits conflict handling required by this ADR.

### Merge / workflow gates

- [x] ADR created for sync and conflict resolution backlog item.
- [ ] Known deviations documented when implementation lags this ADR.
- [ ] Validation evidence recorded when behavior changes touch this boundary.
