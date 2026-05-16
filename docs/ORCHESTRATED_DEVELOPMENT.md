# Orchestrated Development for What's For Dinner

Reference guide for running WFD's multi-agent workflow in Cursor. This guide is scoped to this repository and uses the local contracts under `.cursor/agents/` and `.cursor/orchestrations/`.

## Why This Exists

- Keep orchestration deterministic across fresh agent sessions.
- Make stage handoffs explicit through artifacts, not chat memory.
- Preserve reusable prompt patterns for full runs, targeted stage runs, and resumes.
- Preserve WFD's task-folder artifact model while adding stronger lifecycle gates and handoff discipline.

## Core Model

All run state lives under:

- `.cursor/orchestrations/{task-id}/`

The task folder is the durable record. Do not move orchestration state into repo-root `_*.md` files for WFD runs.

Primary state file:

- `task-manifest.json` (owned by Orchestrator)

Canonical pipeline:

- `Orchestrator -> Planner -> Builder -> Test -> Validator -> Orchestrator`

The pipeline can be right-sized for small work, but the Orchestrator must record the chosen tier and rationale in the manifest before skipping stages.

## Agent Responsibilities

| Agent | Owns | Must not do |
| --- | --- | --- |
| `Orchestrator` | Lifecycle, routing, manifest state, gate policy, human approval, rework routing | Write application code, plan implementation details, test, or validate its own work |
| `Planner` | `plan.md`, `acceptance-criteria.md`, `test-matrix.md` (planned), scope, commands, ADR implications | Implement, test, edit manifest, or guess through open questions |
| `Builder` | Code/config changes in plan scope, `build-log.md`, command evidence | Redesign, expand scope silently, edit plan/manifest/tests |
| `Test` | Vitest specs, `test-matrix.md` (actual), `test-report.md` AC coverage map | Redesign feature code or weaken acceptance criteria |
| `Validator` | Independent audit and `validation-report.md` verdict | Fix code, rewrite tests, edit manifest, or approve missing ACs |

## Artifact Contract

Inside `.cursor/orchestrations/{task-id}/`:

- `task-manifest.json` - authoritative orchestration state.
- `plan.md` - implementation plan and scope boundary (phases, file map, interface contracts, ADR implications, validation commands, risks, rollback, open questions).
- `acceptance-criteria.md` - verifiable AC list using stable `AC-01`, `AC-02`, ... IDs.
- `test-matrix.md` - planned (Planner) and actual (Test) coverage by layer and AC.
- `build-log.md` - implemented changes, command evidence, deviations, unresolved questions, known gaps.
- `test-report.md` - AC-to-test coverage map, gaps, stability notes, commands.
- `validation-report.md` - verdict, AC/ADR/checklist audits, test/command evidence, and remediations.
- `human-approval.md` - Gate 6 evidence summary and approval/rework record when approval is collected.

Cross-cutting validation: [`docs/validation-checklist.md`](./validation-checklist.md). Test layers and runners: [`docs/test-matrix-template.md`](./test-matrix-template.md).

### Bootstrap from templates

Copy from [`.cursor/orchestrations/_template/`](../.cursor/orchestrations/_template/) into a new `{task-id}` folder:

1. `task-manifest.json` — set `task_id`, `objective`, `locked_artifacts`, and initial `gate_status` / `risk_tier` per Orchestrator.
2. `plan.md` and `acceptance-criteria.md` — Planner fills every section (see template comments); delete guidance before handoff.
3. `test-matrix.md` — recommended for non-trivial tasks; Planner fills **Planned coverage**.
4. `build-log.md` — optional at start; Builder completes after implementation.
5. `test-report.md` — Test completes after specs run (copy template if missing).

See [`_template/README.md`](../.cursor/orchestrations/_template/README.md) for the full file table.

## Lifecycle Gates

WFD uses explicit lifecycle gates within the task-folder model:

| Gate | Name | Owner | Pass condition |
| --- | --- | --- | --- |
| 0 | Intake and risk tier | Orchestrator | Objective is actionable; tier is recorded as `small`, `medium`, or `large`; skipped stages are justified. |
| 1 | Requirements freeze | Planner | `acceptance-criteria.md` covers user-visible behavior, states, edge cases, out-of-scope items, and open questions. |
| 2 | Executable plan | Planner | `plan.md` names files, interfaces, ADR implications, commands, and scope boundaries clearly enough for Builder. |
| 3 | Build complete | Builder | Planned changes are implemented or deviations are documented; `build-log.md` records command evidence and gaps. |
| 4 | Tests mapped | Test | `test-report.md` maps every AC to tests or an explicit uncovered reason, with exact commands. |
| 5 | Validation green | Validator | `validation-report.md` has `PASS` or `PASS_WITH_NOTES`, or a `FAIL` with executable remediations. |
| 6 | Human approval | Orchestrator | Evidence summary is presented; approval outcome is recorded before `complete`. |

Validator `FAIL` routes back to Builder within `max_loops`, then continues `Builder -> Test -> Validator`. Rejected human approval with rework follows the same loop under the same task id and increments rework tracking.

