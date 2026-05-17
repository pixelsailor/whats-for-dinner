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

Canonical lifecycle (human-readable):

- `Orchestrator -> Planner -> Builder -> Tester -> Validator -> Orchestrator`

In `task-manifest.json`, **`pipeline`** lists **stage handoff agents only** — typically `["planner", "builder", "tester", "validator"]`. The Orchestrator bookends the run (intake and Gate 6) and is **not** repeated in `pipeline`; after Validator **PASS** / **PASS_WITH_NOTES**, the Orchestrator sets `current_agent` to `orchestrator` for human approval per its contract.

The lifecycle can be right-sized for small work, but the Orchestrator must record the chosen tier and rationale in the manifest before skipping stages.

## Agent responsibilities

Canonical role table, artifacts, and gates: [`.cursor/agents/INDEX.md`](../.cursor/agents/INDEX.md). Per-role contracts: `.cursor/agents/{orchestrator,planner,builder,test,validator}.md` (each includes a **Minimum read set** to limit token use on small runs).

## Artifact Contract

Inside `.cursor/orchestrations/{task-id}/`:

- `task-manifest.json` - authoritative orchestration state.
- `plan.md` - implementation plan and scope boundary (phases, file map, interface contracts, ADR implications, validation commands, risks, rollback, open questions).
- `acceptance-criteria.md` - verifiable AC list using stable `AC-01`, `AC-02`, ... IDs.
- `test-matrix.md` - planned (Planner) and actual (Tester) coverage by layer and AC.
- `build-log.md` - files changed, command evidence, deviations, scope pressure, unresolved questions, known gaps.
- `test-report.md` - AC-to-test coverage map, gaps, stability notes, commands.
- `validation-report.md` - verdict, AC/ADR/checklist audits, test/command evidence, and remediations.
- `human-approval.md` - Gate 6 evidence summary and approval/rework record; Orchestrator creates or updates this whenever Gate 6 is recorded (approval, rejection, or rework).

Cross-cutting validation: [`docs/validation-checklist.md`](./validation-checklist.md). Test layers and runners: [`docs/test-matrix-template.md`](./test-matrix-template.md).

### Bootstrap from templates

Copy from [`.cursor/orchestrations/_template/`](../.cursor/orchestrations/_template/) into a new `{task-id}` folder. The folder slug and manifest `task_id` **must match exactly** (e.g. folder `wfd-042` → `"task_id": "wfd-042"`).

1. `task-manifest.json` — set `task_id`, `objective`, `locked_artifacts`, and initial `gate_status` / `risk_tier` per Orchestrator.
2. `plan.md` and `acceptance-criteria.md` — Planner fills every section (see template comments); delete guidance before handoff.
3. `test-matrix.md` — **required** for medium/large or any testable code change; **optional** for small doc-only or explicitly non-testable runs. Planner fills **Planned coverage** when present.
4. `build-log.md` — optional at start; Builder completes after implementation.
5. `test-report.md` — Tester completes after specs run (copy template if missing).

See [`_template/README.md`](../.cursor/orchestrations/_template/README.md) for the full file table and **git policy** (local during run; Orchestrator asks to commit after Gate 6).

## Lifecycle Gates

WFD uses explicit **lifecycle gates (0–6)** within the task-folder model. They track pipeline stage completion in `task-manifest.json` → `gate_status`. They are **not** the same as **merge-ready checks (MG-01–MG-05)** below.

| Gate | `gate_status` key       | Name                 | Owner        | Pass condition                                                                                                     |
| ---- | ----------------------- | -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| 0    | `gate_0_intake`         | Intake and risk tier | Orchestrator | Objective is actionable; tier is recorded as `small`, `medium`, or `large`; skipped stages are justified.          |
| 1    | `gate_1_requirements`   | Requirements freeze  | Planner      | `acceptance-criteria.md` covers user-visible behavior, states, edge cases, out-of-scope items, and open questions. |
| 2    | `gate_2_plan`           | Executable plan      | Planner      | `plan.md` names files, interfaces, ADR implications, commands, and scope boundaries clearly enough for Builder.    |
| 3    | `gate_3_build`          | Build complete       | Builder      | Planned changes are implemented or deviations are documented; `build-log.md` records command evidence and gaps.    |
| 4    | `gate_4_tests`          | Tests mapped         | Tester       | `test-report.md` maps every AC to tests or an explicit uncovered reason, with exact commands.                      |
| 5    | `gate_5_validation`     | Validation green     | Validator    | `validation-report.md` has `PASS` or `PASS_WITH_NOTES`, or a `FAIL` with executable remediations.                  |
| 6    | `gate_6_human_approval` | Human approval       | Orchestrator | Evidence summary is presented; approval outcome is recorded before `complete`.                                     |

