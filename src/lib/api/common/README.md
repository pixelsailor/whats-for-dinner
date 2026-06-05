# Common API module

Cross-domain validation schemas and TypeScript types shared by multiple API slices (for example `ApiResponse` used by cloud sync and AI routes).

## What belongs here

| File                | Role                              |
| ------------------- | --------------------------------- |
| `common.schemas.ts` | Zod validation only               |
| `common.types.ts`   | Types aligned with common schemas |
| `index.ts`          | Public barrel                     |

## What does **not** belong here

**Do not add Supabase (or other provider) clients to this module.** A former `common.model.ts` exported a standalone `createClient` singleton; it was unused and removed (COM-3).

Supabase clients are created at wiring boundaries and passed into services:

| Surface                           | Factory                                                  | Module                                                             |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `event.locals.supabase`           | `createRequestServerClient`                              | [`session/`](../session/)                                          |
| `data.supabase` from `+layout.ts` | `createLayoutBrowserClient` / `createLayoutServerClient` | [`session/`](../session/)                                          |
| Anonymous server routes           | `createAnonymousCloudClient`                             | [`cloud/cloud.client.ts`](../cloud/cloud.client.ts)                |

See [`.cursor/rules/supabase-enhancement-boundary.mdc`](../../../.cursor/rules/supabase-enhancement-boundary.mdc), [`src/lib/api/session/README.md`](../session/README.md), and [`src/lib/api/cloud/README.md`](../cloud/README.md).
