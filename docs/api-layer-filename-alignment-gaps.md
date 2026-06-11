# API layer filename alignment gaps

Audit of `src/lib/api/**` against the layer conventions in [`src/lib/api/README.md`](../src/lib/api/README.md) and domain READMEs (`account/`, `cloud/`). A file’s **suffix** (`*.service.ts`, `*.model.ts`, `*.queries.ts`, etc.) is treated as a contract for what belongs inside it.

**Scope:** Naming vs content mismatches and missing files implied by the README. This is separate from product/ADR drift in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) (e.g. GAP-002 sync tombstones), though some todos overlap.

**Last reviewed:** 2026-06-03

---

## Expected roles (reference)

| Suffix         | Expected content                                                |
| -------------- | --------------------------------------------------------------- |
| `*.schemas.ts` | Zod validation only                                             |
| `*.types.ts`   | `z.infer` types from schemas                                    |
| `*.model.ts`   | Pure domain helpers; **no** I/O, **no** secrets                 |
| `*.service.ts` | Remote/provider I/O; validate at boundaries; typed methods      |
| `*.queries.ts` | TanStack `createQuery` wrappers; `queryFn` = fetch + parse only |
| `index.ts`     | Public barrel for the module                                    |

---

## Gaps by file

### `auth/auth.service.ts`

|              |                                                                                                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Auth integration used by routes/actions.                                                                                                                                                                                                     |
| **Actual**   | Thin Supabase wrapper; **no references** in `src/`. Login uses `supabase.auth.signInWithPassword` directly in `src/routes/auth/+page.server.ts` and `src/routes/api/auth/login/+server.ts`. File comments say to prefer the client directly. |
| **Impact**   | Dead `*.service.ts`; `auth.schemas.ts` unused by any service method.                                                                                                                                                                         |

### `account/account.service.ts`

|              |                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Supabase I/O with **Zod `safeParse`** on inputs/outputs per README.                                                                                                                                                 |
| **Actual**   | ~~Raw Supabase calls; returns untyped/`any`-ish rows; no schema validation at boundary.~~ **Resolved (ACCT-1):** `account.model.ts` parsers validate profile/preferences at boundaries; service returns typed rows. |
| **Impact**   | ~~Drift from schema-led contract (ADR-008).~~ Boundary validation aligned for profile and preferences I/O.                                                                                                          |

### `account/account.model.ts`

|              |                                                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Pure helpers only.                                                                                                                                                                             |
| **Actual**   | ~~`hasPermission` unused; duplicate async DB `hasPermission` on service.~~ **Resolved (ACCT-3):** `hasPermission(profile, …)` seeds session flags after login; service DB-only helper removed. |
| **Impact**   | ~~Duplicate concept, wrong layer for the live code path.~~ Single pure permission check on validated profile rows.                                                                             |

### `account/account.schemas.ts` (profile vs preferences)

|              |                                                                                                                                                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Expected** | `UserProfileSchema` mirrors `user_profiles`; live preferences use `user_preferences` via `UserPreferencesSchema`.                                                                                                                                                                                                  |
| **Actual**   | ~~Confusion: nested `preferences` on `UserProfileSchema` looked like the live store.~~ **Clarified (ACCT-2):** jsonb is legacy/unused; `user_preferences` is canonical. Field stays on `UserProfileSchema` until Supabase drops the column. Documented in [`account/README.md`](../src/lib/api/account/README.md). |
| **Impact**   | Application code must not read/write profile jsonb; remove from schema only after DB migration.                                                                                                                                                                                                                    |

### `common/common.model.ts`

|              |                                                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Shared pure utilities.                                                                                                                                                              |
| **Actual**   | ~~Instantiates and exports a **Supabase browser client** (`createClient` + public env).~~ **Removed (COM-3).** Documented in [`common/README.md`](../src/lib/api/common/README.md). |

### `common/common.schemas.ts` + `common/common.types.ts` vs `ai/ai.types.ts`

|              |                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Single `ApiResponse` envelope in `common`.                                                                                                          |
| **Actual**   | ~~`ApiResponse` / `ApiResponseSchema` defined in both **common** and **ai**; `sync.service.ts` imports from `../ai`.~~ **Resolved (COM-1, COM-2).** |

### `cloud/cloud.service.ts` + `cloud.schemas.ts`

|              |                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Service validates shared-link and recipe payloads with Zod at the boundary.                                                                                                                                                                          |
| **Actual**   | ~~`SharedRecipeSchema` exists; service does not `safeParse` responses.~~ **Resolved (CLD-2):** `cloud.model.ts` parsers validate `SharedRecipeSchema` and canonical `CloudRecipeSchema`; `CloudService` calls parsers on all recipe/shared-link I/O. |
| **Impact**   | ~~Schemas file underused at the boundary named for integration.~~ Boundary validation aligned; recipe rows use `$lib/api/recipe` schemas (no cloud shadow row schema).                                                                               |

### `cloud/sync.service.ts`

