# Cloud API Service Layer

## Overview

The Cloud API service layer provides comprehensize recipe mangagement functionality in the Supabase cloud environment. This includes syncing across devices, archiving, and sharing recipes.

## Public Database Tables

### `shared_links`

| name | format | nullable | default |
|------|--------|----------|-------------|
| token      | `text`        | x |       |
| user_id    | `uuid`        | x |       |
| recipe_id  | `uuid`        | x |       |
| created_at | `timestamptz` | x | now() |
| expires_at | `timestamptz` | √ |       |
