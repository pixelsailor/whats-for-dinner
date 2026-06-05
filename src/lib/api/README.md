# What's For Dinner API Service Layer

## Overview

The What's For Dinner (referred to herein as WFD) API service layer provides a comprehensive, module architecture for managing all backend interactions within the WFD application.
This service layer is organized into functional domains, each handling specific business capabilities with well-defined responsibilities and clear separation of concerns.

## Architectural Principles

- **Modular Design**: Each API slice is self-contained with its own services, models, and utilities
- **Separation of Concerns**: Clear boundaries between functional domains
- **Type Safety**: Full TypeScript integration with comprehensive type definitions
- **Consistent Patterns**: Standardized service patterns across all modules. Both **remote** and **local** requests should conform to standard **Fetch API** models
- **Monitoring Ready**: Built-in health checks and metrics collection for observability

## Data fetching (layered async)

WFD uses a **layered** model ([ADR-016](../../../adrs/ADR-016-frontend-data-flow-and-svelte-dx.md), [`.cursor/rules/frontend-data-flow.mdc`](../../../.cursor/rules/frontend-data-flow.mdc)):

- **Dexie / LiveQuery stores** (`src/lib/stores/`) — system of record for ADR-002 domains; `{ data, loading, error }` in components.
- **TanStack Query** (`createQuery` in `*.queries.ts`) — **remote** same-origin HTTP only; validate with Zod; no durable writes in `queryFn`.
- **SvelteKit `load` / form actions** — auth gates, server-only bootstrap, and mutations.

For TanStack specifics, see **[`docs/tanstack-query.md`](../../../docs/tanstack-query.md)** and [`.cursor/rules/local-data-dexie-ownership.mdc`](../../../.cursor/rules/local-data-dexie-ownership.mdc) (_Remote and cache layers_).

## File Structure and Organization Principles

1. Separation of concerns: validation (schemas), types (types), business logic (models), API calls (service)
2. Single source of truth: types derived from schemas
3. Encapsulation: internal structure hidden behind `index.ts`
4. Reusability: common patterns extracted to shared modules **within the domain** or under `src/lib/api/common/` when truly cross-domain
5. Type safety: validation at runtime, types at compile time
6. Testability: pure functions in models, service methods are testable units
7. **Structural enforcement:** All service- and domain-bound code for a capability lives under **`src/lib/api/<domain>/`**. Do **not** create ad hoc helper files elsewhere in `src/lib/` when they belong to an API domain — that breaks the module layout agents and reviewers rely on.

### Boundary with other `src/lib/` folders

| Folder                                  | Use for                                                                                                             | Not for                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **`src/lib/api/<domain>/`** (this tree) | Schemas, types, domain models, injectable services, domain queries, auth/session/permission **Supabase** operations | Generic date/string/crypto helpers unrelated to a domain                                    |
| **`src/lib/utils/`**                    | Domain-agnostic pure helpers reused app-wide — one file per concern; see [`../utils/README.md`](../utils/README.md) | Auth, AI prompts, capability policy, Supabase I/O, or any code tied to a product API domain |
| **`src/lib/stores/`**                   | Dexie LiveQuery read models and mutation helpers over ADR-002 data                                                  | Parallel domain type definitions or remote API clients                                      |
| **`src/lib/types.ts`**                  | Cross-cutting non-entity contracts                                                                                  | Recipe, auth, account, or other domain entities                                             |

**Placement test:** If you would name the file after a product domain (`auth`, `ai`, `cloud`, `account`, `recipe`, …) or it calls that domain's service/client, it belongs here — not in `$lib/utils`.

### `*.schemas.ts` — Validation Schema Definitions

**Purpose**: Centralizes Zod validation schemas for all data structures in this domain.

**Intent**: Single source of truth for validation rules. Defines request/response schemas, entity schemas, and nested structures. Used for runtime validation and type inference.

**Pattern**: All validation logic lives here. Schemas are composable and reusable. Import common/base schemas from shared modules when available.

---

### `*.types.ts` — TypeScript Type Definitions

**Purpose**: Exports TypeScript types derived from validation schemas.

**Intent**: Provides compile-time types by inferring from schemas. Ensures types stay in sync with validation rules.

**Pattern**: Types are inferred from schemas using `z.infer<typeof Schema>`. No manual type definitions. Organized by category (entities, requests, responses).

---

### `*.model.ts` — Business Logic and Utilities

**Purpose**: Domain-specific utilities, type guards, and business logic functions.

**Intent**: Encapsulates domain logic separate from API calls. Provides reusable helpers for working with domain entities.

**Pattern**: Re-exports types and schemas for convenience. Contains pure functions (type guards, formatters, calculators). No side effects or API calls.

---

### `*.service.ts` — API Service Layer

**Purpose**: Injectable service that handles HTTP communication with the backend API.

**Intent**: Abstracts API calls, enforces validation, handles authentication/authorization, and provides a typed interface for components.

**Pattern**: Remote HTTP or provider operations go through this service. Methods validate requests/responses using schemas (`safeParse` at boundaries). Authorization checks are enforced where applicable. Methods return **`async`/`Promise`** results (not RxJS Observables). TanStack Query wrappers belong in `*.queries.ts`, not in the service. Methods are organized by functional area.

