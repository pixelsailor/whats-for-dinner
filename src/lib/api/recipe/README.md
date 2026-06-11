# Recipe API module (contracts)

## Overview

The recipe module under `src/lib/api/recipe/` holds **Zod schemas and inferred types** for saved recipes and related shapes. It does **not** include a `recipe.service.ts`.

Local recipe data is owned by **Dexie** ([ADR-002](../../../../adrs/ADR-002-local-data-ownership.md)). Reads and reactive subscriptions live in **`src/lib/stores/`** (for example [`recipes.ts`](../../stores/recipes.ts)). Durable writes are performed via **`db`** from routes, form actions, or store/db helpers—not through this API folder.

Remote backup, sync, and sharing use [`../cloud/`](../cloud/README.md) (`CloudService`, `SyncService`).

## Layout

| File                | Role                                            |
| ------------------- | ----------------------------------------------- |
| `recipe.schemas.ts` | Zod validation for recipe entities and payloads |
| `recipe.types.ts`   | `z.infer` types from schemas                    |
| `index.ts`          | Public barrel (schemas + types only)            |

## By design: no `*.service.ts`

`*.service.ts` in WFD means **remote or provider I/O** (HTTP, Supabase, OpenAI), with validation at the boundary. Dexie CRUD is **not** modeled as an API service file.

- **Import types/schemas** from `$lib/api/recipe` (or `$lib/api/recipe/recipe.types`).
- **Subscribe to local recipes** via `$lib/stores/recipes` LiveQuery stores.
- **Persist changes** through centralized store or `src/lib/db/` helpers when touching write paths (see [`.cursor/rules/local-data-dexie-ownership.mdc`](../../../../.cursor/rules/local-data-dexie-ownership.mdc)).

Cloud-driven Dexie updates remain in `SyncService` ([`../cloud/sync.service.ts`](../cloud/sync.service.ts)).

## Related

| Topic              | Location                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| API layer overview | [`../README.md`](../README.md)                                                                       |
| Store read model   | [`../../stores/README.md`](../../stores/README.md)                                                   |
| Frontend data flow | [ADR-016](../../../../adrs/ADR-016-frontend-data-flow-and-svelte-dx.md)                              |
| Filename audit     | [`docs/api-layer-filename-alignment-gaps.md`](../../../../docs/api-layer-filename-alignment-gaps.md) |
