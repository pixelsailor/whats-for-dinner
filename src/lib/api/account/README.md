# Account API Service Layer

## Overview

The Account API service layer provides comprehensize user profile mangagement functionality in Supabase.

**Key Features**

- User permissions
- User recipe preferences

## Public Database Tables

### `user_profiles`

| name          | format        | nullable | default            |
| ------------- | ------------- | -------- | ------------------ |
| id            | `text`        | x        | uuid_generate_v4() |
| user_id       | `uuid`        | x        |                    |
| created_at    | `timestamptz` | x        | now()              |
| updated_at    | `timestamptz` | √        |                    |
| ai_assistance | `boolean`     | x        | false              |
| cloud_storage | `boolean`     | x        | false              |
| preferences   | `jsonb`       | x        | {}                 |
