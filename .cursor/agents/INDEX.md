# Agents Index

> **Version 2.0.0** | Last updated: 2026-05-16

Quick reference for routing WFD work through the task-folder orchestration model. The detailed guide lives in [`docs/ORCHESTRATED_DEVELOPMENT.md`](../../docs/ORCHESTRATED_DEVELOPMENT.md).

## Agents

| Agent            | Role                                                                                                                                                        |        Writes code?         | Owns artifacts                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------: | ------------------------------------------------------------------------------------------------------------------- |
| **Orchestrator** | Coordinates the run, enforces gates, updates manifest state, issues directives, records human approval                                                      |             No              | `task-manifest.json`, `human-approval.md` (Gate 6 record)                                                           |
| **Planner**      | Converts objective into executable scope, interfaces, ADR implications, commands, ACs, and planned test layers                                              |             No              | `plan.md`, `acceptance-criteria.md`, `test-matrix.md` (planned; required for medium/large or testable code changes) |
| **Builder**      | Implements exactly the planned scope and records implementation evidence                                                                                    |             Yes             | `build-log.md`                                                                                                      |
| **Tester**       | Maps ACs to Vitest tests and records coverage evidence                                                                                                      | Test files and harness only | `test-report.md`, `test-matrix.md` (actual)                                                                         |
| **Validator**    | Fresh-context audit after Tester using [`docs/validation-checklist.md`](../../docs/validation-checklist.md) where applicable; verdict and remediations only |             No              | `validation-report.md`                                                                                              |

**Test runners (WFD):** Vitest `server` (unit/INTG) and `client` (component/browser via Playwright provider). See [`docs/test-matrix-template.md`](../../docs/test-matrix-template.md). Standalone `@playwright/test` E2E is **not** adopted.

## Default Pipeline

```mermaid
graph LR
    Orch["Orchestrator"] -->|directive| Plan["Planner"]
    Plan -->|plan + ACs| Orch
    Orch -->|directive| Build["Builder"]
    Build -->|build log| Orch
    Orch -->|directive| TesterAgent["Tester"]
    TesterAgent -->|test report| Orch
    Orch -->|directive| Valid["Validator"]
    Valid -->|"PASS or PASS_WITH_NOTES"| Orch
    Valid -->|"FAIL: remediations"| Orch
    Orch -->|"fix directive"| Build
    Orch -->|"Gate 6 approval"| Complete["Complete"]
```

Validator `FAIL` routes through a fresh Builder session, then `Tester`, then `Validator` again. The Orchestrator never self-reviews or self-fixes.

When ADRs apply, cite implications in `plan.md` → **ADR references**; the Validator audits against those ADRs and [`docs/readme-adr-alignment-gaps.md`](../../docs/readme-adr-alignment-gaps.md).

## Run State

Every run lives under `.cursor/orchestrations/{task-id}/`.

