# Common API module

Cross-domain validation schemas and TypeScript types shared by multiple API slices (for example `ApiResponse` used by cloud sync and AI routes).

## What belongs here

| File | Role |
| ---- | ---- |
| `common.schemas.ts` | Zod validation only |
| `common.types.ts` | Types aligned with common schemas |
| `index.ts` | Public barrel |

## What does **not** belong here

**Do not add Supabase (or other provider) clients to this module.** A former `common.model.ts` exported a standalone `createClient` singleton; it was unused and removed (COM-3).

Supabase clients are created at app wiring boundaries and passed into services:

| Surface | Use for |
| ------- | ------- |
| `event.locals.supabase` | Server handlers, auth actions, `safeGetSession` |
| `data.supabase` from `+layout.ts` | Browser and layout consumers (`CloudService`, `AccountService`, …) |
| `src/lib/supabaseClient.ts` | Narrow sessionless server paths only (e.g. share-by-token) |

See [`.cursor/rules/supabase-enhancement-boundary.mdc`](../../../.cursor/rules/supabase-enhancement-boundary.mdc) and [`src/lib/api/cloud/README.md`](../cloud/README.md) for cloud/sync injection patterns.
