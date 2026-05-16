# ADR and Rules Todo

This backlog turns the project principles in the top-level README into enforceable decisions, Cursor rules, and agent workflow artifacts. It is not an implementation task list for product features; it is a governance backlog for resetting the project around the intended architecture.

## ADR Backlog

- [x] **ADR: Product operating model**
  - Define WFD as an offline-first, anonymous-first recipe book with optional cloud and AI enhancements.
  - Establish which capabilities must work without auth, network, Supabase, or OpenAI.

- [x] **ADR: Local data ownership**
  - Define Dexie and IndexedDB as the default home for saved recipes, preferences, recommendation inputs, and cached suggestion artifacts.
  - Clarify which records are durable user data and which records are transient cache data.

- [x] **ADR: AI suggestion lifecycle**
  - Define how prompts, viewed suggestions, generated full recipes, and saved recipes move through the system.
  - Specify retention expectations, cache invalidation, and the rule that AI suggestions are not cloud-saved unless converted into user-saved recipes.

- [x] **ADR: Account and cloud enhancement model**
  - Define Supabase's scope: authentication, backup, sharing, and synchronization.
  - Require logged-out and offline continuity for users who previously registered.
  - Account for future user-hosted databases that bypass WFD-managed Supabase accounts.

- [x] **ADR: Sync and conflict resolution**
  - Define ownership, timestamps, deleted states, restore behavior, and conflict handling between local Dexie data and Supabase backups.
  - Clarify how soft deletes and `checkout_history` participate in sync.

- [x] **ADR: Serverless and secret boundary**
  - Define the accepted server-side surfaces for OpenAI and privileged Supabase work.
  - Prohibit secrets and server-only imports in `.svelte` files, client modules, and browser-executed utilities.
  - Capture Cloudflare Workers/Pages compatibility constraints.
  - **Done:** [`adrs/ADR-006-serverless-and-secret-boundary.md`](../adrs/ADR-006-serverless-and-secret-boundary.md)

- [x] **ADR: AI provider contract**
  - Define the OpenAI integration: **Responses API + Zod-structured output** (preferred), deprecated **Chat Completions** legacy path, structured response expectations, error handling, retries, and offline fallback behavior.
  - Require user preferences to be included in recipe-generation prompts.
  - Define how a user-configured local or personal AI API can bypass WFD-managed account restrictions while preserving validation and safety boundaries.
  - **Done:** [`adrs/ADR-007-ai-provider-contract.md`](../adrs/ADR-007-ai-provider-contract.md)

- [x] **ADR: Self-hosting provider model**
  - Define the service boundaries needed for user-controlled AI APIs and user-hosted databases.
  - Identify which provider capabilities are required, optional, or unsupported.
  - Establish how self-hosted configuration interacts with anonymous usage, account permissions, sync, sharing, backups, and offline behavior.
  - **Done:** [`adrs/ADR-011-self-hosting-provider-model.md`](../adrs/ADR-011-self-hosting-provider-model.md) (Proposed)

- [x] **ADR: Schema-led domain contracts**
  - Require Zod schemas as the source of truth for persisted records, API payloads, and AI-generated data.
  - Define where schemas, derived types, model helpers, services, and stores belong.
  - **Done:** [`adrs/ADR-008-schema-led-domain-contracts.md`](../adrs/ADR-008-schema-led-domain-contracts.md)

- [x] **ADR: Recommendations engine inputs**
  - Define the local data used by recommendations, including saved recipes, tags, preferences, ratings or favorites, and `checkout_history`.
  - Separate deterministic local recommendations from AI-assisted suggestions.
  - **Done:** [`adrs/ADR-009-recommendations-engine-inputs.md`](../adrs/ADR-009-recommendations-engine-inputs.md)

- [x] **ADR: Offline cache and service worker policy**
  - Define what must be cached, what must never be cached, storage budget expectations, and cache eviction rules.
  - Cover static shell assets, route data, local database state, and transient AI artifacts.
  - **Done:** [`adrs/ADR-010-offline-cache-and-service-worker.md`](../adrs/ADR-010-offline-cache-and-service-worker.md)

