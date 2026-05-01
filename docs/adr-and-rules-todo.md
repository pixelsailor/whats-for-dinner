# ADR and Rules Todo

This backlog turns the project principles in the top-level README into enforceable decisions, Cursor rules, and agent workflow artifacts. It is not an implementation task list for product features; it is a governance backlog for resetting the project around the intended architecture.

## ADR Backlog

- [ ] **ADR: Product operating model**
  - Define WFD as an offline-first, anonymous-first recipe book with optional cloud and AI enhancements.
  - Establish which capabilities must work without auth, network, Supabase, or OpenAI.

- [ ] **ADR: Local data ownership**
  - Define Dexie and IndexedDB as the default home for saved recipes, preferences, recommendation inputs, and cached suggestion artifacts.
  - Clarify which records are durable user data and which records are transient cache data.

- [ ] **ADR: AI suggestion lifecycle**
  - Define how prompts, viewed suggestions, generated full recipes, and saved recipes move through the system.
  - Specify retention expectations, cache invalidation, and the rule that AI suggestions are not cloud-saved unless converted into user-saved recipes.

- [ ] **ADR: Account and cloud enhancement model**
  - Define Supabase's scope: authentication, backup, sharing, and synchronization.
  - Require logged-out and offline continuity for users who previously registered.

- [ ] **ADR: Sync and conflict resolution**
  - Define ownership, timestamps, deleted states, restore behavior, and conflict handling between local Dexie data and Supabase backups.
  - Clarify how soft deletes and `checkout_history` participate in sync.

- [ ] **ADR: Serverless and secret boundary**
  - Define the accepted server-side surfaces for OpenAI and privileged Supabase work.
  - Prohibit secrets and server-only imports in `.svelte` files, client modules, and browser-executed utilities.
  - Capture Cloudflare Workers/Pages compatibility constraints.

- [ ] **ADR: AI provider contract**
  - Define the OpenAI Chat Completions integration shape, structured response expectations, error handling, retries, and offline fallback behavior.
  - Require user preferences to be included in recipe-generation prompts.

- [ ] **ADR: Schema-led domain contracts**
  - Require Zod schemas as the source of truth for persisted records, API payloads, and AI-generated data.
  - Define where schemas, derived types, model helpers, services, and stores belong.

- [ ] **ADR: Recommendations engine inputs**
  - Define the local data used by recommendations, including saved recipes, tags, preferences, ratings or favorites, and `checkout_history`.
  - Separate deterministic local recommendations from AI-assisted suggestions.

- [ ] **ADR: Offline cache and service worker policy**
  - Define what must be cached, what must never be cached, storage budget expectations, and cache eviction rules.
  - Cover static shell assets, route data, local database state, and transient AI artifacts.

- [ ] **ADR: Feature roadmap boundaries**
  - Capture architectural boundaries for Calendar, URL recipe import, OCR import, and Meal Planner before implementation starts.
  - Identify where each feature should own deeper design docs.

## Cursor Rule Backlog

- [ ] **Rule: README governance**
  - Keep the top-level README focused on project purpose, principles, stack, and durable boundaries.
  - Direct detailed implementation guidance to ADRs, directory READMEs, or focused docs.

- [ ] **Rule: Offline-first development**
  - Require new features to define anonymous, offline, loading, and reconnect behavior.
  - Flag changes that make auth, Supabase, OpenAI, or network access mandatory for core recipe book flows.

- [ ] **Rule: Local data and Dexie ownership**
  - Enforce Dexie-backed reads for local-first user data.
  - Require mutations to flow through domain/store helpers rather than ad hoc component logic.

- [ ] **Rule: AI integration boundary**
  - Require OpenAI calls to stay in server-only modules or SvelteKit server routes.
  - Require request and response validation, preference inclusion, and no direct client-side AI calls.

- [ ] **Rule: Supabase enhancement boundary**
  - Treat Supabase as optional for backup, sync, sharing, and auth.
  - Require graceful behavior when users are logged out, offline, or missing cloud permissions.

- [ ] **Rule: Svelte 5 and UI conventions**
  - Enforce runes-based Svelte 5 patterns, accessibility expectations, bits-ui-first composition, and TailwindCSS styling conventions.
  - Require Svelte MCP validation when Svelte components are written or changed.

- [ ] **Rule: Schema and type safety**
  - Require Zod schemas for external, persisted, and AI-generated data.
  - Require TypeScript types to be inferred from schemas rather than duplicated manually.

- [ ] **Rule: Serverless compatibility**
  - Flag Node-specific APIs in server code unless explicitly isolated from the Cloudflare target.
  - Require private environment imports only in server-side modules.

- [ ] **Rule: ADR compliance**
  - Require agents to consult relevant ADRs before changing architecture, data flow, auth, sync, AI, or offline behavior.
  - Require unresolved mismatches to be recorded in the alignment gap document rather than hidden in implementation comments.

## Orchestrated Agent Workflow Backlog

- [ ] **Create `docs/adrs/`**
  - Add an ADR template with status, context, decision, consequences, enforcement rules, and supersession notes.

- [ ] **Create an alignment gap document**
  - Track areas where current implementation differs from accepted ADRs.
  - Include owner, severity, affected files or domains, recommended remediation, and whether the gap blocks future work.

- [ ] **Create a planning artifact template**
  - Require scoped phases, files likely to change, validation steps, risks, and rollback notes before significant implementation.

- [ ] **Create a validation checklist**
  - Cover offline behavior, anonymous behavior, auth boundaries, cloud behavior, AI disabled behavior, schema validation, accessibility, and tests.

- [ ] **Create a test matrix template**
  - Track expected coverage for unit, component, browser, offline, and integration-like flows.

- [ ] **Define Plan-Build-Validate-Test roles**
  - Planner produces an executable plan and identifies relevant ADRs.
  - Builder implements one bounded phase.
  - Validator reviews against ADRs, rules, and the alignment gap document.
  - Test role adds or updates focused tests and records residual risk.

- [ ] **Add workflow gate rules**
  - Require ADR creation or update before changing durable architecture.
  - Require alignment gaps for known deviations that are not fixed in the same change.
  - Require validation output before merge-ready claims.

- [ ] **Harden PR and commit expectations**
  - Require summaries to distinguish product behavior, architecture changes, and gap remediation.
  - Require test evidence or explicit untested risk for each change.
