> _This is a work in progress and should not be used as a reference at this time_

# Rules Index

## Lookup by Category

| Category | Rule | One-liner | Activation |
|----------|------|-----------|------------|
| **Code Conventions** | project-best-practices | Project structuree, path aliases, Svelte patterns, key scripts | alwaysApply |
| | svelte-5-ui-conventions | Svelte 5 runes (`$state`, `$derived`, `$effect`), a11y, bits-ui/Tailwind, serverless note | globs `**/*.svelte` |
| | lint-and-code-quality | TypeScript strict mode, template accessibility, SCSS patterns | alwaysApply |
| | jsdoc-conventions | Enterprise-grade JSDoc on all production TS and svelte files | alwaysApply |
| | ui-conventions | bits-ui first component selection, design tokens | globs |
| **ADR-Backed Conventions** | local-data-dexie-ownership | ADR-002: Dexie as local SoT; LiveQuery reads; mutations via stores/helpers | globs `src/lib/db.ts`, `src/lib/db/**`, `src/lib/stores/**` |
| | ai-integration-boundary | ADR-007/006: server-only provider, Responses+Zod, prefs on generation, no client SDK/secrets | globs `src/lib/api/ai/**`, `src/lib/server/**`, `src/lib/openai/**`, `src/routes/api/**`, `src/routes/**/+page.server.ts` |
| | error-handling-conventions | Shared error pages, per-service HTTP handling, no global interceptor | globs |
| | security-sanitization | | globs |
| | storage-conventions | Registered storage keys, naming, cleanup, and cache constraints | globs |
| **Governance** | adr-compliance | ADR consultation, `_ARCHITECTURE_CONTRAINTS.md`, and architecture-gap escalation | alwaysApply |
| | readme-governance | Root README scope; deep docs → ADRs, scoped READMEs, `docs/` | globs `README.md` |
| **Agent Workflow** | orchestrator | Orchestration controller for Plan-Build-Validate-Test loops | manual |
| | planner | Creates executable phased plans and artifacts | manual |
| | builder | Implements a single plan phase within strict scope | manual |
| | validator | Fresh-context code review; produces punch list, no fixes | manual |
| | test | Writes/updates Vitest specs and `_TEST_MATRIX.md` | manual |

## Activation Modes

| Mode | Behavior | Rules |
|------|----------|-------|
| **alwaysApply** | Loaded into every agent session automatically. No user action needed | project-best-practices, lint-and-code-quality, jsdoc-conventions, adr-compliance |
| **globs** | Loaded when the agent touches files matching the glob pattern. | svelte-5-ui-conventions, local-data-dexie-ownership, ai-integration-boundary, ui-conventions, error-handling-conventions, security-sanitization, storage-conventions |
| **manual** | Loaded only when the user explicitly invokes the rule. | orchestrator, planner, builder, validator |