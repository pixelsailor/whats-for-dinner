## Auth Flow with Permission Storage

- Login is handled in `src/routes/auth/+page.server.ts` via `supabase.auth.signInWithPassword`.
- After a successful login, we fetch the Supabase `user_profiles` row using `AccountService` and derive `ai_assistance` / `cloud_storage` with `hasPermission(profile, …)` from `$lib/api/account/account.model`.
- These permission flags are stored in a session cookie (`wfd-permissions`) for reuse across requests.

### Session Cookie Details

- Name: `wfd-permissions`
- Shape: `{ ai_assistance: boolean; cloud_storage: boolean }`
- Options: `httpOnly`, `sameSite: 'lax'`, `secure` (in production), `path: '/'`, `maxAge: 7 days`
- Utilities live in `$lib/api/auth/auth.permissions.ts` (`getSessionPermissions`, `setSessionPermissions`, `clearSessionPermissions`).

### Server Locals and Page Data

- `hooks.server.ts` reads the permissions cookie and sets `locals.permissions` (or `null` when unauthenticated).
- `+layout.server.ts` exposes:
  - `permissionFlags` (raw booleans from the session cookie)
  - `permissions` (compatibility `PolicyResult` objects derived from flags; no fallbacks)
- Client-side layouts and pages continue to receive `permissions` in `data`; new code can prefer `permissionFlags` for simple boolean checks.

### Refresh Strategy

- Permissions are fetched on login and cached in the session cookie until logout/expiry. If profile lookup fails, the cookie is cleared and login still succeeds.
