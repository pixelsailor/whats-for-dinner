> _This is a work in progress and should not be used as a reference at this time_

# Rules Index

## Lookup by Category

| Category | Rule | One-liner | Activation |
|----------|------|-----------|------------|
| **Code Conventions** | project-best-practices | Project structure, path aliases, Svelte patterns, key scripts | alwaysApply |
| | svelte-5-ui-conventions | Svelte 5 runes (`$state`, `$derived`, `$effect`), a11y, bits-ui/Tailwind, serverless note | globs `**/*.svelte` |
| | lint-and-code-quality | Prettier+ESLint; strict TS habits; `{#await}` with `:catch`; ADR links for architecture | globs `src/**/*.ts`, `src/**/*.svelte` |
| | documentation-conventions | Enterprise JSDoc on production TS; Svelte `@component` and script docs | alwaysApply |
| | bits-ui-documentation | bits-ui `llms.txt` index; approved fetches for `src/lib/ui/**` work | globs `src/lib/ui/**` |
| | ui-conventions | bits-ui first component selection, design tokens | globs |
| **ADR-Backed Conventions** | offline-first-development | ADR-001/010/004/007: matrix + SW vs Dexie; core recipe flows without mandatory cloud/AI | alwaysApply |
| | offline-connectivity-capability | Offline vs session vs permissions; sync reconnect; SW/load checks; degraded UX + GAP-001/016 cross-links | alwaysApply |
| | local-data-dexie-ownership | ADR-002: Dexie as local SoT; LiveQuery reads; mutations via stores/helpers | globs `src/lib/db.ts`, `src/lib/db/**`, `src/lib/stores/**` |
| | ai-integration-boundary | ADR-007/006: server-only provider, Responses+Zod, prefs on generation, no client SDK/secrets | globs `src/lib/api/ai/**`, `src/lib/server/**`, `src/lib/openai/**`, `src/routes/api/**`, `src/routes/**/+page.server.ts` |
| | supabase-enhancement-boundary | ADR-004/006: optional cloud auth/sync/share; local continuity; publishable client; CloudService/SyncService seams | globs hooks, `+layout*.ts`, Supabase client modules, `src/lib/api/cloud/**`, account/auth API, `src/app.d.ts` |
| | serverless-compatibility | ADR-006: private vs public env, no secrets in client graphs, Web APIs over Node in default server paths | globs `hooks.server.ts`, `src/routes/**/+*.server.ts`, `+server.ts`, `src/routes/api/**`, `src/lib/server/**`, `src/lib/openai/**`, `src/lib/api/**` |
| | schema-and-type-safety | ADR-008: Zod-led contracts, z.infer, api `*.schemas`/`*.types`, `$lib/types` for generics, boundary `safeParse`, `.strict()` | globs `src/lib/api/**`, `src/lib/types.ts`, `src/lib/db.ts`, `src/lib/db/**`, `src/routes/api/**`, `src/lib/stores/**` |
| | error-handling-conventions | Shared error pages, per-service HTTP handling, no global interceptor | globs |
| | security-sanitization | | globs |
| | storage-conventions | Registered storage keys, naming, cleanup, and cache constraints | globs |
| **Governance** | adr-compliance | ADR index + governance; alignment gaps in `docs/readme-adr-alignment-gaps.md` | alwaysApply |
| | readme-governance | Root README scope; deep docs → ADRs, scoped READMEs, `docs/` | globs `README.md` |
| **Agent Workflow** | orchestration-artifacts | Who may edit `.cursor/orchestrations/**` manifests and stage files | globs `.cursor/orchestrations/**` |
| | orchestrator | Orchestration controller for Plan-Build-Validate-Test loops | manual |
| | planner | Creates executable phased plans and artifacts | manual |
| | builder | Implements a single plan phase within strict scope | manual |
| | validator | Fresh-context code review; produces punch list, no fixes | manual |
| | test | Writes/updates Vitest specs and `_TEST_MATRIX.md` | manual |

## Activation Modes

| Mode | Behavior | Rules |
|------|----------|-------|
| **alwaysApply** | Loaded into every agent session automatically. No user action needed | project-best-practices, documentation-conventions, adr-compliance |
| **globs** | Loaded when the agent touches files matching the glob pattern. | svelte-5-ui-conventions, lint-and-code-quality, bits-ui-documentation, local-data-dexie-ownership, ai-integration-boundary, serverless-compatibility, schema-and-type-safety, ui-conventions, orchestration-artifacts, error-handling-conventions, security-sanitization, storage-conventions |
| **manual** | Loaded only when the user explicitly invokes the rule. | orchestrator, planner, builder, validator |