Validator `FAIL` routes back to Builder within `max_loops`, then continues `Builder -> Tester -> Validator`. Rejected human approval with rework follows the same loop under the same task id and increments rework tracking.

Canonical dual-vocabulary reference (MG-\* mapping, small-run skips, non-orchestrated PRs): [`validation-checklist.md` — Lifecycle gates, merge-ready gates, and `gate_status`](./validation-checklist.md#lifecycle-gates-merge-ready-gates-and-gate_status).

## Merge-ready gates

Lifecycle gates (0–6) track **pipeline stage** completion. **Merge-ready checks (MG-01–MG-05)** are a separate bar: do not treat lifecycle Gate 3 (build complete), a green `build-log.md`, or lifecycle Gate 5 (validation green) alone as merge-ready.

**Lifecycle Gate 5** (validation green) ≠ **MG-05** (tooling). **Lifecycle Gate 6** (human approval) follows a green merge-ready path; it does not replace MG-\* items. Use **MG-\*** IDs in PRs (legacy “merge-ready Gate 1–5” numbering is retired).

Binding contract: [`.cursor/rules/workflow-gates.mdc`](../.cursor/rules/workflow-gates.mdc) (also [GOVERNANCE.md §10.5](../adrs/GOVERNANCE.md#105-merge-ready-gates-orchestrated-efforts), checklist **MG-01**–**MG-05** in [`validation-checklist.md`](./validation-checklist.md)).

| Checklist ID | Topic                           | Typical lifecycle gate(s)    | Requirement                                                                                                               |
| ------------ | ------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **MG-01**    | Alignment gaps                  | 5                            | Deviations from Accepted ADRs in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md) when not fixed in scope |
| **MG-02**    | ADR before durable architecture | 2 (plan), 5 (re-check)       | Create or update ADR before durable architecture change, or documented follow-up                                          |
| **MG-03**    | Validation + domain rows        | 5                            | `validation-report.md` with **PASS** or **PASS_WITH_NOTES** and full checklist audit                                      |
| **MG-04**    | Tests (**TST-05**)              | 4 (primary), 5 (cross-check) | `test-report.md` (+ `test-matrix.md` actual when required)                                                                |
| **MG-05**    | Tooling                         | 3–5                          | `pnpm run check` and `pnpm run lint` for touched paths                                                                    |

**Who may claim merge-ready:** Validator issues verdict only; Orchestrator may set `awaiting_human` after a passing validation path that satisfies **MG-01**–**MG-05**; `complete` requires human approval (lifecycle Gate 6). Builder, Tester, and Planner must not assert merge-ready in chat or artifacts.

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

| Tier     | Typical use                                                                                | Minimum path                                                                          |
| -------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `small`  | One or two files, low architectural risk, no durable data/security/offline boundary change | Orchestrator -> Builder -> Tester or Validator as justified -> Orchestrator -> Gate 6 |
| `medium` | One feature area, several files, normal user-facing behavior                               | Full pipeline once                                                                    |
| `large`  | Multi-phase, cross-cutting, ADR-governed, migration, sync/auth/AI/offline/security work    | Planner then repeated Builder -> Tester -> Validator phases                           |

Accepted ADR-governed areas usually require at least `medium`. Offline-first, local data ownership, auth/cloud sync, AI provider boundaries, service worker behavior, and security-sensitive work should not skip Planner or Validator.

### Small-run paths

When `risk_tier.level` is `small`, the Orchestrator records skipped stages and picks a completion path (see [`.cursor/agents/orchestrator.md`](../.cursor/agents/orchestrator.md) rules 19–20):

| Path  | Flow                                                    | `awaiting_human`                               | Full merge-ready claim?               |
| ----- | ------------------------------------------------------- | ---------------------------------------------- | ------------------------------------- |
| **A** | Builder → Tester (Validator skipped)                    | After `test-report.md`                         | **No** — human + PR substitutes MG-03 |
| **B** | Builder → Validator (Tester skipped, non-testable only) | After Validator **PASS** / **PASS_WITH_NOTES** | **Yes** when MG-01–MG-05 are green    |
| **C** | Builder only (trivial, no test surface)                 | After `build-log.md`                           | **No** — human substitute audit       |

Gate 6 is never skipped for code-changing work. Full policy: [`docs/validation-checklist.md`](./validation-checklist.md#small-run-skips-risk_tierlevel-small).

## Script Truth

Use commands that exist in `package.json`. **Merge-ready tooling** requires `pnpm run check` and `pnpm run lint` (**MG-05**). **Default evidence** for Builder/Tester/Validator also includes `pnpm run test` when the task is testable.

`pnpm run build` is **recommended** for release-impacting or production-bundle changes and when `plan.md` → **Validation commands** requires it — it is **not** a universal merge-ready requirement unless the Planner scoped it for the run.

The Planner names the relevant commands for the phase. Builder, Tester, and Validator record which commands they actually ran and the result. If a command cannot be run, the reason belongs in the relevant stage artifact.

## Task Manifest Expectations

`task-manifest.json` must remain valid JSON and include at least:

- `task_id`
- `objective`
- `status` (`in_progress`, `awaiting_human`, `complete`, `blocked`)
- `current_agent`
- `pipeline` — ordered stage agents for downstream handoffs (`planner` … `validator`); excludes the Orchestrator bookends
- `risk_tier`
- `gate_status` — per-key values: `pending` | `passed` | `failed` | `blocked` | `skipped` | `n/a` (use `skipped` only with rationale in `risk_tier.skipped_stages`)
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
<Planner | Builder | Tester | Validator>

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

## Prompt quickstart

Copy-paste prompts live in each role contract (Orchestrator **Next Agent Directive** template and activation sections). Typical starts:

| Goal               | Invoke       | Contract                                                                               |
| ------------------ | ------------ | -------------------------------------------------------------------------------------- |
| New run            | Orchestrator | `orchestrator.md` — set `task_id`, tier, manifest, first directive                     |
| Plan               | Planner      | `planner.md` — `plan.md` + `acceptance-criteria.md` (+ `test-matrix.md` when required) |
| Implement          | Builder      | `builder.md` — plan scope + `build-log.md`                                             |
| Run tests          | Tester       | `tester.md` — Vitest + `test-report.md`                                                |
| Audit              | Validator    | `validator.md` — `validation-report.md`                                                |
| FAIL loop / Gate 6 | Orchestrator | `orchestrator.md` rules 10–14, 19–20                                                   |

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

After `approved` or `approved_with_conditions`, the Orchestrator **asks** whether to create a git commit (application changes from `build-log.md`; optionally the task folder). It does **not** commit until the human explicitly confirms ([`orchestrator.md`](../.cursor/agents/orchestrator.md) rule 14).

## Practical Operating Notes

- Keep `locked_artifacts` accurate; agents treat listed paths as read-only.
- Keep `completed_stages` summaries short and factual.
- Prefer explicit, testable AC language over broad goals.
- Treat fresh sessions as the default for Planner, Builder, Tester, and Validator.
- Do not skip Tester after a remediation Builder loop.
- If objective, scope, or acceptance criteria are contradictory, block early and clarify before implementation.

## Source of truth and precedence

When documents disagree, apply this order (highest wins):

1. **Accepted ADRs** and [`adrs/GOVERNANCE.md`](../adrs/GOVERNANCE.md) — product and architecture policy.
2. [`.cursor/rules/workflow-gates.mdc`](../.cursor/rules/workflow-gates.mdc) — merge-ready claims (**MG-01**–**MG-05**).
3. **Role contracts** — [`.cursor/agents/*.md`](../.cursor/agents/INDEX.md) — stage mechanics, handoffs, and output contracts.
4. **Templates** — [`.cursor/orchestrations/_template/`](../.cursor/orchestrations/_template/) — artifact shape defaults.
5. **This guide** — human quickstart; defers to the above when specifics differ.

Checklist IDs and gate mapping: [`docs/validation-checklist.md`](./validation-checklist.md). Artifact edit ownership: [`.cursor/rules/orchestration-artifacts.mdc`](../.cursor/rules/orchestration-artifacts.mdc).
