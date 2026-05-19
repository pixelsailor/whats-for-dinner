# API layer filename alignment gaps

Audit of `src/lib/api/**` against the layer conventions in [`src/lib/api/README.md`](../src/lib/api/README.md) and domain READMEs (`account/`, `cloud/`). A file’s **suffix** (`*.service.ts`, `*.model.ts`, `*.queries.ts`, etc.) is treated as a contract for what belongs inside it.

**Scope:** Naming vs content mismatches and missing files implied by the README. This is separate from product/ADR drift in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) (e.g. GAP-002 sync tombstones), though some todos overlap.

**Last reviewed:** 2026-05-19

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

### `ai/ai.service.ts`

|              |                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Injectable AI **client** for same-origin `/api/...` calls (or thin facade over them), with request/response validation.      |
| **Actual**   | Comment-only stub; no exports or methods.                                                                                    |
| **Impact**   | Filename promises a service that does not exist; callers use `ai.queries.ts` and server routes import `ai.model.ts` instead. |

### `ai/ai.model.ts`

|              |                                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Pure helpers (prompt builders, parsers, guards); no network or provider SDK.                                                                                                           |
| **Actual**   | Server-only OpenAI **Responses API** calls (`$env/static/private`, `OpenAI` client, `responses.create`).                                                                               |
| **Impact**   | Violates `*.model.ts` contract and ADR-006 boundary (provider + secrets belong in server service code, not “model”). Misleading for anyone importing from `$lib/api/ai` on the client. |

### `ai/ai.queries.ts`

|              |                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| **Expected** | TanStack query factories only; delegate HTTP to `ai.service.ts`.                                           |
| **Actual**   | Owns `fetch`, endpoint map, and `query()` helper (appropriate for **service**, duplicated responsibility). |
| **Impact**   | Layer split in README (`service` = HTTP, `queries` = cache) is inverted for AI.                            |

### `ai/index.ts`

|              |                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **Expected** | Public API for the AI module (types, schemas, model, **service**, optionally queries).           |
| **Actual**   | Re-exports `ai.model`, `ai.schemas`, `ai.types` only; omits `ai.service.ts` and `ai.queries.ts`. |
| **Impact**   | Barrel does not match module surface; consumers deep-import `ai.queries`.                        |

### `ai/` — dual provider paths (cross-cutting)

|              |                                                                                                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Single AI integration path per ADR-007 (Responses + Zod in `src/lib/api/ai/`).                                                                                                                                                      |
| **Actual**   | New flows use `ai.model.ts` (`/api/suggestions/*`, `/api/recipes/new`); legacy Chat Completions remain in `src/lib/server/openai.ts` (`/api/recipes` POST). `appendRecipeDetails` exists in **both** `ai.model.ts` and `openai.ts`. |
| **Impact**   | Not a single-file naming issue, but `ai.model.ts` name hides that it is only **partial** server AI surface.                                                                                                                         |

### `auth/auth.service.ts`

|              |                                                                                                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Auth integration used by routes/actions.                                                                                                                                                                                                     |
| **Actual**   | Thin Supabase wrapper; **no references** in `src/`. Login uses `supabase.auth.signInWithPassword` directly in `src/routes/auth/+page.server.ts` and `src/routes/api/auth/login/+server.ts`. File comments say to prefer the client directly. |
| **Impact**   | Dead `*.service.ts`; `auth.schemas.ts` unused by any service method.                                                                                                                                                                         |

### `account/account.service.ts`

|              |                                                                                       |
| ------------ | ------------------------------------------------------------------------------------- |
| **Expected** | Supabase I/O with **Zod `safeParse`** on inputs/outputs per README.                   |
| **Actual**   | Raw Supabase calls; returns untyped/`any`-ish rows; no schema validation at boundary. |
| **Impact**   | Drift from schema-led contract (ADR-008).                                             |

### `account/account.model.ts`

|              |                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Expected** | Pure helpers only.                                                                                                                         |
| **Actual**   | `hasPermission(user, permission)` is pure and correct, but **unused**; service defines a different async `hasPermission` that hits the DB. |
| **Impact**   | Duplicate concept, wrong layer for the live code path; model helper never adopted.                                                         |