## Merge-ready gates

Lifecycle gates (0–6) track **pipeline stage** completion. **Merge-ready** is a separate bar: do not treat a green build or finished `build-log.md` as merge-ready.

Binding contract: [`.cursor/rules/workflow-gates.mdc`](../.cursor/rules/workflow-gates.mdc) (also [GOVERNANCE.md §10.5](../adrs/GOVERNANCE.md#105-merge-ready-gates-orchestrated-efforts), checklist **MG-01**–**MG-05** in [`validation-checklist.md`](./validation-checklist.md)).

| Merge-ready gate | Requirement |
| --- | --- |
| ADR | Create or update before durable architecture change, or documented follow-up (**MG-02**) |
| Alignment gaps | Deviations from Accepted ADRs recorded in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) when not fixed in scope (**MG-01**) |
| Validation | `validation-report.md` with **PASS** or **PASS_WITH_NOTES** and full checklist audit (**MG-03**) |
| Tests | `test-report.md` (+ `test-matrix.md` actual when planned) (**MG-04**, **TST-05**) |
| Tooling | `pnpm run check` and `pnpm run lint` for touched paths (**MG-05**) |

**Who may claim merge-ready:** Validator issues verdict only; Orchestrator may set `awaiting_human` after a passing validation path that satisfies merge-ready gates; `complete` requires human approval (Gate 6). Builder, Test, and Planner must not assert merge-ready in chat or artifacts.

Non-orchestrated architecture PRs still satisfy ADR, gap, and tooling gates; link test evidence or state residual risk in the PR body. Summary format: [`docs/pr-and-commit-guide.md`](./pr-and-commit-guide.md) and [`.github/pull_request_template.md`](../.github/pull_request_template.md).

## Usage Modes

### Manual Mode

Use a fresh chat per role and paste the Orchestrator's Next Agent Directive into the next agent session. This is best for learning the workflow or closely steering a sensitive task.

### Delegated Mode

The Orchestrator may spawn subagents for the full run or any remaining segment. Each subagent prompt must include the role contract, task folder, required inputs, scope allowlist, exit criteria, and stop conditions.

### Targeted Mode

Start at any stage when the required prior artifacts already exist. Examples:

- Re-run `Validator` after a test-only fix.
- Resume `Builder` from a failed validation report.
- Run `Planner` only to create a reusable implementation plan.

The Orchestrator must adopt the task folder first and decide the next stage from manifest state plus artifact completeness.

## Right-Sizing

| Tier | Typical use | Minimum path |
| --- | --- | --- |
| `small` | One or two files, low architectural risk, no durable data/security/offline boundary change | Orchestrator -> Builder -> Test or Validator as justified -> Orchestrator -> Gate 6 |
| `medium` | One feature area, several files, normal user-facing behavior | Full pipeline once |
| `large` | Multi-phase, cross-cutting, ADR-governed, migration, sync/auth/AI/offline/security work | Planner then repeated Builder -> Test -> Validator phases |

Accepted ADR-governed areas usually require at least `medium`. Offline-first, local data ownership, auth/cloud sync, AI provider boundaries, service worker behavior, and security-sensitive work should not skip Planner or Validator.

## Script Truth

Use commands that exist in `package.json`. Default WFD evidence commands:

```bash
pnpm run check
pnpm run lint
pnpm run test
pnpm run build
```

The Planner names the relevant commands for the phase. Builder, Test, and Validator record which commands they actually ran and the result. If a command cannot be run, the reason belongs in the relevant stage artifact.

## Task Manifest Expectations

`task-manifest.json` must remain valid JSON and include at least:

- `task_id`
- `objective`
- `status` (`in_progress`, `awaiting_human`, `complete`, `blocked`)
- `current_agent`
- `pipeline`
- `risk_tier`
- `gate_status`
- `completed_stages[]`
- `loop_count`
- `max_loops`
- `rework_count`
- `rework_history[]`
- `session_counts`
- `command_evidence[]`
- `locked_artifacts[]`
- `flags[]`
- `human_approval`

## Next Agent Directive

Every Orchestrator handoff should include this structure:

```text
NEXT ROLE:
<Planner | Builder | Test | Validator>

NEW SESSION:
YES

TASK FOLDER:
.cursor/orchestrations/<task-id>/

RISK / TIER:
<small | medium | large> - <short rationale>

OBJECTIVE:
- <success outcome>

CONTRACT CHECK:
- Controlling artifacts: <list>
- Scope allowlist: <files/folders>
- Exit criteria: <commands and behavioral checks>
- Locked artifacts: <from manifest or "none">

REQUIRED INPUTS TO READ FIRST:
- .cursor/orchestrations/<task-id>/task-manifest.json
- <role-specific artifacts>

VALIDATION COMMANDS:
- <exact pnpm commands from package.json>

OUTPUTS:
- <role-owned artifact>
- <summary / command evidence requirements>

STOP CONDITIONS:
- Objective or ACs are contradictory
- Plan requires locked or out-of-scope files
- An Accepted ADR conflict is found
- Required command is missing or impossible to run
- Dependency changes are needed without explicit approval
```

## Prompt Library

### Start a New Full Run

```text
You are the Orchestrator. Use the orchestrator rule.

Start a new WFD orchestration run with task_id "<task-id>".
Objective: <clear objective with user-visible outcome>.

Use the task-folder contract:
.cursor/orchestrations/{task-id}/task-manifest.json

Classify the risk tier, initialize the manifest, set current_agent to planner, and issue the Planner directive.
```

### Start a Small Targeted Run

```text
You are the Orchestrator. Use the orchestrator rule.

Start a small WFD orchestration run with task_id "<task-id>".
Objective: <specific low-risk change>.

If the objective qualifies as small, record the skipped-stage rationale in task-manifest.json and issue a Builder directive with explicit scope, command evidence, and Gate 6 expectations.
```

### Planner Manual Handoff

```text
You are the Planner. Use the planner rule.

Task folder:
.cursor/orchestrations/<task-id>/

Read task-manifest.json, adrs/INDEX.md, adrs/GOVERNANCE.md, and relevant Accepted ADRs.
Produce plan.md and acceptance-criteria.md following section order in .cursor/orchestrations/_template/plan.md (risk/phase strategy, phases, file map, validation commands, risks, rollback).
Include concrete file-level scope, interface contracts, ADR implications (not pointer-only), and stable AC IDs mapped to validation commands.
```

### Builder Manual Handoff

```text
You are the Builder. Use the builder rule.

Task folder:
.cursor/orchestrations/<task-id>/

Read task-manifest.json, plan.md, acceptance-criteria.md, and any validation-report.md required remediations.
Implement only plan scope and write build-log.md with files changed, command evidence, deviations, unresolved questions, and known gaps.
```

### Test Manual Handoff

```text
You are the Test agent. Use the test rule.

Task folder:
.cursor/orchestrations/<task-id>/

Read task-manifest.json, acceptance-criteria.md, plan.md, build-log.md, and test-matrix.md (if present).
Write/update Vitest tests; update test-matrix.md (actual coverage) when applicable; produce test-report.md mapping every AC to tests or an explicit uncovered reason.
Layer IDs and runners: docs/test-matrix-template.md
```

### Validator Manual Handoff

```text
You are the Validator. Use the validator rule.

Task folder:
.cursor/orchestrations/<task-id>/

Read plan.md, acceptance-criteria.md, build-log.md, test-report.md, docs/validation-checklist.md (applicable items), adrs/INDEX.md, and cited Accepted ADRs.
Produce validation-report.md with Verdict: PASS | PASS_WITH_NOTES | FAIL, AC audit, ADR compliance, checklist audit, test/command evidence, regressions, required remediations, and recommended remediations.
```

### Resume After Validator FAIL

```text
You are the Orchestrator. Use the orchestrator rule.

Resume task_id "<task-id>" after Validator FAIL.
Read validation-report.md and task-manifest.json.

If loop_count < max_loops, increment loop_count and route to Builder with Required remediations as the authoritative fix list, then continue Builder -> Test -> Validator.
If loop_count >= max_loops, set status to blocked, add max_loops_exceeded, and request human decision.
```

### Gate 6 Closeout

```text
You are the Orchestrator. Use the orchestrator rule.

Resume task_id "<task-id>" after PASS or PASS_WITH_NOTES.
Move the run to awaiting_human and present a Gate 6 evidence summary before requesting approval.

Record the approval result in task-manifest.json human_approval fields and mirror it in human-approval.md.
If approved or approved with conditions, mark status complete.
If rejected, block the run.
If rejected with rework, increment rework_count, append rework_history, clear stale approval completion fields, and route back through Builder -> Test -> Validator.
```

## Human Approval

Before asking for approval, present evidence from the artifacts:

- Task id and objective.
- Risk tier and skipped-stage rationale, if any.
- Files changed from `build-log.md`.
- AC coverage from `test-report.md`.
- Validation verdict and notes from `validation-report.md`.
- Commands run and any commands not run.
- Rework history, when `rework_count > 0`.

Approval outcomes:

- `approved` - complete the run.
- `approved_with_conditions` - record conditions, then complete the run.
- `rejected` - set the run to `blocked`.
- `rejected_rework` - preserve the same task id, record rework history, and route back to Builder unless the requested rework changes scope enough to require Planner.

## Practical Operating Notes

- Keep `locked_artifacts` accurate; agents treat listed paths as read-only.
- Keep `completed_stages` summaries short and factual.
- Prefer explicit, testable AC language over broad goals.
- Treat fresh sessions as the default for Planner, Builder, Test, and Validator.
- Do not skip Test after a remediation Builder loop.
- If objective, scope, or acceptance criteria are contradictory, block early and clarify before implementation.

## Source of Truth

When this guide conflicts with role contracts, trust the role contracts:

- `.cursor/agents/orchestrator.md`
- `.cursor/agents/planner.md`
- `.cursor/agents/builder.md`
- `.cursor/agents/test.md`
- `.cursor/agents/validator.md`
- `.cursor/rules/orchestration-artifacts.mdc`
