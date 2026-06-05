# Shared utilities (`src/lib/utils/`)

## Purpose

This folder holds **general-purpose helper functions** that are reused across unrelated features and have **no owning product domain**. They are typically pure, side-effect-free utilities (parsing, formatting, crypto primitives) that any layer of the app may import.

**`$lib/utils` is not a catch-all.** It does not replace the API service layer under [`../api/`](../api/README.md).

## Import convention

Add one file per concern (e.g. `toMilliseconds.ts`, `sentenceCase.ts`) and import from **`$lib/utils/<file>`**. Domain-bound helpers belong in **`$lib/api/<domain>/`**, not here.

## What belongs here

- Pure helpers with **no tie to auth, recipes, cloud, AI, or account** semantics
- Small algorithms reused by routes, stores, and API modules alike (e.g. `toMilliseconds`, `randomBytes`)
- Generic string/format utilities that are not domain-specific (e.g. `sentenceCase`)

## What does **not** belong here

Move these to the owning **`src/lib/api/<domain>/`** module (usually `*.model.ts` or `*.service.ts`):

| Concern                                             | Belongs in                          |
| --------------------------------------------------- | ----------------------------------- |
| Supabase session / JWT validation                   | `$lib/api/auth/` (`AuthService`)    |
| Permission httpOnly cookie read/write               | `$lib/api/auth/auth.permissions.ts` |
| AI prompt sanitization, query intent detection      | `$lib/api/ai/ai.model.ts`           |
| AI capability derivation from session + permissions | `$lib/api/auth/auth.capability.ts`  |

If the helper would naturally sit next to a domain service, schema, or route under `src/routes/api/<domain>/`, it is **not** a shared utility.

## Decision checklist

Before adding a file here, confirm:

1. **No domain owner** — the function does not encode recipe, auth, cloud, AI, or account rules.
2. **No I/O** — no Supabase, `fetch`, cookies, or filesystem (those belong in `*.service.ts` or SvelteKit server modules).
3. **Reuse** — at least two unrelated call sites, or clear app-wide primitive status (e.g. crypto).
4. **Not a workaround** — you are not avoiding the `$lib/api/<domain>/` folder structure for convenience.

When in doubt, use [`../api/README.md`](../api/README.md) and [ADR-008 §8](../../../adrs/ADR-008-schema-led-domain-contracts.md).

## Governance

- **Binding layout rules:** [ADR-008: Schema-led domain contracts](../../../adrs/ADR-008-schema-led-domain-contracts.md) (§ Source tree boundaries)
- **Boundary remediation:** GAP-026 resolved (2026-06-05) — see **Resolved** table in [`docs/readme-adr-alignment-gaps.md`](../../../docs/readme-adr-alignment-gaps.md)