### `account/account.service.ts` + `account.schemas.ts` (data shape)

|              |                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | One coherent account/preferences model.                                                                                                |
| **Actual**   | `UserProfileSchema.preferences` embeds preferences on `user_profiles`, while service reads/writes a separate `user_preferences` table. |
| **Impact**   | Schema file name suggests SoT for profile shape, but service persistence does not match `UserProfileSchema` layout.                    |

### `common/common.model.ts`

|              |                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Shared pure utilities.                                                                                                                                              |
| **Actual**   | Instantiates and exports a **Supabase browser client** (`createClient` + public env).                                                                               |
| **Impact**   | Wrong suffix; file is unused anywhere in `src/` (dead). Should be `common.client.ts` or removed in favor of layout-injected clients per supabase-enhancement rules. |

### `common/common.schemas.ts` + `common/common.types.ts` vs `ai/ai.types.ts`

|              |                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Expected** | Single `ApiResponse` envelope in `common`.                                                                         |
| **Actual**   | `ApiResponse` / `ApiResponseSchema` defined in both **common** and **ai**; `sync.service.ts` imports from `../ai`. |
| **Impact**   | `ai.types.ts` holds cross-cutting API types, not AI-specific domain types.                                         |

### `cloud/cloud.service.ts`

|              |                                                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Remote-only Supabase operations (aligned with cloud README).                                                                                  |
| **Actual**   | Mostly remote CRUD; **`createSharedRecipeUrl`** generates share tokens locally (`randomBytes`, alphabet loop) before insert.                  |
| **Impact**   | Token generation is domain logic, belongs in `cloud.model.ts` (or `cloud/share.utils.ts`) with service calling a pure `generateShareToken()`. |

### `cloud/cloud.service.ts` + `cloud.schemas.ts`

|              |                                                                            |
| ------------ | -------------------------------------------------------------------------- |
| **Expected** | Service validates shared-link and recipe payloads with `cloud.schemas.ts`. |
| **Actual**   | `SharedRecipeSchema` exists; service does not `safeParse` responses.       |
| **Impact**   | Schemas file underused at the boundary named for integration.              |

### `cloud/sync.service.ts`

|              |                                                                                 |
| ------------ | ------------------------------------------------------------------------------- |
| **Expected** | Dexie + `CloudService` orchestration (largely **aligned**).                     |
| **Actual**   | Imports `ApiResponse` from `../ai` instead of `../common`.                      |
| **Impact**   | Incorrect module coupling; reinforces duplicate `ApiResponse` in `ai.types.ts`. |

### `recipe/` (missing `recipe.service.ts`)

|              |                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | README “Local Recipe Management” lists Dexie integration and recipe CRUD under API services.                                                                      |
| **Actual**   | Only `recipe.schemas.ts` + `recipe.types.ts`; local CRUD lives in `src/lib/stores/recipes.ts` and `src/lib/db.ts`.                                                |
| **Impact**   | Either an intentional omission (document README) or a missing `recipe.service.ts` / `recipe.local.service.ts` for Dexie mutations to match the documented layout. |

### `src/lib/api/README.md` (documentation vs filenames)

|              |                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expected** | Accurate pattern description.                                                                                                                                   |
| **Actual**   | States service methods “return Observables”; implementations use `async`/`Promise`. Documents local recipe “Key Services” without a `recipe.*.ts` service file. |
| **Impact**   | Misleading for contributors aligning new code to filenames.                                                                                                     |

---

## Resolution todo list

Use this as a sequenced backlog. Items may be combined in one PR when touching the same domain.

### AI module

