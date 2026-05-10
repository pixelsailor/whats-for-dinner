# Orchestrated Development for `cxiius`

Reference guide for running the `cxiius` multi-agent workflow in Cursor using the local orchestration contracts under `.cursor/agents/` and `.cursor/orchestrations/`.

This guide is intentionally `cxiius`-specific. Artifact paths, stage ownership, and prompt flow follow this repository's current contracts.

## Why this exists

- Keep orchestration deterministic across fresh agent sessions.
- Make stage handoffs explicit through artifacts, not chat memory.
- Preserve reusable prompt patterns for common orchestration starts and resumes.
- Reduce drift between how the team runs orchestration and how `.cursor/agents/*.md` defines it.

## Core model in this repo

All orchestration state for a run lives under:

- `.cursor/orchestrations/{task-id}/`

Primary state file:

- `task-manifest.json` (owned by Orchestrator)

Default pipeline:

- `Orchestrator -> Planner -> Builder -> Test -> Validator -> Orchestrator`

Run artifacts are written inside the task folder under `.cursor/orchestrations/{task-id}/`.

## Agent responsibilities and owned artifacts

- `Orchestrator`
  - Owns lifecycle, routing, loop policy, and human approval gating.
  - May write `task-manifest.json` and optional `human-approval.md`.
- `Planner`
  - Writes `plan.md` and `acceptance-criteria.md`.
  - Must keep open questions explicit; no guessing.
- `Builder`
  - Implements code from `plan.md`.
  - Writes `build-log.md`.
- `Test`
  - Writes/updates automated tests and `test-report.md`.
- `Validator`
  - Audits implementation and writes `validation-report.md` with `PASS`, `PASS_WITH_NOTES`, or `FAIL`.

## Artifact contract (per task)

Inside `.cursor/orchestrations/{task-id}/`:

- `task-manifest.json` - authoritative orchestration state
- `plan.md` - implementation plan (Planner-owned)
- `acceptance-criteria.md` - verifiable AC list (`AC-01`, `AC-02`, ...)
- `build-log.md` - implemented changes, deviations, gaps
- `test-report.md` - AC coverage map and test execution commands
- `validation-report.md` - verdict + required remediations on failure
- `human-approval.md` - optional human sign-off record

## Lifecycle and gate logic

1. Orchestrator bootstraps or adopts a task folder.
2. Planner produces executable plan + acceptance criteria.
3. Builder implements and records build log.
4. Test maps ACs to automated tests and records coverage/gaps.
5. Validator issues verdict:
   - `FAIL` -> Orchestrator increments `loop_count` and routes back to Builder (within `max_loops`).
   - `PASS` or `PASS_WITH_NOTES` -> Orchestrator moves run to `awaiting_human`.
6. Human approval is recorded in `task-manifest.json` (and optionally `human-approval.md`).
7. Orchestrator marks run `complete`.

## Task manifest expectations

`task-manifest.json` should always remain valid JSON and include at least:

- `task_id`
- `objective`
- `status` (`in_progress`, `awaiting_human`, `complete`, `blocked`)
- `current_agent`
- `pipeline`
- `completed_stages[]`
- `loop_count`
- `max_loops`
- `locked_artifacts[]`
- `flags[]`
- `human_approval` object

## Prompt library (copy/paste)

These are starting templates designed for this repo's contracts. Replace placeholders and paths.

### 1) Start a new run (Planner first)

```text
You are the Orchestrator. Use the orchestrator rule.

Start a new orchestration run with task_id "<task-id>".
Objective: <clear objective with user-visible outcome>.

Use the repo's task-folder contract:
.cursor/orchestrations/{task-id}/task-manifest.json
and pipeline:
Orchestrator -> Planner -> Builder -> Test -> Validator -> Orchestrator

Initialize the manifest, set current_agent to planner, and issue the Planner directive.
```

### 2) Planner execution prompt (manual handoff)

