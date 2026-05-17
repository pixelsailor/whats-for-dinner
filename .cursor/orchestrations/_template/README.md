# Orchestration task templates

Copy these files into **`.cursor/orchestrations/{task-id}/`** when starting a new run. The directory name and manifest `task_id` **must match exactly** (replace `wfd-000` in templates with that slug).

| File                     | Owner                | When                                                                                                                                                 |
| ------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task-manifest.json`     | Orchestrator         | Bootstrap run (edit `task_id`, `objective`, `locked_artifacts`)                                                                                      |
| `plan.md`                | Planner              | Before Builder; fill all sections, delete guidance comments                                                                                          |
| `acceptance-criteria.md` | Planner              | With `plan.md`; every AC must map to validation commands                                                                                             |
| `test-matrix.md`         | Planner → Tester     | **Required** for medium/large or testable code changes; optional for small doc-only / non-testable runs. Planner: **Planned coverage**; Tester: **Actual coverage** — [`docs/test-matrix-template.md`](../../../docs/test-matrix-template.md) |
| `build-log.md`           | Builder              | After implementation (starts from template or empty sections)                                                                                        |
| `test-report.md`         | Tester               | After automated tests; AC coverage map, commands, gaps                                                                                               |
| `validation-report.md`   | Validator            | After audit; use template + [`docs/validation-checklist.md`](../../../docs/validation-checklist.md)                                                  |
| `human-approval.md`      | Orchestrator / human | After Validator **PASS** or **PASS_WITH_NOTES**                                                                                                      |

### `gate_status` values

Each `gate_status` key (`gate_0_intake` … `gate_6_human_approval`): `pending` | `passed` | `failed` | `blocked` | `skipped` | `n/a`.

### Git policy (default)

During the run, agents do **not** commit on their own. After Gate 6 human approval (`human-approval.md` recorded, manifest `status: complete`), the **Orchestrator asks** whether to create a git commit (application changes per `build-log.md`; optionally `.cursor/orchestrations/{task-id}/`). Run `git commit` only when the human explicitly confirms in the same thread.

Until then, keep task folders local and put **review evidence in the PR** (commands, verdict, AC coverage, MG-\* checklist).

Aligned with [`docs/pr-and-commit-guide.md`](../../../docs/pr-and-commit-guide.md) and [`.cursor/rules/workflow-gates.mdc`](../../rules/workflow-gates.mdc).

Contracts: [`.cursor/agents/planner.md`](../../agents/planner.md), [`.cursor/agents/builder.md`](../../agents/builder.md), [`docs/ORCHESTRATED_DEVELOPMENT.md`](../../../docs/ORCHESTRATED_DEVELOPMENT.md).