- [ ] **AI-1** Move OpenAI provider functions from `ai.model.ts` → `ai.service.ts` (or `ai.server.service.ts` if you want an explicit server-only name). Keep `ai.model.ts` for pure prompt/parse helpers only, or delete the file if nothing pure remains.
- [ ] **AI-2** Extract HTTP `fetch` + `endpoints` + `query()` from `ai.queries.ts` into `ai.service.ts` (e.g. `postSuggestion`, `postRecipe`). Leave `ai.queries.ts` as thin `createQuery` wrappers calling the service.
- [ ] **AI-3** Implement or remove `ai.service.ts` stub; ensure no comment-only service file remains.
- [ ] **AI-4** Update `ai/index.ts` to export service (+ optionally `ai.queries.ts`) as the module public API.
- [ ] **AI-5** Consolidate AI routes on one provider path: migrate `/api/recipes` off `src/lib/server/openai.ts` to `ai.service.ts`, then shrink or delete duplicate `appendRecipeDetails` / legacy handlers.
- [ ] **AI-6** Add Zod `safeParse` at server boundaries for AI JSON (coordinate with GAP-006); parse in service or route, not only `JSON.parse` in handlers.

### Auth module

- [ ] **AUTH-1** Either wire `AuthService` into `auth/+page.server.ts` and `api/auth/login` **or** delete `auth.service.ts` and trim `auth/index.ts` exports if the team standard is direct Supabase client use.
- [ ] **AUTH-2** If keeping `AuthService`, use `auth.schemas.ts` to validate sign-in responses at the boundary; otherwise mark schemas as deprecated or remove unused schemas.

### Account module

- [ ] **ACCT-1** Validate `getUserProfile` / `updateUser` / preferences read/write with `UserProfileSchema`, `UserPreferencesSchema`, and `UserPreferencesRepsonseSchema` via `safeParse`.
- [ ] **ACCT-2** Resolve `user_profiles.preferences` vs `user_preferences` table: align `account.schemas.ts` with persistence, or split schemas (`account.profile.schemas.ts` / `account.preferences.schemas.ts`).
- [ ] **ACCT-3** Use `account.model.ts` `hasPermission(profile, …)` in server/layout code after profile fetch; remove redundant async DB-only `hasPermission` on the service **or** rename service method to `fetchPermissionFlag` if a round-trip is required.

### Common module

- [ ] **COM-1** Deduplicate `ApiResponse`: keep types in `common/common.types.ts` (and schema in `common.schemas.ts`); remove duplicates from `ai/ai.types.ts` (re-export from common if needed).
- [ ] **COM-2** Point `sync.service.ts` (and any other consumers) at `$lib/api/common` for `ApiResponse`.
- [ ] **COM-3** Rename `common.model.ts` → `common.client.ts` (or delete if unused) and document that Supabase clients come from layout/`locals`, not a shared model file.

### Cloud module

- [ ] **CLD-1** Move share token generation from `cloud.service.ts` to a pure helper in `cloud.model.ts` (or `cloud/share-token.ts`); service calls helper then Supabase insert.
- [ ] **CLD-2** Apply `SharedRecipeSchema` (and recipe row schemas where appropriate) in `CloudService` methods via `safeParse`.
- [ ] **CLD-3** (Related product gap) Tombstone-aware sync in `sync.service.ts` / `cloud.model.ts` — see **GAP-002** in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).

### Recipe module

- [ ] **REC-1** Decide explicitly: add `recipe.service.ts` (Dexie/local CRUD facade used by stores and routes) **or** update [`src/lib/api/README.md`](../src/lib/api/README.md) to state local recipe I/O lives in `src/lib/stores/` only (no `recipe.service.ts`).

### Documentation

- [ ] **DOC-1** Update [`src/lib/api/README.md`](../src/lib/api/README.md): remove Observable claim; document actual `Promise` + TanStack split; clarify `recipe/` has no service by design (after REC-1).
- [ ] **DOC-2** When a gap row is fully fixed, strike or move it under **Resolved** below with PR link.

---

## Resolved

_(None yet.)_

---

## Related

| Topic                       | Location                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| API layer overview          | [`src/lib/api/README.md`](../src/lib/api/README.md)                                            |
| TanStack vs service split   | [`docs/tanstack-query.md`](./tanstack-query.md), ADR-016                                       |
| AI provider contract        | ADR-007, GAP-005 / GAP-006 in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) |
| Cloud sync responsibilities | [`src/lib/api/cloud/README.md`](../src/lib/api/cloud/README.md)                                |
