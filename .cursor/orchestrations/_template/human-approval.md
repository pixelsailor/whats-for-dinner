# Human Approval — wfd-000

Replace `wfd-000` with `task_id`. Complete Gate 6 after Validator verdict is **PASS** or **PASS_WITH_NOTES** and before the run is marked `complete`.

## Evidence Summary

| Field               | Value |
| ------------------- | ----- |
| Task ID             |       |
| Objective           |       |
| Risk tier           |       |
| Files changed       |       |
| Acceptance coverage |       |
| Validation verdict  |       |
| Commands run        |       |
| Commands not run    |       |
| Rework count        |       |
| Known follow-ups    |       |

## Approval Decision

| Field                  | Value                                                                      |
| ---------------------- | -------------------------------------------------------------------------- |
| Approver               |                                                                            |
| Outcome                | pending / approved / approved_with_conditions / rejected / rejected_rework |
| Approved at (ISO-8601) |                                                                            |
| Conditions             |                                                                            |
| Notes                  |                                                                            |

## Rework Directive

Complete only when the outcome is `rejected_rework`.

| Field                          | Value             |
| ------------------------------ | ----------------- |
| Rejected by                    |                   |
| Rejection timestamp (ISO-8601) |                   |
| Rejection reason               |                   |
| Required rework                |                   |
| Return stage                   | Builder / Planner |

## Confirmation

I have reviewed the implementation, tests, validation report, and command evidence for this task and approve the recorded Gate 6 outcome.

**Signature / record:** (name or system ID)

---

Mirror the same outcome fields in `task-manifest.json` under `human_approval`. If the outcome is `rejected_rework`, increment `rework_count`, append `rework_history`, and route the run back through Builder -> Tester -> Validator unless the rework changes scope enough to require Planner.

When outcome is `approved` or `approved_with_conditions`, the Orchestrator asks whether to create a git commit (application changes; optionally this task folder). Commit only if the human explicitly confirms in the same thread.