**Not for Dexie:** Local IndexedDB reads and writes for ADR-002 domains (for example the recipe book) use **`src/lib/stores/`** and `src/lib/db.ts` helpers—see [Local Recipe Management](#local-recipe-management) and [`recipe/README.md`](./recipe/README.md).

---

### `index.ts` — Module Public API

**Purpose**: Barrel export file that defines the public interface of the module.

**Intent**: Single entry point for consuming the module. Encapsulates internal structure and provides a clean public API.

**Pattern**: Re-exports all public types, schemas, models, and services. No business logic. Consumers import from this file, not individual files.

## Permissions/RBAC Policies

Accessing API services and models requires authorized user permissions. Anonymous/offline users (those without an auth account) do not have access to any remote APIs. _Permissions_ are located in the `user_profiles` supabase table. _User profiles and permissions are not stored locally_.

- **User Profiles**: Available to all authorized users
- **Cloud Recipe Management**: Requires `cloud_storage` permissions
- **AI Assisted Recipes**: Requires `ai_assistance` permissions

## API Service Domains

### [Common (cross-domain)](./common/README.md)

Shared validation schemas and types (for example `ApiResponse`). **No** Supabase or other provider clients — see the Supabase module below.

### [Session client factories](./session/README.md)

**Cookie-backed Supabase client wiring for hooks and layout**

Factories for per-request SSR (`createRequestServerClient`) and universal layout (`createLayoutBrowserClient`, `createLayoutServerClient`). Anonymous public cloud reads use `createAnonymousCloudClient` in the [cloud](./cloud/) module. Domain services receive an injected `SupabaseClient` from these surfaces — see the session README for why this is separate from **auth**, **account**, and **cloud** services.

---

### Authentication

**Core authentication and user management workflows**

Handles login, password reset, registration, and MFA. **Identity operations** on an injected Supabase client (not client wiring — that is [`./session/`](./session/README.md)).
Refer to Supabase [JavaScript Client Library](https://supabase.com/docs/reference/javascript/introduction) documentation for **auth** guidance.

**Module:** [`./auth/`](./auth/) — `AuthService` (sign-in, JWT validation via `getValidatedSession`, stale-session cleanup), permission **cookie** helpers (`auth.permissions.ts`), and AI capability policy (`auth.capability.ts`). Profile rows and permission flags come from [`./account/`](./account/README.md). Distinct from the **`session`** factory module (Supabase client wiring).

**Key Services**

- Login authentication
- Password reset and recovery workflows
- User registration and account setup
- Multi-factor authentication

---

### [Account Management](./account/README.md)

**User account administration**

Comprehensive account management for application users including subscription options, recipe preferences, theme settings, notifications and SSO configuration.

**Key Services**

- Personal preferences for recipe restrictions
- Subscription options for AI assisted recipes and suggestions
- Security settings for changing email and password

---

### Recipe Management

End-to-end recipe management consists of three key areas: local, remote/cloud, AI assisted.

#### Local Recipe Management

**Module:** [`./recipe/`](./recipe/) — **schemas and types only** ([`recipe/README.md`](./recipe/README.md)). There is **no** `recipe.service.ts` by design.

**Local/Offline recipe workflow and storage with Dexie/IndexedDB**

Primary recipe management including recipe CRUD workflows and recommendations using local IndexedDB data suitable for offline, unauthorized users without cloud or AI assisted recipe permissions.

| Concern                       | Location                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Validation contracts          | `$lib/api/recipe` (`recipe.schemas.ts`, `recipe.types.ts`)                                                                              |
| Reactive reads (LiveQuery)    | `$lib/stores/recipes.ts` and related stores                                                                                             |
| Dexie schema / `db` instance  | `$lib/db.ts`                                                                                                                            |
| User-facing writes            | Routes, form actions, and store or `db` helpers (prefer centralizing new `db.recipes` mutations in stores/db—not a `*.service.ts` file) |
| Deterministic recommendations | `$lib/recommendations/` (reads Dexie-backed stores)                                                                                     |

#### [Remote/Cloud Recipe Management](./cloud/README.md)

**Recipe workflows for sharing and cloud storage with Supabase**

Provides subscribed users with support for syncing local recipe data with the Supabase cloud for backup, retrieval and recipe sharing via public URLs. Refer to Supabase [JavaScript Client Library](https://supabase.com/docs/reference/javascript/introduction) documentation for **database** guidance.

**Key Services**

- Backup recipes with cloud storage and sync across devices/browsers
- Share online recipes with public URLs
- Free up local storage with archived recipes that can be stored in the cloud and downloaded later
- Separation of concerns: `CloudService` (remote-only Supabase), sync model helpers (`cloud.model.ts`), and `SyncService` (orchestrates Dexie + CloudService).

#### AI Assisted Recipes

**AI generated recipes and recipe modifications**

Allows subscribed users to ask AI for recipe suggestions and generate complete recipes based on summary data as well as ask questions or make changes to full recipes.

**Key Services**

- AI suggested recipe summaries based on user prompts
- AI generated recipes based on AI recipe summaries
- AI assistance for making recipe modifications or asking for general help
