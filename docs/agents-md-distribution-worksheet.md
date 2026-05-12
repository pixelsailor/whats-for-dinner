# `agents.md` distribution worksheet

Audit of [root `agents.md`](../agents.md): each block mapped to its **target home** after distribution. Use this as the checklist when migrating content and retiring `agents.md`. Execution tasks stay in [`adr-and-rules-todo.md`](./adr-and-rules-todo.md) under **Legacy `agents.md` Distribution**.

| Order | `agents.md` block (approx. lines) | Target home | Backlog hook / notes |
| ----- | --------------------------------- | ----------- | -------------------- |
| 1 | Title + stack intro (1–7) | [README](../README.md) principles / stack (avoid duplicating; ensure README stays the human entrypoint) | **Done:** README intro, principles, and Technology Stack carry the human-facing stack; LiveQuery-backed stores called out to match `agents.md`; Documentation Map links `agents.md` correctly. Trim duplicate intro from `agents.md` on retire. |
| 2 | Offline + AI path sentence (9–10) | [ADR-001](../adrs/ADR-001-product-operating-model.md), [ADR-007](../adrs/ADR-007-ai-provider-contract.md) | **Done:** ADRs already authoritative; **Operating context** added to [`.cursor/rules/ai-integration-boundary.mdc`](../.cursor/rules/ai-integration-boundary.mdc). README principles already state the same product intent. Trim duplicate sentences from `agents.md` on retire. |
| 3 | **Available MCP Tools** (14–36) | [`.cursor/rules/svelte-mcp-workflow.mdc`](../.cursor/rules/svelte-mcp-workflow.mdc) | Already canonical; remove duplicate from `agents.md` when distribution finishes |
| 4 | **Svelte 5 + Runes Best Practices** (38–60) + **Svelte Testing** (61–63) | Planned **Rule: Svelte 5 and UI conventions** | Todo: *Migrate Svelte 5 + runes guidance*; include testing subsection |
| 5 | **Reactive `$:` statements** (65–67) | Same Svelte rule (subsection) | Same todo; keep link to legacy reactive docs |
| 6 | Serverless / remote functions + adapter line (69) | [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), **Rule: Serverless compatibility** (planned), align [`svelte.config.js`](../svelte.config.js) wording | [GAP-014](readme-adr-alignment-gaps.md); Netlify is configured today per ADR-006 |
| 7 | **TypeScript Conventions** (73–85) | [`.cursor/rules/lint-and-code-quality.mdc`](../.cursor/rules/lint-and-code-quality.mdc) — *TypeScript* + *Formatting and general style* sections | **Done:** extended in 2026-05-11 pass; cross-links to [`.cursor/rules/schema-and-type-safety.mdc`](../.cursor/rules/schema-and-type-safety.mdc) and [`.cursor/rules/documentation-conventions.mdc`](../.cursor/rules/documentation-conventions.mdc); summary mirror retained in [`agents.md`](../agents.md) until retire. |
| 8 | **Dexie + LiveQueryStores Guidelines** (89–106) | **Rule: Local data and Dexie ownership** + [ADR-002](../adrs/ADR-002-local-data-ownership.md) | **Done:** operational guidance (`liveQuery` / `createLiveQueryStore`, derived views, Zod row types, example) in [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc); [`agents.md`](../agents.md) summary + canonical links until retire. |
| 9 | **TanStack Query `createQuery()`** (110–131) | **`docs/tanstack-query.md`** (new focused doc) + short “Data fetching” pointer in [`src/lib/api/README.md`](../src/lib/api/README.md) | **Audit decision:** keeps API README slim and gives offline/Zod/queryFn patterns a stable link; cite ADR-001 / ADR-002 in that doc. Todo: *Migrate TanStack Query guidance* |
| 10 | **Supabase Auth, Sharing and Cloud Backup** (135–138) | Planned **Rule: Supabase enhancement boundary** + ADR-004 / ADR-006 | Todo: *Migrate Supabase auth…* |
| 11 | **Zod Validation Rules** (140–164) | Planned **Rule: Schema and type safety** + [`src/lib/api/README.md`](../src/lib/api/README.md) (layout per ADR-008) | Todo: *Migrate Zod validation rules*; `agents.md` layout wording now matches ADR-008 and API README (GAP-013 resolved). |
| 12 | **General Code Style** (167–176) | [`.cursor/rules/lint-and-code-quality.mdc`](../.cursor/rules/lint-and-code-quality.mdc) — *Formatting and general style* section | **Done:** indentation reconciled in 2026-05-11 pass — Prettier wins (**tabs**, `tabWidth: 2`); see [Deferred — TypeScript and general code-style migration notes](./readme-adr-alignment-gaps.md#typescript-and-general-code-style-migration-notes-2026-05-11) for the discrepancy record. |
| 13 | **Accessibility and UX** (180–186) | [ADR-014](../adrs/ADR-014-semantic-html-and-accessibility.md) (Accepted) + [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc); cross-cutting (loading/error states, simplicity) in [`.cursor/rules/lint-and-code-quality.mdc`](../.cursor/rules/lint-and-code-quality.mdc) | **Done:** a11y kept in its semantic home (ADR-014 + Svelte rule); the cross-cutting bullets that apply outside `.svelte` (async loading/error states, clarity-over-cleverness) added to *lint-and-code-quality* with explicit cross-links. |
| 14 | **Architecture highlights** (190–198) | [ADR-002](../adrs/ADR-002-local-data-ownership.md), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), [ADR-007](../adrs/ADR-007-ai-provider-contract.md), [`src/lib/api/README.md`](../src/lib/api/README.md), [`src/lib/stores/README.md`](../src/lib/stores/README.md) | Todo: *Reconcile Architecture highlights…*; module map vs [GAP-011](readme-adr-alignment-gaps.md) |
| 15 | **Env & secrets** (202–207) | [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md) | **GAP-003** resolved (`OPENAI_API_KEY` + `$env/static/private`); drop from `agents.md` when reconciling Architecture / env blocks |
| 16 | **Documentation References** (211–220) | README Documentation Map and/or **`docs/references.md`** | Todo: *Migrate Documentation References* |

