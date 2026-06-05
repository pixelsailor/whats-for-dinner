# Session client factory module

Cookie-backed Supabase client creation for app **wiring boundaries** (hooks, layout). Resolves **GAP-017** without duplicating domain services.

## Why this module exists (and why not auth, account, or cloud)

| Existing module | Responsibility | Why it does not own client factories |
| --------------- | -------------- | ------------------------------------ |
| **auth** (`AuthService`) | Sign-in, JWT validation, stale-session cleanup on an **already constructed** client | Operates on injected `SupabaseClient`; does not decide how SvelteKit wires cookies across hooks vs layout |
| **account** (`AccountService`) | `user_profiles` / preferences for a signed-in user | Same injection pattern; no session transport concerns |
| **cloud** (`CloudService`, `SyncService`) | Remote recipe CRUD and Dexie↔cloud sync | Receives injected client from layout or `locals`; anonymous public reads use [`createAnonymousCloudClient`](../cloud/cloud.client.ts) instead |

GAP-017 required **one documented surface** for *how* clients are built at boundaries (`@supabase/ssr` cookie adapters, layout `fetch`, env keys) — not new auth, account, or cloud **business logic**. That is **session transport** wiring, so it lives here under the **session** domain name.

Domain services (`AuthService`, `CloudService`, `AccountService`) **do not** import this module.

## Which factory to use

| Factory | Use for | Wired in |
| ------- | ------- | -------- |
| `createRequestServerClient` | `event.locals.supabase`, auth form actions, `safeGetSession` | [`src/hooks.server.ts`](../../../hooks.server.ts) |
| `createLayoutBrowserClient` | `data.supabase` after hydration | [`src/routes/+layout.ts`](../../../routes/+layout.ts) (browser) |
| `createLayoutServerClient` | `data.supabase` during SSR | [`src/routes/+layout.ts`](../../../routes/+layout.ts) (SSR) |

**Anonymous server reads** (no session cookies): [`createAnonymousCloudClient`](../cloud/cloud.client.ts) in the cloud module.

## File layout

| File | Role |
| ---- | ---- |
| `session.types.ts` | Cookie adapter and project config types |
| `session.model.ts` | Session-bound client factories and SSR header helpers |
| `index.ts` | Public barrel |