|              |                                                                                      |
| ------------ | ------------------------------------------------------------------------------------ |
| **Expected** | Dexie + `CloudService` orchestration (largely **aligned**).                          |
| **Actual**   | ~~Imports `ApiResponse` from `../ai` instead of `../common`.~~ **Resolved (COM-2).** |

---

## Resolution todo list

Use this as a sequenced backlog. Items may be combined in one PR when touching the same domain.

### AI module

- [x] **AI-1** Move OpenAI provider functions from `ai.model.ts` → `ai.server.service.ts`. `ai.model.ts` holds pure parse helpers only.
- [x] **AI-2** Extract HTTP `fetch` + `endpoints` into `ai.service.ts` (`postSuggestions`, `postSuggestedRecipe`). `ai.queries.ts` is thin `createQuery` wrappers.
- [x] **AI-3** `ai.service.ts` implements same-origin HTTP; no stub remains.
- [x] **AI-4** `ai/index.ts` exports model, schemas, types, service, and queries (server provider stays off the barrel).
- [x] **AI-5** `/api/recipes` and recipe form actions use `ai.server.service.ts` (Responses API). `src/lib/server/openai.ts` is a deprecated re-export shim.
- [x] **AI-6** Routes validate request bodies and provider JSON via Zod `safeParse` in `ai.model.ts` parsers (partial GAP-006 remediation for suggestion/recipe routes).

### Auth module

- [ ] **AUTH-1** Either wire `AuthService` into `auth/+page.server.ts` and `api/auth/login` **or** delete `auth.service.ts` and trim `auth/index.ts` exports if the team standard is direct Supabase client use.
- [ ] **AUTH-2** If keeping `AuthService`, use `auth.schemas.ts` to validate sign-in responses at the boundary; otherwise mark schemas as deprecated or remove unused schemas.

### Account module

- [x] **ACCT-1** Validate `getUserProfile` / `updateUser` / preferences read/write with `UserProfileSchema`, `UserPreferencesSchema`, and `UserPreferencesRepsonseSchema` via `safeParse`.
- [x] **ACCT-2** Clarify profile vs preferences: `user_preferences` is canonical; legacy `user_profiles.preferences` jsonb documented as unused. Keep `preferences` on `UserProfileSchema` until column drop. See [`account/README.md`](../src/lib/api/account/README.md).
- [x] **ACCT-3** Use `account.model.ts` `hasPermission(profile, …)` in server/layout code after profile fetch; remove redundant async DB-only `hasPermission` on the service **or** rename service method to `fetchPermissionFlag` if a round-trip is required.

### Common module

- [x] **COM-1** Deduplicate `ApiResponse`: keep types in `common/common.types.ts` (and schema in `common.schemas.ts`); remove duplicates from `ai/ai.types.ts` (re-export from common if needed).
- [x] **COM-2** Point `sync.service.ts` (and any other consumers) at `$lib/api/common` for `ApiResponse`.
- [x] **COM-3** Rename `common.model.ts` → `common.client.ts` (or delete if unused) and document that Supabase clients come from layout/`locals`, not a shared model file.

### Cloud module

- [x] **CLD-1** Move share token generation from `cloud.service.ts` to a pure helper in `cloud.model.ts` (or `cloud/share-token.ts`); service calls helper then Supabase insert.
- [x] **CLD-2** Apply `SharedRecipeSchema` (and recipe row schemas where appropriate) in `CloudService` methods via `safeParse`.
- [x] **CLD-3** (Related product gap) Tombstone-aware sync in `sync.service.ts` / `cloud.model.ts` — see **GAP-002** in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).
- [ ] **CLD-4** Cloud sync validation repair UI: when `CloudParseError` identifies a failing cloud recipe (`recipeId`, `recipeTitle`, `fieldErrors`), surface it in the sync flow with a dialog and editable form fields so the user can correct invalid legacy data and retry sync — do not silently normalize rows at the schema boundary.

### Recipe module

- [x] **REC-1** No `recipe.service.ts` by design; local I/O documented under stores + [`src/lib/api/recipe/README.md`](../src/lib/api/recipe/README.md).

### Documentation

- [x] **DOC-1** [`src/lib/api/README.md`](../src/lib/api/README.md): `Promise` service pattern, TanStack in `*.queries.ts`, local recipe table points at stores/`db` (no API service file).
- [ ] **DOC-2** When a gap row is fully fixed, strike or move it under **Resolved** below with PR link.

---

## Resolved

### Account module (2026-06-04)

| Item                                | Resolution                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ACCT-1** / service boundaries     | `account.model.ts` exposes `parseUserProfile`, `parseUserProfileUpdate`, `parseUserProfileRows`, `parseUserPreferencesResponse`, `parseUserPreferencesUpdate`, and `parseUserPreferencesResponseRows` (Zod `safeParse`). `AccountService` validates all profile and preferences read/write paths; throws `AccountParseError` on contract mismatch. Covered by `account.model.test.ts`.                         |
| **ACCT-2** / profile vs preferences | Both Supabase tables are real: `user_profiles` holds permission flags plus legacy unused `preferences` jsonb; `user_preferences` holds live preference rows. Schema and docs clarified in [`account/README.md`](../src/lib/api/account/README.md). Remove `preferences` from `UserProfileSchema` only after the jsonb column is dropped. On `/recipes/new`, only `use_ai_assistance` is read from preferences. |
| **ACCT-3** / `hasPermission`        | Pure `hasPermission(profile, …)` in `account.model.ts` (`ProfilePermissionFlag`) seeds `wfd-permissions` in `auth/+page.server.ts` after `getUserProfile()`. Removed redundant async `AccountService.hasPermission` DB round-trip.                                                                                                                                                                             |