- [x] **ADR: Feature roadmap boundaries**
  - Capture architectural boundaries for Calendar, URL recipe import, OCR import, and Meal Planner before implementation starts.
  - Identify where each feature should own deeper design docs.
  - **Done:** [`adrs/ADR-012-feature-roadmap-boundaries.md`](../adrs/ADR-012-feature-roadmap-boundaries.md) (Proposed)

- [ ] **ADR + rules: Backend API and middleware patterns for front-end `.svelte` DX**
  - Align Accepted ADRs and Cursor rules on a **consistent pattern** for how backend APIs, `+server` / remote handlers, and middleware or layout helpers expose data and errors to **front-end-facing** `.svelte` files (loading, error, and retry semantics in one place).
  - **Decision scope:** whether to favor Svelte’s built-in `{#await …}` (and how it composes with SSR, transitions, and keyed updates) versus more “traditional” approaches (for example imperative `fetch` in `$effect`, stores, TanStack Query, or `+page` / `+layout` `load` promises only).
  - **Process:** document pros and cons of each viable approach (readability, SSR/hydration, cancellation, offline-first and ADR-001/ADR-002 alignment, testability, duplication vs single source of truth) and record the **chosen default** plus explicit **escape hatches** in an ADR (or scoped ADR section) and a matching Cursor rule or extension to existing rules (for example Svelte UI conventions, `src/lib/api/README.md`, and [`docs/tanstack-query.md`](./tanstack-query.md) where queries overlap).

- [ ] **Implement production code per “Backend API and middleware patterns for front-end `.svelte` DX”**
  - After the ADR + rules decision above is Accepted and authored, refactor or extend **production** routes, handlers, and `.svelte` surfaces so behavior matches the chosen pattern (consistent loading/error handling, no ad hoc one-off client patterns that contradict the rule set).

## Cursor Rule Backlog

- [x] **Rule: README governance**
  - Keep the top-level README focused on project purpose, principles, stack, and durable boundaries.
  - Direct detailed implementation guidance to ADRs, directory READMEs, or focused docs.

