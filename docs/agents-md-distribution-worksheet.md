# `agents.md` distribution worksheet

Audit of [root `agents.md`](../agents.md): each block mapped to its **target home** after distribution. Use this as the checklist when migrating content and retiring `agents.md`. Execution tasks stay in [`adr-and-rules-todo.md`](./adr-and-rules-todo.md) under **Legacy `agents.md` Distribution**.

| Order | `agents.md` block (approx. lines) | Target home | Backlog hook / notes |
| ----- | --------------------------------- | ----------- | -------------------- |
| 1 | Title + stack intro (1–7) | [README](../README.md) principles / stack (avoid duplicating; ensure README stays the human entrypoint) | README governance; trim from `agents.md` on retire |
| 2 | Offline + AI path sentence (9–10) | [ADR-001](../adrs/ADR-001-product-operating-model.md), [ADR-007](../adrs/ADR-007-ai-provider-contract.md) | Already ADR-backed; agent-facing one-liner can live in **Rule: AI integration boundary** or README |
| 3 | **Available MCP Tools** (14–36) | [`.cursor/rules/svelte-mcp-workflow.mdc`](../.cursor/rules/svelte-mcp-workflow.mdc) | Already canonical; remove duplicate from `agents.md` when distribution finishes |
| 4 | **Svelte 5 + Runes Best Practices** (38–60) + **Svelte Testing** (61–63) | Planned **Rule: Svelte 5 and UI conventions** | Todo: *Migrate Svelte 5 + runes guidance*; include testing subsection |
| 5 | **Reactive `$:` statements** (65–67) | Same Svelte rule (subsection) | Same todo; keep link to legacy reactive docs |
| 6 | Serverless / remote functions + adapter line (69) | [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), **Rule: Serverless compatibility** (planned), align [`svelte.config.js`](../svelte.config.js) wording | [GAP-014](readme-adr-alignment-gaps.md); Netlify is configured today per ADR-006 |
| 7 | **TypeScript Conventions** (73–85) | Extend [`.cursor/rules/lint-and-code-quality.mdc`](../.cursor/rules/lint-and-code-quality.mdc) or split a dedicated code-conventions rule per todo | Todo: *Migrate TypeScript and general code-style conventions* |
| 8 | **Dexie + LiveQueryStores Guidelines** (89–106) | Planned **Rule: Local data and Dexie ownership** + [ADR-002](../adrs/ADR-002-local-data-ownership.md) | Todo: *Migrate Dexie…*; module layout resolved by [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc): `src/lib/db.ts` is canonical, `src/lib/db/` contains helpers. |
| 9 | **TanStack Query `createQuery()`** (110–131) | **`docs/tanstack-query.md`** (new focused doc) + short “Data fetching” pointer in [`src/lib/api/README.md`](../src/lib/api/README.md) | **Audit decision:** keeps API README slim and gives offline/Zod/queryFn patterns a stable link; cite ADR-001 / ADR-002 in that doc. Todo: *Migrate TanStack Query guidance* |
| 10 | **Supabase Auth, Sharing and Cloud Backup** (135–138) | Planned **Rule: Supabase enhancement boundary** + ADR-004 / ADR-006 | Todo: *Migrate Supabase auth…* |
| 11 | **Zod Validation Rules** (140–164) | Planned **Rule: Schema and type safety** + [`src/lib/api/README.md`](../src/lib/api/README.md) (layout per ADR-008) | Todo: *Migrate Zod validation rules*; replace “one file per entity” with per-domain folder model ([GAP-013](readme-adr-alignment-gaps.md)) |
| 12 | **General Code Style** (167–176) | Same as row 7 (code conventions rule / `lint-and-code-quality`) | Reconcile 2-space indent vs “respect indents” in TypeScript section |
| 13 | **Accessibility and UX** (180–186) | **Rule: Svelte 5 and UI conventions** (a11y subsection) and/or code-conventions rule | Todo: *Migrate TypeScript…* bundles a11y with code style |
| 14 | **Architecture highlights** (190–198) | [ADR-002](../adrs/ADR-002-local-data-ownership.md), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), [ADR-007](../adrs/ADR-007-ai-provider-contract.md), [`src/lib/api/README.md`](../src/lib/api/README.md), [`src/lib/stores/README.md`](../src/lib/stores/README.md) | Todo: *Reconcile Architecture highlights…*; module map vs [GAP-011](readme-adr-alignment-gaps.md) |
| 15 | **Env & secrets** (202–207) | [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md) | Confirm no gap beyond [GAP-003](readme-adr-alignment-gaps.md); drop from `agents.md` |
| 16 | **Documentation References** (211–220) | README Documentation Map and/or **`docs/references.md`** | Todo: *Migrate Documentation References* |

## Cross-cutting follow-ups (not a separate `agents.md` section)

| Topic | Where it lands | Notes |
| ----- | -------------- | ----- |
| ADRs citing `agents.md` | [ADR-002](../adrs/ADR-002-local-data-ownership.md), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md) | Todo: *Update ADRs that cite `agents.md`* |
| `svelte-mcp-workflow.mdc` closing line | [`.cursor/rules/svelte-mcp-workflow.mdc`](../.cursor/rules/svelte-mcp-workflow.mdc) | Todo: point at real destinations post-migration |
| Retire `agents.md` | Delete or redirect stub | Todo: *Retire `agents.md`*; close GAP-011–015 when done |

## Status

- **Audit (mapping):** complete — this worksheet is the record.
- **Migration:** Svelte 5 + runes (+ reactive `$:` subsection, testing link, serverless portability line) lives in [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc); [`agents.md`](../agents.md) still mirrors it until retire. Other rows unchanged — use checkboxes in [`adr-and-rules-todo.md`](./adr-and-rules-todo.md).