### Common module (2026-06-03)

| Item                        | Resolution                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **COM-1** / `ApiResponse`   | Single source in `common/common.schemas.ts` and `common/common.types.ts`; `ai/ai.types.ts` re-exports from `$lib/api/common`. Added `common/index.ts` barrel.                                                                        |
| **COM-2** / sync imports    | `sync.service.ts` imports `ApiResponse` from `$lib/api/common` instead of `../ai`.                                                                                                                                                   |
| **COM-3** / Supabase client | Removed unused `common.model.ts` singleton. [`common/README.md`](../src/lib/api/common/README.md) documents that Supabase clients come from `locals.supabase`, layout `data.supabase`, or service injection — not `$lib/api/common`. |

### Cloud module (2026-06-04)

| Item                           | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CLD-2** / service boundaries | `cloud.model.ts` exposes `parseSharedRecipe`, `parseCloudRecipe`, `parseCloudRecipeMaybe`, `parseCloudRecipeRows`, `parseCloudRecipeUpload`, `parseCloudRecipeUpdate`, and `parseCloudRecipeSyncSummaryRows` (Zod `safeParse`). `CloudService` validates all recipe and `shared_links` read/write paths; upload stamps `owner_id` from session. Recipe rows use canonical `CloudRecipeSchema` from `recipe.schemas.ts`; `CloudParseError` carries `recipeId`, `recipeTitle`, and `fieldErrors` for failing rows. Legacy repair UI tracked as **CLD-4**. Covered by `cloud.model.test.ts`. |
| **CLD-1** / share tokens       | `generateShareToken` and `encodeShareToken` live in `cloud.model.ts`; `CloudService.createSharedRecipeUrl` calls the helper then inserts into `shared_links`. Covered by `cloud.model.test.ts`.                                                                                                                                                                                                                                                                                                                                                                                           |

### Cloud module (2026-06-05)

| Item                       | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CLD-3** / tombstone sync | `isSyncable` includes tombstoned rows in sync planning (archived still excluded). `SyncService.buildPlan` reads syncable local and remote rows via `getLocalSyncableRecipes` / `getRemoteSyncableRecipes`. `categorizeConflict` resolves delete/restore drift: newer tombstone wins over older active row; newer active row wins over older tombstone (restore). Remediates **GAP-002**. Covered by `cloud.model.test.ts`. |

### Recipe module and API README (2026-06-03)

| Item                   | Resolution                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **REC-1** / `recipe/`  | **No** `recipe.service.ts`. `$lib/api/recipe` exports schemas + types only; Dexie reads via [`src/lib/stores/recipes.ts`](../src/lib/stores/recipes.ts); writes via routes/store/`db` helpers. Documented in [`src/lib/api/recipe/README.md`](../src/lib/api/recipe/README.md) and Local Recipe Management in [`src/lib/api/README.md`](../src/lib/api/README.md). |
| **DOC-1** / API README | `*.service.ts` pattern documents `async`/`Promise` (not Observables), TanStack in `*.queries.ts`, and explicit exclusion of Dexie from service files.                                                                                                                                                                                                              |

### AI module (2026-05-19)

| Item                   | Resolution                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ai.service.ts`        | Same-origin HTTP client (`postSuggestions`, `postSuggestedRecipe`, `AI_ENDPOINTS`).                                          |
| `ai.server.service.ts` | Server-only OpenAI Responses API (not barrel-exported).                                                                      |
| `ai.model.ts`          | Pure `parseStructuredOutput` / `safeParse` helpers and `AiParseError`.                                                       |
| `ai.queries.ts`        | TanStack `createQuery` wrappers delegating to `ai.service.ts`.                                                               |
| `ai/index.ts`          | Exports model, schemas, types, service, queries.                                                                             |
| Dual provider paths    | `/api/recipes` and recipe form actions migrated to Responses API; `src/lib/server/openai.ts` is a deprecated re-export shim. |
| GAP-006 (partial)      | Suggestion/recipe/new routes validate bodies and provider JSON with Zod; legacy Chat Completions removed from active paths.  |

---

## Related

| Topic                       | Location                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| API layer overview          | [`src/lib/api/README.md`](../src/lib/api/README.md)                                            |
| TanStack vs service split   | [`docs/tanstack-query.md`](./tanstack-query.md), ADR-016                                       |
| AI provider contract        | ADR-007, GAP-005 / GAP-006 in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) |
| Cloud sync responsibilities | [`src/lib/api/cloud/README.md`](../src/lib/api/cloud/README.md)                                |
