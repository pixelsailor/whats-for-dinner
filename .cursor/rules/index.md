> _This is a work in progress and should not be used as a reference at this time_

# Rules Index

## Lookup by Category

| Category | Rule | One-liner | Activation |
|----------|------|-----------|------------|
| **Code Conventions** | project-best-practices | Project structuree, path aliases, Svelte patterns, key scripts | alwaysApply |
| | lint-and-code-quality | TypeScript strict mode, template accessibility, SCSS patterns | alwaysApply |
| | jsdoc-conventions | Enterprise-grade JSDoc on all production TS and svelte files | alwaysApply |
| | ui-conventions | bits-ui first component selection, design tokens | globs |
| **ADR-Backed Conventions** | error-handling-conventions | Shared error pages, per-service HTTP handling, no global interceptor | globs |
| | security-sanitization | | globs |
| | storage-conventions | Registered storage keys, naming, cleanup, and cache constraints | globs |
| **Governance** | adr-compliance | ADR consultation, `_ARCHITECTURE_CONTRAINTS.md`, and architecture-gap escalation | alwaysApply |
| **Agent Workflow** | orchestrator | Orchestration controller for Plan-Build-Validate-Test loops | manual |
| | planner | Creates executable phased plans and artifacts | manual |
| | builder | Implements a single plan phase within strict scope | manual |
| | validator | Fresh-context code review; produces punch list, no fixes | manual |
| | test | Writes/updates Vitest specs and `_TEST_MATRIX.md` | manual |

## Activation Modes

| Mode | Behavior | Rules |
|------|----------|-------|
| **alwaysApply** | Loaded into every agent session automatically. No user action needed | project-best-practices, lint-and-code-quality, jsdoc-conventions, adr-compliance |
| **globs** | Loaded when the agent touches files matching the glob pattern. | ui-conventions, error-handling-conventions, security-sanitization, storage-conventions |
| **manual** | Loaded only when the user explicitly invokes the rule. | orchestrator, plannere, builder, validator |