| File                     | Owner                               | Purpose                                                                                                                                                                                     |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task-manifest.json`     | Orchestrator                        | Source of truth for status, current agent, gates, loops, locks, sessions, approval. `pipeline` = stage handoffs only (`planner` … `validator`); Orchestrator bookends are not in the array. |
| `plan.md`                | Planner                             | Design truth, scope boundary, file map, interfaces, ADR implications                                                                                                                        |
| `acceptance-criteria.md` | Planner                             | Stable `AC-01` style criteria for Tester and Validator                                                                                                                                      |
| `test-matrix.md`         | Planner (planned) / Tester (actual) | Layer and AC coverage; required for medium/large or testable code changes                                                                                                                   |
| `build-log.md`           | Builder                             | Files changed, command evidence, deviations, gaps                                                                                                                                           |
| `test-report.md`         | Tester                              | AC-to-test map, uncovered criteria, stability notes, commands                                                                                                                               |
| `validation-report.md`   | Validator                           | Verdict, evidence, ADR/checklist compliance, regressions, remediations                                                                                                                      |
| `human-approval.md`      | Orchestrator                        | Gate 6 evidence summary and approval/rework record                                                                                                                                          |

## Lifecycle Gates

| Gate | Name                 | Required for                                                                                  |
| ---- | -------------------- | --------------------------------------------------------------------------------------------- |
| 0    | Intake and risk tier | Every run                                                                                     |
| 1    | Requirements freeze  | Planned runs                                                                                  |
| 2    | Executable plan      | Planned runs                                                                                  |
| 3    | Build complete       | Every code-changing run                                                                       |
| 4    | Tests mapped         | Every code-changing run unless explicitly recorded as skipped for a small non-testable change |
| 5    | Validation green     | Medium/large runs and small runs when not explicitly skipped                                  |
| 6    | Human approval       | Every code-changing run before `complete`                                                     |

## Right-Sized Flows

| Change size | Example                                                                            | Pipeline                                                                               |
| ----------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Small**   | One-file copy fix, isolated doc tweak, low-risk UI polish                          | Orchestrator -> Builder -> Tester or Validator as justified -> Orchestrator Gate 6     |
| **Medium**  | New component, route behavior, local store change                                  | Orchestrator -> Planner -> Builder -> Tester -> Validator -> Orchestrator Gate 6       |
| **Large**   | Multi-phase feature, sync/auth/AI/offline/security work, ADR-governed architecture | Orchestrator -> Planner -> (Builder -> Tester -> Validator) x N -> Orchestrator Gate 6 |

Planner and Validator should not be skipped for durable architecture, Accepted ADR boundaries, local data ownership, offline behavior, auth/cloud sync, AI provider work, service worker changes, or security-sensitive changes.

### Small-run paths (`risk_tier.level: small`)

Record skips in `risk_tier.skipped_stages` and `gate_status`. Gate 6 is always required for code-changing runs.

| Path  | Stages run          | Skips                      | Reaches `awaiting_human` when                              | Full orchestrated merge-ready?                  |
| ----- | ------------------- | -------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| **A** | Builder → Tester    | Planner, Validator         | `test-report.md` complete; `gate_5_validation` = `skipped` | **No** — human + PR checklist substitutes MG-03 |
| **B** | Builder → Validator | Planner, Tester            | `validation-report.md` **PASS** / **PASS_WITH_NOTES**      | **Yes** if MG-01–MG-05 green in report          |
| **C** | Builder only        | Planner, Tester, Validator | `build-log.md` complete; all skips documented              | **No** — human substitute audit required        |

Details: [`.cursor/agents/orchestrator.md`](./orchestrator.md) rules 19–20; [`docs/validation-checklist.md`](../../docs/validation-checklist.md#small-run-skips-risk_tierlevel-small).

## Rule bindings

Each agent has a **contract** (`.cursor/agents/*.md`) and a matching **Cursor rule** (`.cursor/rules/*.mdc`, `alwaysApply: false` — invoke manually or `@` when running that role). Topic rules still apply by path and `alwaysApply`. When workflow semantics change, update the agent contract and its `.mdc` rule in the same pass.

| Agent        | Cursor rule        | Topic rules (representative)                                                                                                              |
| ------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator | `orchestrator.mdc` | `orchestration-artifacts.mdc`, `workflow-gates.mdc`, `adr-compliance.mdc`                                                                 |
| Planner      | `planner.mdc`      | `orchestration-artifacts.mdc`, `workflow-gates.mdc`, `test-matrix.mdc`, `adr-compliance.mdc`                                              |
| Builder      | `builder.mdc`      | `orchestration-artifacts.mdc`, `workflow-gates.mdc`, `adr-compliance.mdc`, `lint-and-code-quality.mdc`, domain rules per touched paths    |
| Tester       | `tester.mdc`       | `orchestration-artifacts.mdc`, `workflow-gates.mdc`, `test-matrix.mdc`, `adr-compliance.mdc`, `lint-and-code-quality.mdc` for `*.test.ts` |
| Validator    | `validator.mdc`    | `orchestration-artifacts.mdc`, `workflow-gates.mdc`, `validation-checklist.mdc`, `adr-compliance.mdc`                                     |

Catalog: [`.cursor/rules/index.md`](../rules/index.md).

## Document precedence

When sources conflict: **Accepted ADRs + GOVERNANCE** → **workflow-gates.mdc** (merge-ready) → **role contracts** (this folder) → **orchestration templates** → [`docs/ORCHESTRATED_DEVELOPMENT.md`](../../docs/ORCHESTRATED_DEVELOPMENT.md).

## Binding References

| Area                    | Reference                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Role contracts          | `.cursor/agents/orchestrator.md`, `planner.md`, `builder.md`, `tester.md`, `validator.md`                                            |
| Per-role Cursor rules   | `.cursor/rules/orchestrator.mdc`, `planner.mdc`, `builder.mdc`, `tester.mdc`, `validator.mdc`                                        |
| Artifact edit ownership | `.cursor/rules/orchestration-artifacts.mdc`                                                                                          |
| ADR authority           | `adrs/INDEX.md`, `adrs/GOVERNANCE.md`                                                                                                |
| Project conventions     | `.cursor/rules/project-best-practices.mdc`, `.cursor/rules/documentation-conventions.mdc`, `.cursor/rules/lint-and-code-quality.mdc` |
| Svelte workflow         | `.cursor/rules/svelte-mcp-workflow.mdc`, `.cursor/rules/svelte-5-ui-conventions.mdc`                                                 |

## Common Starts

- **Full feature:** Start with Orchestrator, classify tier, create manifest, route Planner.
- **Targeted resume:** Start with Orchestrator, adopt task folder, inspect manifest and artifacts, route the next required role.
- **Validation failure:** Orchestrator reads `validation-report.md`, increments `loop_count` when allowed, routes Builder with Required remediations, then Tester and Validator.
- **Human rework request:** Orchestrator records `rework_history`, increments `rework_count`, clears stale completion approval fields, and routes Builder unless scope changed enough to require Planner.