- [x] **Rule: Offline-first development**
  - Require new features to define anonymous, offline, loading, and reconnect behavior.
  - Flag changes that make auth, Supabase, OpenAI, or network access mandatory for core recipe book flows.
  - **Done:** [`.cursor/rules/offline-first-development.mdc`](../.cursor/rules/offline-first-development.mdc) (`alwaysApply`). **Follow-up:** [ADR-001](../adrs/ADR-001-product-operating-model.md) and [ADR-010](../adrs/ADR-010-offline-cache-and-service-worker.md) enforcement sections still mention a “future” offline-first rule / `agents.md` — see [`docs/readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) **GAP-018**.

- [x] **Rule: Offline connectivity and capability state** (backlog title was “Offline and connectivity user messaging”)
  - **Done:** [`.cursor/rules/offline-connectivity-capability.mdc`](../.cursor/rules/offline-connectivity-capability.mdc) (`alwaysApply`). Covers **implementation and re-check** of browser offline vs session vs permissions vs provider/sync outcomes, **reconnect / deferred work**, alignment with ADR-001, ADR-004, ADR-005 (Proposed design intent), ADR-010, and ADR-007; **distinct degraded UX** (disciplined copy, not fixed strings). Complements [`.cursor/rules/offline-first-development.mdc`](../.cursor/rules/offline-first-development.mdc). **Surfaced discrepancies:** recorded under [Deferred — Offline connectivity rule notes](./readme-adr-alignment-gaps.md#offline-connectivity-rule-notes-2026-05-11) in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) (links **GAP-001**, **GAP-016**, Supabase audit implication).

- [x] **Rule: Local data and Dexie ownership**
  - Enforce Dexie-backed reads for local-first user data.
  - Require mutations to flow through domain/store helpers rather than ad hoc component logic.
  - **Done:** [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc) (globs `src/lib/db.ts`, `src/lib/db/**/*.ts`, `src/lib/stores/**/*.ts`).

- [x] **Rule: AI integration boundary**
  - Require OpenAI calls to stay in server-only modules or SvelteKit server routes.
  - Require request and response validation, preference inclusion, and no direct client-side AI calls.
  - Avoid hard-coding OpenAI-only assumptions where a provider contract should allow future personal AI APIs.
  - **Done:** [`.cursor/rules/ai-integration-boundary.mdc`](../.cursor/rules/ai-integration-boundary.mdc) (globs `src/lib/api/ai/**/*.ts`, `src/lib/server/**/*.ts`, `src/lib/openai/**/*.ts`, `src/routes/api/**/*.ts`, `src/routes/**/+page.server.ts`).

- [x] **Rule: Supabase enhancement boundary**
  - Treat Supabase as optional for backup, sync, sharing, and auth.
  - Require graceful behavior when users are logged out, offline, or missing cloud permissions.
  - Avoid hard-coding Supabase-only assumptions where a provider contract should allow future user-hosted databases.
  - **Done:** [`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc) (globs hooks, root layouts, standalone Supabase client modules, `src/lib/api/cloud/**`, account/auth API layers, `src/app.d.ts`). **Follow-up:** [`docs/readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) — **GAP-016** (dual Supabase keys, docs, browser-verified migration off legacy anon path) and **GAP-017** (unified Supabase client interface). **Legacy `agents.md` wiring correction:** [Supabase wiring migration notes](./readme-adr-alignment-gaps.md#supabase-wiring-migration-notes-2026-05-12).

- [ ] **Rule: Self-hosting compatibility**
  - Require new cloud or AI work to document whether it depends on WFD-managed services, user-provided services, or either.
  - Flag account-permission checks that would incorrectly block configured personal AI APIs or user-hosted databases.

- [x] **Rule: Svelte 5 and UI conventions**
  - Enforce runes-based Svelte 5 patterns, accessibility expectations, bits-ui-first composition, and TailwindCSS styling conventions.
  - Require Svelte MCP validation when Svelte components are written or changed.
  - **Done:** [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) (globs `**/*.svelte`); MCP workflow remains in [`.cursor/rules/svelte-mcp-workflow.mdc`](../.cursor/rules/svelte-mcp-workflow.mdc).

- [x] **Rule: Schema and type safety**
  - Require Zod schemas for external, persisted, and AI-generated data.
  - Require TypeScript types to be inferred from schemas rather than duplicated manually.
  - **Done:** [`.cursor/rules/schema-and-type-safety.mdc`](../.cursor/rules/schema-and-type-safety.mdc) (globs `src/lib/api/**/*.ts`, `src/lib/types.ts`, `src/lib/db.ts`, `src/lib/db/**/*.ts`, `src/routes/api/**/*.ts`, `src/lib/stores/**/*.ts`). **Follow-up:** retire deprecated duplicate domain types in `$lib/types`, add Zod for first-class Dexie rows such as `PromptRequest`, and roll `.strict()` through `*.schemas.ts` in production (see [ADR-008 § Implementation compliance](../adrs/ADR-008-schema-led-domain-contracts.md#implementation-compliance-discovered) and resolved **GAP-007** in [`docs/readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md)).

- [x] **Rule: Serverless compatibility**
  - Flag Node-specific APIs in server code unless explicitly isolated from the Cloudflare target.
  - Require private environment imports only in server-side modules.
  - **Done:** [`.cursor/rules/serverless-compatibility.mdc`](../.cursor/rules/serverless-compatibility.mdc) (globs `hooks.server.ts`, `src/routes/**/+*.server.ts`, `+server.ts`, `src/routes/api/**`, `src/lib/server/**`, `src/lib/openai/**`, `src/lib/api/**`). **Surfaced discrepancies:** [Deferred — Serverless compatibility rule notes](./readme-adr-alignment-gaps.md#serverless-compatibility-rule-notes-2026-05-11) in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).

- [x] **Rule: ADR compliance**
  - Require agents to consult relevant ADRs before changing architecture, data flow, auth, sync, AI, or offline behavior.
  - Require unresolved mismatches to be recorded in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) rather than hidden in implementation comments.
  - **Done:** [`.cursor/rules/adr-compliance.mdc`](../.cursor/rules/adr-compliance.mdc)