## Cross-cutting follow-ups (not a separate `agents.md` section)

| Topic | Where it lands | Notes |
| ----- | -------------- | ----- |
| ADRs citing `agents.md` | [ADR-002](../adrs/ADR-002-local-data-ownership.md), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md) | Todo: *Update ADRs that cite `agents.md`* |
| `svelte-mcp-workflow.mdc` closing line | [`.cursor/rules/svelte-mcp-workflow.mdc`](../.cursor/rules/svelte-mcp-workflow.mdc) | Todo: point at real destinations post-migration |
| Retire `agents.md` | Delete or redirect stub | Todo: *Retire `agents.md`*; close GAP-011–015 when done |

## Status

- **Audit (mapping):** complete — this worksheet is the record.
- **Row 1 (README title + stack):** complete — see table notes column.
- **Row 2 (offline + optional AI/cloud):** complete — see table notes column.
- **Migration:** Svelte 5 + runes (+ reactive `$:` subsection, testing link, serverless portability line) lives in [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc); [`agents.md`](../agents.md) still mirrors it until retire.
- **Rows 7, 12, 13 (TypeScript Conventions, General Code Style, Accessibility and UX):** complete — TypeScript + Formatting bullets in [`.cursor/rules/lint-and-code-quality.mdc`](../.cursor/rules/lint-and-code-quality.mdc); a11y stays under [ADR-014](../adrs/ADR-014-semantic-html-and-accessibility.md) + [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) with cross-cutting bullets in `lint-and-code-quality.mdc`. Indentation discrepancy resolved (Prettier-configured **tabs**); discrepancy record in [`docs/readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md). Mirror retained in [`agents.md`](../agents.md) until retire.
- **Row 8 (Dexie + LiveQueryStores):** complete — [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc); short summary mirror in [`agents.md`](../agents.md) until retire.
- Remaining worksheet rows: use checkboxes in [`adr-and-rules-todo.md`](./adr-and-rules-todo.md).
