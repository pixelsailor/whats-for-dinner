# Shared utilities (`src/lib/utils/`)

## Purpose

This folder holds **general-purpose helper functions** that are reused across unrelated features and have **no owning product domain**. They are typically pure, side-effect-free utilities (parsing, formatting, crypto primitives) that any layer of the app may import.

**`$lib/utils` is not a catch-all.** It does not replace the API service layer under [`../api/`](../api/README.md).

## Relationship to `$lib/utils.ts`

The repository also contains a **legacy single-file module** at [`../utils.ts`](../utils.ts). That file predates this directory and creates a confusing dual entry point:

| Module | Status | Guidance |
| ------ | ------ | -------- |
| **`src/lib/utils/`** (this folder) | **Preferred** for new domain-agnostic helpers | Add one file per concern (e.g. `toMilliseconds.ts`) |
| **`src/lib/utils.ts`** | **Legacy** | **Do not add new exports.** When editing symbols here, move them into this folder or into the owning `$lib/api/<domain>/` module |

Consumers may import from either path today; new code should import from **`$lib/utils/<file>`** unless migrating the legacy file in the same change.

## What belongs here

- Pure helpers with **no tie to auth, recipes, cloud, AI, or account** semantics
- Small algorithms reused by routes, stores, and API modules alike (e.g. `toMilliseconds`, `randomBytes`)
- Generic string/format utilities that are not domain-specific (e.g. `sentenceCase`)

## What does **not** belong here

Move these to the owning **`src/lib/api/<domain>/`** module (usually `*.model.ts` or `*.service.ts`):

| Concern | Belongs in | Current drift (see GAP-026) |
| ------- | ---------- | ----------------------------- |
| Supabase session / JWT validation | `$lib/api/auth/` (`AuthService`) | — (remediated) |
| Permission httpOnly cookie read/write | `$lib/api/auth/` | [`session.ts`](./session.ts) |
| AI prompt sanitization, query intent detection | `$lib/api/ai/` | [`../utils.ts`](../utils.ts) |
| AI/cloud capability derivation from session + permissions | `$lib/api/auth/` or `$lib/api/account/` | [`capabilities.ts`](./capabilities.ts) |

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
- **Implementation backlog:** [GAP-026](../../../docs/readme-adr-alignment-gaps.md#gap-026)