```text
You are the Planner. Use the planner rule.

Task folder:
.cursor/orchestrations/<task-id>/

Read task-manifest.json and produce:
- plan.md
- acceptance-criteria.md

Requirements:
- Include concrete file-level scope.
- Include interface contracts.
- Reference active ADR implications where applicable.
- Keep unresolved questions explicit.
```

### 3) Builder execution prompt (phase implementation)

```text
You are the Builder. Use the builder rule.

Task folder:
.cursor/orchestrations/<task-id>/

Read:
- task-manifest.json
- plan.md
- acceptance-criteria.md

Implement only plan scope and write build-log.md with:
- files created
- files modified
- deviations from plan
- unresolved open questions
- known gaps
```

### 4) Test execution prompt (coverage mapping)

```text
You are the Test agent. Use the test rule.

Task folder:
.cursor/orchestrations/<task-id>/

Read:
- acceptance-criteria.md
- plan.md
- build-log.md

Write automated tests and produce test-report.md with:
- coverage map for every AC ID
- uncovered criteria and reason
- test stability notes
- exact commands to run
```

### 5) Validator execution prompt (verdict + remediations)

```text
You are the Validator. Use the validator rule.

Task folder:
.cursor/orchestrations/<task-id>/

Read:
- plan.md
- acceptance-criteria.md
- build-log.md
- test-report.md

Produce validation-report.md with:
- Verdict: PASS | PASS_WITH_NOTES | FAIL
- AC audit with evidence
- ADR compliance with evidence
- regressions
- required remediations (mandatory if FAIL)
- recommended remediations
```

### 6) Orchestrator resume after Validator FAIL

```text
You are the Orchestrator. Use the orchestrator rule.

Resume task_id "<task-id>" after a Validator FAIL.
Read .cursor/orchestrations/<task-id>/validation-report.md.

If loop_count < max_loops:
- increment loop_count
- route to Builder with required remediations as authoritative fix list
- continue Builder -> Test -> Validator

If loop_count >= max_loops:
- set status to blocked
- add max_loops_exceeded flag
- stop and request human decision
```

### 7) Orchestrator closeout after PASS

```text
You are the Orchestrator. Use the orchestrator rule.

Resume task_id "<task-id>" after PASS or PASS_WITH_NOTES.
Move run to awaiting_human and collect human approval.

Record approval in task-manifest.json human_approval fields
(approved_at, approver, notes), optionally mirror in human-approval.md,
then mark status complete.
```

### 8) Adopt an existing task folder

```text
You are the Orchestrator. Use the orchestrator rule.

Adopt existing orchestration task_id "<task-id>".
Read .cursor/orchestrations/<task-id>/task-manifest.json and all existing stage artifacts.

Determine next action strictly from current_agent, status, and output-contract completeness.
Do not skip required stages.
```

## Example objectives from `cxiius` runs

Use these as style references for writing better `objective` values in the manifest:

- `chat-sidebar-escape`:
  - "Make the sidebar chat close on Escape while focused, matching dismiss behavior and restoring page control."
- `theme-localstorage-persist`:
  - "Persist selected theme in local storage and restore on reload with accessible fallback behavior."
- `portfolio-slug-keyboard-nav`:
  - "Support keyboard navigation through portfolio items using slug-aware route transitions."

Pattern to follow:

- Name the user-visible outcome.
- Name the concrete behavior boundary.
- Name constraints or compatibility expectations.

## Practical operating notes

- Keep `locked_artifacts` accurate; agents should treat listed paths as read-only.
- Keep `completed_stages` summaries short and factual for auditability.
- Use small scopes and loop quickly; Validator failures are part of normal operation.
- Prefer explicit, testable AC language over broad goals.
- If objective is vague or contradictory, block early and clarify before planning.

## Source of truth

When this guide conflicts with role contracts, trust the role contracts:

- `.cursor/agents/orchestrator.md`
- `.cursor/agents/planner.md`
- `.cursor/agents/builder.md`
- `.cursor/agents/test.md`
- `.cursor/agents/validator.md`
- `.cursor/rules/orchestration-artifacts.mdc`
