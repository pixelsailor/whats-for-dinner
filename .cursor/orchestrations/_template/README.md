# Orchestration task templates

Copy these files into **`.cursor/orchestrations/{task-id}/`** when starting a new run (replace `wfd-000` with your `task_id`).

| File | Owner | When |
|------|-------|------|
| `task-manifest.json` | Orchestrator | Bootstrap run (edit `task_id`, `objective`, `locked_artifacts`) |
| `plan.md` | Planner | Before Builder; fill all sections, delete guidance comments |
| `acceptance-criteria.md` | Planner | With `plan.md`; every AC must map to validation steps |
| `test-matrix.md` | Planner → Test | Planner: **Planned coverage** (layers × AC). Test: **Actual coverage** — see [`docs/test-matrix-template.md`](../../../docs/test-matrix-template.md) |
| `build-log.md` | Builder | After implementation (starts from template or empty sections) |
| `test-report.md` | Test | After automated tests; AC coverage map, commands, gaps |
| `validation-report.md` | Validator | After audit; use template + [`docs/validation-checklist.md`](../../../docs/validation-checklist.md) |
| `human-approval.md` | Orchestrator / human | After Validator **PASS** or **PASS_WITH_NOTES** |

**Do not** commit filled task folders under `.cursor/orchestrations/{task-id}/` unless the team explicitly tracks orchestration runs in git.

Contracts: [`.cursor/agents/planner.md`](../../agents/planner.md), [`.cursor/agents/builder.md`](../../agents/builder.md), [`docs/ORCHESTRATED_DEVELOPMENT.md`](../../../docs/ORCHESTRATED_DEVELOPMENT.md).