## Orchestrated Agent Workflow Backlog

- [x] **Create `adrs/`** (architecture decision records at repository root)
  - Add an ADR template with status, context, decision, consequences, enforcement rules, and supersession notes.

- [x] **Create an alignment gap document**
  - Track areas where current implementation differs from accepted ADRs.
  - Include owner, severity, affected files or domains, recommended remediation, and whether the gap blocks future work.
  - **Done:** [`docs/readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md)

- [ ] **Create a planning artifact template**
  - Require scoped phases, files likely to change, validation steps, risks, and rollback notes before significant implementation.
  - **Partial (2026-05-16):** [`.cursor/orchestrations/_template/`](../.cursor/orchestrations/_template/) has `task-manifest.json` and `human-approval.md`; [`.cursor/agents/planner.md`](../.cursor/agents/planner.md) defines required `plan.md` / `acceptance-criteria.md` sections (file map, interface contracts, ADR implications, open questions). [`docs/ORCHESTRATED_DEVELOPMENT.md`](./ORCHESTRATED_DEVELOPMENT.md) documents the per-task artifact set.
  - **Remaining:** copy-paste templates under `_template/` for `plan.md`, `acceptance-criteria.md`, and `build-log.md`; extend Planner output contract with **phases**, **validation steps**, **risks**, and **rollback** (called out in backlog and in [ADR `TEMPLATE.md`](../adrs/TEMPLATE.md) *Planning artifact* subsection).

- [ ] **Create a validation checklist**
  - Cover offline behavior and user-visible offline/connectivity messaging, anonymous behavior, auth boundaries, cloud behavior, AI disabled behavior, self-hosted provider behavior, schema validation, accessibility, and tests.
  - **Partial (2026-05-16):** [`.cursor/agents/validator.md`](../.cursor/agents/validator.md) defines `validation-report.md` (verdict, AC audit, ADR compliance, regressions, remediations). Per-ADR *Merge / workflow gates* and [GOVERNANCE.md §10.5](../adrs/GOVERNANCE.md) require validation output before merge-ready claims.
  - **Remaining:** a single reusable checklist (file or rule) spanning offline/connectivity, anonymous, auth, cloud, AI-disabled, self-hosted, schema, a11y, and tests — still referenced as optional in [ADR-009](../adrs/ADR-009-recommendations-engine-inputs.md) and [ADR-010](../adrs/ADR-010-offline-cache-and-service-worker.md).

- [ ] **Create a test matrix template**
  - Track expected coverage for unit, component, browser, offline, and integration-like flows.
  - **Partial (2026-05-16):** [`.cursor/agents/test.md`](../.cursor/agents/test.md) uses per-run `test-report.md` (coverage map per AC, uncovered criteria, stability notes, commands). [ADR `TEMPLATE.md`](../adrs/TEMPLATE.md) *Test role and evidence* still names `_TEST_MATRIX.md` (legacy naming from [`.cursor/agents/orchestrator.md.backup`](../.cursor/agents/orchestrator.md.backup)).
  - **Remaining:** standalone test-matrix template aligned with WFD runners (Vitest; Playwright only if adopted) and reconcile naming in [`.cursor/agents/INDEX.md`](../.cursor/agents/INDEX.md) (still lists Angular-oriented skill names).

- [x] **Define Plan-Build-Validate-Test roles**
  - Planner produces an executable plan and identifies relevant ADRs.
  - Builder implements one bounded phase.
  - Validator reviews against ADRs, rules, and [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).
  - Test role adds or updates focused tests and records residual risk.
  - **Done (2026-05-16):** Role contracts in [`.cursor/agents/`](../.cursor/agents/) (`orchestrator`, `planner`, `builder`, `validator`, `test`), artifact ownership in [`.cursor/rules/orchestration-artifacts.mdc`](../.cursor/rules/orchestration-artifacts.mdc), narrative guide [`docs/ORCHESTRATED_DEVELOPMENT.md`](./ORCHESTRATED_DEVELOPMENT.md), and orchestration policy in [GOVERNANCE.md §10](../adrs/GOVERNANCE.md#10-orchestrated-development-wfd).

- [ ] **Add workflow gate rules**
  - Require ADR creation or update before changing durable architecture.
  - Require alignment gaps for known deviations that are not fixed in the same change.
  - Require validation output before merge-ready claims.
  - **Partial (2026-05-16):** Gates are encoded in [`.cursor/rules/adr-compliance.mdc`](../.cursor/rules/adr-compliance.mdc) (ADR index + alignment gaps), [GOVERNANCE.md §10.5](../adrs/GOVERNANCE.md#105-merge-ready-gates-orchestrated-efforts), and per-ADR *Merge / workflow gates* in [TEMPLATE.md](../adrs/TEMPLATE.md).
  - **Remaining:** a dedicated Cursor rule (or extension of `orchestration-artifacts` / `adr-compliance`) that agents load for orchestrated runs, tying merge-ready claims to `validation-report.md` / `test-report.md` without relying on ADR bodies alone.

- [ ] **Harden PR and commit expectations**
  - Require summaries to distinguish product behavior, architecture changes, and gap remediation.
  - Require test evidence or explicit untested risk for each change.
  - **Note (2026-05-16):** No repo-level PR template, `CONTRIBUTING.md`, or Cursor rule yet; orchestration artifacts record test/validation evidence per task but do not define human PR/commit summary format.

## Legacy `agents.md` Distribution

The root [`agents.md`](../agents.md) predates the ADR system and the `.cursor/rules/` layout. Its content (product framing, Svelte 5 + runes guidance, TypeScript conventions, Dexie + LiveQueryStores patterns, TanStack Query usage, Supabase auth wiring, Zod rules, general code style, accessibility, architecture highlights, env/secrets, doc references) is still useful but should be **distributed** to ADRs, Cursor rules, and scoped READMEs. Three Accepted ADRs ([ADR-002](../adrs/ADR-002-local-data-ownership.md), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md)) currently cite `agents.md` as authority; the goal of this work is to make those ADRs self-sustaining and to retire `agents.md`. Preserve `agents.md` as-is until each task below is complete; alignment gaps surfaced during the audit are tracked in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).

- [x] **Audit `agents.md` content categories**
  - Map each section/snippet to its target home: existing or planned ADR, planned Cursor rule, scoped `src/lib/.../README.md`, or `docs/<topic>.md`.
  - Capture the audit as a worksheet (table or checklist) so distribution can proceed in bounded passes without losing context.
  - **Done:** [`docs/agents-md-distribution-worksheet.md`](./agents-md-distribution-worksheet.md) — the thematic migration bullets below do not replace this inventory (they skip intro/MCP duplication and do not record line-level mapping or the TanStack home decision).

- [x] **README: title + stack intro (worksheet row 1)**
  - Human-facing project title, principles, and Technology Stack in [README](../README.md) are the canonical home for the content that `agents.md` lines 1–7 summarized; README [governance rule](../.cursor/rules/readme-governance.mdc) unchanged. Duplicate intro text remains in [`agents.md`](../agents.md) until that file is retired.

- [x] **Offline + AI path framing (worksheet row 2)**
  - [ADR-001](../adrs/ADR-001-product-operating-model.md) and [ADR-007](../adrs/ADR-007-ai-provider-contract.md) already carry the binding matrix and provider contract. Agent-facing summary lives under **Operating context** in [`.cursor/rules/ai-integration-boundary.mdc`](../.cursor/rules/ai-integration-boundary.mdc). Duplicate sentences remain in [`agents.md`](../agents.md) until retire.

- [x] **Migrate Svelte 5 + runes guidance**
  - Move the *Svelte 5 + Runes Best Practices* and *Reactive `$:` statements* sections (runes, `$props`, snippets, animations, accessibility, Dexie store subscription pattern) into the planned **Rule: Svelte 5 and UI conventions**.
  - **`$effect` guidance:** canonical wording is in [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) and summarized in [`agents.md`](../agents.md) until that file is retired — prefer `$derived` for pure derivations; use `$effect` for true side effects; do not avoid `$effect` when it is clearer or more efficient.

- [x] **Migrate TypeScript and general code-style conventions**
  - Move *TypeScript Conventions*, *General Code Style*, and *Accessibility and UX* into a code-conventions Cursor rule (an existing `lint-and-code-quality` rule is referenced in [`.cursor/rules/index.md`](../.cursor/rules/index.md) — extend or create as appropriate).
  - Reconcile indentation guidance: *General Code Style* says 2-space indents while *TypeScript Conventions* says "Respect indents. Keep nested items aligned. Do not reset tabs for nested content." Decide which wording survives.
  - **Done:** TypeScript + Formatting bullets extended in [`.cursor/rules/lint-and-code-quality.mdc`](../.cursor/rules/lint-and-code-quality.mdc); accessibility content stays in [ADR-014](../adrs/ADR-014-semantic-html-and-accessibility.md) and [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) with cross-cutting bullets (async loading/error states, clarity-over-cleverness) added to the lint rule. **Indentation reconciled:** the rule and the [`agents.md`](../agents.md) mirror defer to [`.prettierrc`](../.prettierrc) as the source of truth instead of restating values, so the rule does not drift when config changes; the legacy "2-space" wording in *General Code Style* was inaccurate against the actual formatter and codebase. **Surfaced discrepancies:** recorded under [Deferred — TypeScript and general code-style migration notes](./readme-adr-alignment-gaps.md#typescript-and-general-code-style-migration-notes-2026-05-11) in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).

- [x] **Migrate Zod validation rules**
  - Move *Zod Validation Rules* content (per-domain placement in `src/lib/api/**`, `.strict()`, `.safeParse()`, schema-derived types, `.transform()`, composite schemas) into **Rule: Schema and type safety** ([`.cursor/rules/schema-and-type-safety.mdc`](../.cursor/rules/schema-and-type-safety.mdc)) — **done:** transforms, composition, persisted vs transient, and example block added; `agents.md` defers to the rule + ADR-008.
  - Update [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md) to source the `.strict()` requirement directly (or cite the new rule) instead of pointing back at `agents.md` — **done:** decision §6 cross-references `.cursor/rules/schema-and-type-safety.mdc` for operational patterns (ADR body already stated `.strict()`; no `agents.md` authority).

- [x] **Migrate Dexie + LiveQueryStores guidelines**
  - Move *Dexie + LiveQueryStores Guidelines* into **Rule: Local data and Dexie ownership** ([`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc)), with cross-references to [ADR-002](../adrs/ADR-002-local-data-ownership.md).
	- Module-location guidance is reconciled: [`src/lib/db.ts`](../src/lib/db.ts) is the single Dexie application database; files under `src/lib/db/` are helpers that use it, per the rule.
	- **Done:** rule sections *Reads and LiveQuery* and *Conventions* expanded (`liveQuery` vs `createLiveQueryStore`, derived views, Zod row types, minimal example); [`agents.md`](../agents.md) defers to the rule + ADR-002 with a short summary until retire.

- [x] **Migrate TanStack Query guidance**
  - Move *TanStack Query `createQuery()`* content into **`docs/tanstack-query.md`** with a short pointer from [`src/lib/api/README.md`](../src/lib/api/README.md) (**audit decision** in [`docs/agents-md-distribution-worksheet.md`](./agents-md-distribution-worksheet.md)); offline-first integration remains cross-linked from **Rule: Local data and Dexie ownership** ([`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc) *Remote and cache layers*).
  - Confirm that TanStack Query usage remains compatible with [ADR-001](../adrs/ADR-001-product-operating-model.md) offline-first and [ADR-002](../adrs/ADR-002-local-data-ownership.md) Dexie-as-system-of-record (queries should validate responses with Zod and fall back to local cache when offline). **Done:** [`docs/tanstack-query.md`](./tanstack-query.md) encodes the matrix; [`agents.md`](../agents.md) defers with a short summary until retire.

- [x] **Migrate Supabase auth, sharing, and cloud-backup wiring**
  - Move the *Supabase Auth, Sharing and Cloud Backup* section (client at `src/lib/supabaseClient.ts`, route guards via `locals.supabase` in `src/hooks.server.ts`) into the planned **Rule: Supabase enhancement boundary** with cross-references to [ADR-004](../adrs/ADR-004-account-and-cloud-enhancement-model.md) and [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md).
  - **Done:** [`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc) now includes *Auth, sharing, and backup — client surfaces* (accurate map: `locals.supabase`, `+layout.ts` / `data.supabase`, narrow `supabaseClient.ts`). [`agents.md`](../agents.md) defers with a short summary until retire. **Surfaced discrepancies:** [Deferred — Supabase wiring migration notes](./readme-adr-alignment-gaps.md#supabase-wiring-migration-notes-2026-05-12) in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) (legacy bullets vs current code; links GAP-016 / GAP-017).

- [ ] **Reconcile Architecture highlights and Env & secrets**
  - Fold *Architecture highlights* into the relevant ADRs and scoped READMEs ([ADR-002](../adrs/ADR-002-local-data-ownership.md), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), [ADR-007](../adrs/ADR-007-ai-provider-contract.md), [`src/lib/api/README.md`](../src/lib/api/README.md), [`src/lib/stores/README.md`](../src/lib/stores/README.md)) rather than restating in `agents.md`.
  - Update the OpenAI module map: `agents.md` only lists `src/lib/server/openai.ts` and `src/lib/openai/*.ts`, but current code also uses `src/lib/api/ai/` per [ADR-007](../adrs/ADR-007-ai-provider-contract.md) (see [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) GAP-011).
  - *Env & secrets* is already covered by [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md); confirm coverage and remove from `agents.md` (private OpenAI key naming aligned with **`OPENAI_API_KEY`**; **GAP-003** resolved in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md)).

- [ ] **Migrate Documentation References**
  - Move the external doc link list into the root [README](../README.md) Documentation Map (or a dedicated `docs/references.md`) and remove from `agents.md`.

- [ ] **Update ADRs that cite `agents.md`**
  - [ADR-002](../adrs/ADR-002-local-data-ownership.md) (*Supporting context*), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md) (*Decision pressure*, *Enforcement rules*), and [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md) (*Decision* §6, *Compliance*, *Implementation compliance*) currently cite `agents.md` as authority. Replace those citations with self-contained statements or references to the new Cursor rule(s) once authored.

- [ ] **Update `.cursor/rules/svelte-mcp-workflow.mdc`**
  - Closing line now points at `svelte-5-ui-conventions.mdc` and [`docs/adr-and-rules-todo.md`](./adr-and-rules-todo.md); when `agents.md` is fully retired, trim any remaining migration caveats if redundant.

- [ ] **Retire `agents.md`**
  - After all content has been migrated and ADRs/rules updated, delete `agents.md` (or replace with a brief redirect note pointing at the rule index, ADR index, and README).
  - Search the repo for residual references to `agents.md`/`AGENTS.md` and update them. Cross-link this task with the closure of GAP-011 through GAP-015 in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).
