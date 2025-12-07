# Cloud API Service Layer

## Overview

The Cloud API service layer provides comprehensize recipe mangagement functionality in the Supabase cloud environment. This includes syncing across devices, archiving, and sharing recipes.

## Responsibilities

- `CloudService`: remote-only Supabase access (recipes CRUD, archived recipes, shared links). No Dexie usage.
- Sync model (`cloud.model.ts`): pure helpers like `buildSyncPlan` and `isActive` to compare local vs remote data without side effects.
- `SyncService`: orchestration layer that coordinates Dexie (local) with `CloudService` (remote) using the sync model.

## Supabase Trigger Functions

The following actions are triggered automatically when mutating database records

| Name                     | Table             | Event        | Description |
|--------------------------|-------------------|--------------|-------------------------------------------------------------------------------------|
| `clear_recipe_shared_id` | `shared_links`    | AFTER DELETE | Nullifies the `shared_id` value on a recipe when the `shared_link` entry is deleted |
| `delete_shared_link_on_unshare` | `recipes`  | AFTER UPDATE | Deletes the `shared_link` entry when `shared_id` is set to NULL |
| `update_recipe_last_synced_at`  | `recipes`  | BEFORE INSERT/UPDATE | Updates the `last_synced_at` timestamp for inserted and updated recipes. Returns updated value timestamp. |
| `set_user_id`              | `shared_links`  | BEFORE INSERT | Automatically set the user ID for shared recipes -- prevents unauthed users from sharing |
| `sync_shared_id`           | `shared_links`  | AFTER INSERT  | Copies the shared url token to the recipe |
| `update_updated_at_column` | `user_profiles` | BEFORE UPDATE | Updates `user_profile` row |
| `update_updated_at_column` | `recipes`       | BEFORE UPDATE | Updates `recipes` row -- This may need to be removed. It appears there could be a discrepency if changes are made locally but not synced immediately |
| `set_recipe_owner_id`      | `recipes`       | BEFORE INSERT/UPDATE | Sets the `owner_id` of the recipe to the uid of the uploading user. Function fails if user isn't authorized |

## Public Database Tables

### `shared_links`

| name | format | nullable | default |
|------|--------|----------|-------------|
| token      | `text`        | x |       |
| user_id    | `uuid`        | x |       |
| recipe_id  | `uuid`        | x |       |
| created_at | `timestamptz` | x | now() |
| expires_at | `timestamptz` | √ |       |
