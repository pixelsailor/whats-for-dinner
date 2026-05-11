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

## Cursor Rule Backlog

- [x] **Rule: README governance**
  - Keep the top-level README focused on project purpose, principles, stack, and durable boundaries.
  - Direct detailed implementation guidance to ADRs, directory READMEs, or focused docs.

- [x] **Rule: Offline-first development**
  - Require new features to define anonymous, offline, loading, and reconnect behavior.
  - Flag changes that make auth, Supabase, OpenAI, or network access mandatory for core recipe book flows.
  - **Done:** [`.cursor/rules/offline-first-development.mdc`](../.cursor/rules/offline-first-development.mdc) (`alwaysApply`). **Follow-up:** [ADR-001](../adrs/ADR-001-product-operating-model.md) and [ADR-010](../adrs/ADR-010-offline-cache-and-service-worker.md) enforcement sections still mention a “future” offline-first rule / `agents.md` — see [`docs/readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) **GAP-018**.

- [ ] **Rule: Offline and connectivity user messaging**
  - Require explicit, consistent user-facing messaging when the app is offline or when network-only capabilities are unavailable (including reconnect and queued/deferred work where applicable).
  - Distinguish **offline / no network** from **logged out**, **missing cloud permissions**, and **AI or provider disabled** so users are not misled about why an action is blocked.
  - Complements ADR-004’s cloud-unavailability messaging; the written rule should cite ADR-001, ADR-004, and ADR-007 where AI degradation overlaps.

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
  - **Done:** [`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc) (globs hooks, root layouts, standalone Supabase client modules, `src/lib/api/cloud/**`, account/auth API layers, `src/app.d.ts`). **Follow-up:** [`docs/readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) — **GAP-016** (dual Supabase keys, docs, browser-verified migration off legacy anon path) and **GAP-017** (unified Supabase client interface).

- [ ] **Rule: Self-hosting compatibility**
  - Require new cloud or AI work to document whether it depends on WFD-managed services, user-provided services, or either.
  - Flag account-permission checks that would incorrectly block configured personal AI APIs or user-hosted databases.

- [x] **Rule: Svelte 5 and UI conventions**
  - Enforce runes-based Svelte 5 patterns, accessibility expectations, bits-ui-first composition, and TailwindCSS styling conventions.
  - Require Svelte MCP validation when Svelte components are written or changed.
  - **Done:** [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) (globs `**/*.svelte`); MCP workflow remains in [`.cursor/rules/svelte-mcp-workflow.mdc`](../.cursor/rules/svelte-mcp-workflow.mdc).

- [ ] **Rule: Schema and type safety**
  - Require Zod schemas for external, persisted, and AI-generated data.
  - Require TypeScript types to be inferred from schemas rather than duplicated manually.

- [ ] **Rule: Serverless compatibility**
  - Flag Node-specific APIs in server code unless explicitly isolated from the Cloudflare target.
  - Require private environment imports only in server-side modules.

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

- [ ] **Create a validation checklist**
  - Cover offline behavior and user-visible offline/connectivity messaging, anonymous behavior, auth boundaries, cloud behavior, AI disabled behavior, self-hosted provider behavior, schema validation, accessibility, and tests.

- [ ] **Create a test matrix template**
  - Track expected coverage for unit, component, browser, offline, and integration-like flows.

- [ ] **Define Plan-Build-Validate-Test roles**
  - Planner produces an executable plan and identifies relevant ADRs.
  - Builder implements one bounded phase.
  - Validator reviews against ADRs, rules, and [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).
  - Test role adds or updates focused tests and records residual risk.

- [ ] **Add workflow gate rules**
  - Require ADR creation or update before changing durable architecture.
  - Require alignment gaps for known deviations that are not fixed in the same change.
  - Require validation output before merge-ready claims.

- [ ] **Harden PR and commit expectations**
  - Require summaries to distinguish product behavior, architecture changes, and gap remediation.
  - Require test evidence or explicit untested risk for each change.

## Legacy `agents.md` Distribution

The root [`agents.md`](../agents.md) predates the ADR system and the `.cursor/rules/` layout. Its content (product framing, Svelte 5 + runes guidance, TypeScript conventions, Dexie + LiveQueryStores patterns, TanStack Query usage, Supabase auth wiring, Zod rules, general code style, accessibility, architecture highlights, env/secrets, doc references) is still useful but should be **distributed** to ADRs, Cursor rules, and scoped READMEs. Three Accepted ADRs ([ADR-002](../adrs/ADR-002-local-data-ownership.md), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md)) currently cite `agents.md` as authority; the goal of this work is to make those ADRs self-sustaining and to retire `agents.md`. Preserve `agents.md` as-is until each task below is complete; alignment gaps surfaced during the audit are tracked in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).

- [x] **Audit `agents.md` content categories**
  - Map each section/snippet to its target home: existing or planned ADR, planned Cursor rule, scoped `src/lib/.../README.md`, or `docs/<topic>.md`.
  - Capture the audit as a worksheet (table or checklist) so distribution can proceed in bounded passes without losing context.
  - **Done:** [`docs/agents-md-distribution-worksheet.md`](./agents-md-distribution-worksheet.md) — the thematic migration bullets below do not replace this inventory (they skip intro/MCP duplication and do not record line-level mapping or the TanStack home decision).

- [x] **Migrate Svelte 5 + runes guidance**
  - Move the *Svelte 5 + Runes Best Practices* and *Reactive `$:` statements* sections (runes, `$props`, snippets, animations, accessibility, Dexie store subscription pattern) into the planned **Rule: Svelte 5 and UI conventions**.
  - **`$effect` guidance:** canonical wording is in [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) and summarized in [`agents.md`](../agents.md) until that file is retired — prefer `$derived` for pure derivations; use `$effect` for true side effects; do not avoid `$effect` when it is clearer or more efficient.

- [ ] **Migrate TypeScript and general code-style conventions**
  - Move *TypeScript Conventions*, *General Code Style*, and *Accessibility and UX* into a code-conventions Cursor rule (an existing `lint-and-code-quality` rule is referenced in [`.cursor/rules/index.md`](../.cursor/rules/index.md) — extend or create as appropriate).
  - Reconcile indentation guidance: *General Code Style* says 2-space indents while *TypeScript Conventions* says "Respect indents. Keep nested items aligned. Do not reset tabs for nested content." Decide which wording survives.

- [ ] **Migrate Zod validation rules**
  - Move *Zod Validation Rules* content (per-domain placement in `src/lib/api/**`, `.strict()`, `.safeParse()`, schema-derived types, `.transform()`, composite schemas) into the planned **Rule: Schema and type safety**.
  - Update [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md) to source the `.strict()` requirement directly (or cite the new rule) instead of pointing back at `agents.md`.

- [ ] **Migrate Dexie + LiveQueryStores guidelines**
  - Move *Dexie + LiveQueryStores Guidelines* into the planned **Rule: Local data and Dexie ownership**, with cross-references to [ADR-002](../adrs/ADR-002-local-data-ownership.md).
	- Module-location guidance is reconciled: [`src/lib/db.ts`](../src/lib/db.ts) is the single Dexie application database; files under `src/lib/db/` are helpers that use it, per [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc).

- [ ] **Migrate TanStack Query guidance**
  - Move *TanStack Query `createQuery()`* content into **`docs/tanstack-query.md`** with a short pointer from [`src/lib/api/README.md`](../src/lib/api/README.md) (**audit decision** in [`docs/agents-md-distribution-worksheet.md`](./agents-md-distribution-worksheet.md)); offline-first integration remains cross-linked from the planned **Rule: Local data and Dexie ownership**.
  - Confirm that TanStack Query usage remains compatible with [ADR-001](../adrs/ADR-001-product-operating-model.md) offline-first and [ADR-002](../adrs/ADR-002-local-data-ownership.md) Dexie-as-system-of-record (queries should validate responses with Zod and fall back to local cache when offline).

- [ ] **Migrate Supabase auth, sharing, and cloud-backup wiring**
  - Move the *Supabase Auth, Sharing and Cloud Backup* section (client at `src/lib/supabaseClient.ts`, route guards via `locals.supabase` in `src/hooks.server.ts`) into the planned **Rule: Supabase enhancement boundary** with cross-references to [ADR-004](../adrs/ADR-004-account-and-cloud-enhancement-model.md) and [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md).
  - **Progress:** Agent-facing boundary text now lives in [`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc); verbatim migration from [`agents.md`](../agents.md) remains open.

- [ ] **Reconcile Architecture highlights and Env & secrets**
  - Fold *Architecture highlights* into the relevant ADRs and scoped READMEs ([ADR-002](../adrs/ADR-002-local-data-ownership.md), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), [ADR-007](../adrs/ADR-007-ai-provider-contract.md), [`src/lib/api/README.md`](../src/lib/api/README.md), [`src/lib/stores/README.md`](../src/lib/stores/README.md)) rather than restating in `agents.md`.
  - Update the OpenAI module map: `agents.md` only lists `src/lib/server/openai.ts` and `src/lib/openai/*.ts`, but current code also uses `src/lib/api/ai/` per [ADR-007](../adrs/ADR-007-ai-provider-contract.md) (see [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) GAP-011).
  - *Env & secrets* is already covered by [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md); confirm coverage and remove from `agents.md` (the `VITE_OPENAI_API_KEY` naming concern is GAP-003).

- [ ] **Migrate Documentation References**
  - Move the external doc link list into the root [README](../README.md) Documentation Map (or a dedicated `docs/references.md`) and remove from `agents.md`.

- [ ] **Update ADRs that cite `agents.md`**
  - [ADR-002](../adrs/ADR-002-local-data-ownership.md) (*Supporting context*), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md) (*Decision pressure*, *Enforcement rules*), and [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md) (*Decision* §6, *Compliance*, *Implementation compliance*) currently cite `agents.md` as authority. Replace those citations with self-contained statements or references to the new Cursor rule(s) once authored.

- [ ] **Update `.cursor/rules/svelte-mcp-workflow.mdc`**
  - Closing line now points at `svelte-5-ui-conventions.mdc` and [`docs/adr-and-rules-todo.md`](./adr-and-rules-todo.md); when `agents.md` is fully retired, trim any remaining migration caveats if redundant.

- [ ] **Retire `agents.md`**
  - After all content has been migrated and ADRs/rules updated, delete `agents.md` (or replace with a brief redirect note pointing at the rule index, ADR index, and README).
  - Search the repo for residual references to `agents.md`/`AGENTS.md` and update them. Cross-link this task with the closure of GAP-011 through GAP-015 in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).
