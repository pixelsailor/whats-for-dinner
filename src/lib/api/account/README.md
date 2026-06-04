# Account API Service Layer

## Overview

The Account API service layer provides user profile and preferences management in Supabase.

**Key features**

- User permission flags (`ai_assistance`, `cloud_storage`) on `user_profiles`
- User recipe preferences on `user_preferences`

## Public database tables

### `user_profiles`

Permission flags for signed-in users. Read via `AccountService.getUserProfile()` and `hasPermission()`.

| name          | format        | nullable | default            |
| ------------- | ------------- | -------- | ------------------ |
| id            | `text`        | x        | uuid_generate_v4() |
| user_id       | `uuid`        | x        |                    |
| created_at    | `timestamptz` | x        | now()              |
| updated_at    | `timestamptz` | √        |                    |
| ai_assistance | `boolean`     | x        | false              |
| cloud_storage | `boolean`     | x        | false              |
| preferences   | `jsonb`       | x        | {}                 |

**Legacy column:** `preferences` jsonb is **deprecated and unused**. Live preference data is in `user_preferences`. Dropping the column is a Supabase migration (not tracked here).

### `user_preferences`

Canonical store for user recipe preferences. Read/write via `AccountService.getUserPreferences()` and `updateUserPreferences()`.

Validated with `UserPreferencesSchema` (payload) and `UserPreferencesRepsonseSchema` (row including `id`, `user_id`, timestamps).

**Product usage**

- **`/preferences`** — full row edit (diet, allergies, equipment, etc.).
- **`/recipes/new`** — only `use_ai_assistance` is consulted to gate optional AI augmentation on form-created recipes. Other preference fields do **not** pre-fill or constrain manual recipe form data.

## Schemas

| Schema | Maps to |
| ------ | ------- |
| `UserProfileSchema` | `user_profiles` row (includes legacy `preferences` jsonb until column drop) |
| `UserPreferencesSchema` | Preference fields on `user_preferences` |
| `UserPreferencesRepsonseSchema` | Full `user_preferences` row |
