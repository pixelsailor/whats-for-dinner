# Orchestration Audit Todo

Date: 2026-05-16

Scope reviewed:

- `.cursor/agents/`
- `.cursor/orchestrations/_template/`
- `.cursor/rules/orchestration-artifacts.mdc`
- `.cursor/rules/workflow-gates.mdc`
- `.cursor/rules/validation-checklist.mdc`
- `.cursor/rules/test-matrix.mdc`
- `docs/ORCHESTRATED_DEVELOPMENT.md`
- `docs/validation-checklist.md`
- `docs/test-matrix-template.md`
- `adrs/GOVERNANCE.md`
- `adrs/TEMPLATE.md`
- `.cursor/rules/index.md`

Intent: record follow-up work only. Do not change orchestration contracts, templates, or agent files as part of this audit document.

## Audit Plan

1. Map every orchestration entrypoint and contract file.
2. Compare role responsibilities, artifact ownership, gate names, and required outputs across the agent contracts, templates, rules, governance docs, and narrative guide.
3. Identify inconsistencies, conflicts, unclear instructions, link/path errors, and avoidable repetition.
4. Convert each finding into a concrete follow-up task with the intended file targets and expected outcome.
5. Re-check this plan against the request before closing: full orchestration audit, itemized todo list in a new document, no direct orchestration edits.

## Follow-Up Todo List

- [x] **Fix the pipeline order wording drift.**
  - Problem: `docs/ORCHESTRATED_DEVELOPMENT.md` and the role contracts use `Orchestrator -> Planner -> Builder -> Test -> Validator -> Orchestrator`, but `adrs/GOVERNANCE.md` and `adrs/TEMPLATE.md` still say "Plan-Build-Validate-Test" / "Plan-Build-Validate-Test style orchestration".
  - Task: Standardize the phrase to "Plan-Build-Test-Validate" or use the full role sequence everywhere. Update only wording; do not change behavior.
  - Targets: `adrs/GOVERNANCE.md`, `adrs/TEMPLATE.md`, any other references found by search.

- [x] **Clarify whether the final Orchestrator is part of `pipeline`.**
  - Problem: The manifest template stores `"pipeline": ["orchestrator", "planner", "builder", "test", "validator"]`, while the documented canonical pipeline ends with `Orchestrator`. The Orchestrator contract says it advances `current_agent` only along `pipeline`, but successful validation sets `current_agent` back to `orchestrator`.
  - Task: Decide whether `pipeline` means stage agents only or full lifecycle route. Rename the field or document the exception explicitly.
  - Targets: `.cursor/orchestrations/_template/task-manifest.json`, `.cursor/agents/orchestrator.md`, `.cursor/agents/INDEX.md`, `docs/ORCHESTRATED_DEVELOPMENT.md`.

- [x] **Standardize `test-matrix.md` as optional, recommended, or required.**
  - Problem: Different files describe `test-matrix.md` as recommended for non-trivial work, always part of the template set, or mandatory when a task is non-trivial.
  - Task: Pick one rule. Suggested wording: "Required for medium/large or any testable code change; optional for small doc-only or explicitly non-testable runs."
  - Targets: `.cursor/agents/planner.md`, `.cursor/agents/test.md`, `.cursor/agents/INDEX.md`, `.cursor/orchestrations/_template/README.md`, `docs/ORCHESTRATED_DEVELOPMENT.md`, `docs/test-matrix-template.md`.

- [x] **Resolve `human-approval.md` optional vs required language.**
  - Problem: Some docs call `human-approval.md` optional, while the Orchestrator output contract says it is created when recording Gate 6.
  - Task: Decide if Gate 6 always writes `human-approval.md`. If yes, remove "optional" language except where describing legacy runs. If no, define when manifest-only approval is acceptable.
  - Targets: `.cursor/agents/orchestrator.md`, `.cursor/agents/INDEX.md`, `.cursor/rules/workflow-gates.mdc`, `docs/ORCHESTRATED_DEVELOPMENT.md`, `.cursor/orchestrations/_template/README.md`.

- [x] **Align `build-log.md` template with the Builder output contract.**
  - Problem: Builder requires **Command evidence** and **Scope pressure**, but the template omits both sections.
  - Task: Add those sections to the template or remove them from the contract. Prefer updating the template because downstream agents rely on command evidence.
  - Targets: `.cursor/orchestrations/_template/build-log.md`, `.cursor/agents/builder.md`, `docs/ORCHESTRATED_DEVELOPMENT.md` if artifact descriptions change.

- [x] **Align `test-report.md` template with the Test output contract.**
  - Problem: Test requires **Command evidence**, **Commands to run**, and **Blockers**. The template only has **Commands to run** and its comment mixes executed commands with future commands.
  - Task: Split executed command evidence from recommended commands and add a **Blockers** section.
  - Targets: `.cursor/orchestrations/_template/test-report.md`, `.cursor/agents/test.md`, `docs/test-matrix-template.md`.

- [x] **Fix duplicated numbering in the Validator inputs.** (already numbered 6–9 in inputs; no edit needed)
  - Problem: `.cursor/agents/validator.md` has two `6.` entries in the input list.
  - Task: Renumber the list.
  - Target: `.cursor/agents/validator.md`.

- [x] **Define the small-run completion path.**
  - Problem: Small runs may skip Planner, Test, or Validator, but other docs say Validator requires `test-report.md` and Orchestrator reaches `awaiting_human` after a successful validation path. This makes small runs that skip Test or Validator hard to complete without policy interpretation.
  - Task: Document the exact allowed small-run paths and their required substitute evidence. Include whether small runs can ever claim full merge-ready without Validator.
  - Targets: `.cursor/agents/orchestrator.md`, `.cursor/agents/INDEX.md`, `.cursor/rules/workflow-gates.mdc`, `docs/validation-checklist.md`, `docs/ORCHESTRATED_DEVELOPMENT.md`.

- [x] **Rename or reframe the merge-ready gate vocabulary.**
  - Problem: "Merge-ready Gate 1" maps to `MG-02`, while "Merge-ready Gate 2" maps to `MG-01`. This is technically documented but cognitively expensive and easy to misquote.
  - Task: Consider renaming merge-ready gates to "merge-ready checks" and ordering them by checklist ID, or rename checklist IDs to match gate numbers.
  - Targets: `.cursor/rules/workflow-gates.mdc`, `docs/validation-checklist.md`, `docs/ORCHESTRATED_DEVELOPMENT.md`, `adrs/GOVERNANCE.md`, `adrs/TEMPLATE.md`.

- [x] **Create a single precedence rule for conflicts.**
  - Problem: `docs/ORCHESTRATED_DEVELOPMENT.md` says role contracts win when conflicts exist, while ADR governance is authoritative for policy and workflow gates are the agent-facing merge-ready contract.
  - Task: Add one compact precedence statement. Suggested order: Accepted ADRs and `adrs/GOVERNANCE.md` for policy, `.cursor/rules/workflow-gates.mdc` for merge-ready claims, `.cursor/agents/*.md` for role mechanics, templates for artifact shape.
  - Targets: `docs/ORCHESTRATED_DEVELOPMENT.md`, `.cursor/agents/INDEX.md`, `adrs/GOVERNANCE.md`.

- [x] **Fix relative links in `orchestration-artifacts.mdc`.**
  - Problem: Links such as `.cursor/agents/orchestrator.md` are relative to `.cursor/rules/` and likely resolve to `.cursor/rules/.cursor/agents/...` instead of `.cursor/agents/...`.
  - Task: Replace those links with `../agents/...` and `../orchestrations/_template/...` where appropriate.
  - Target: `.cursor/rules/orchestration-artifacts.mdc`.

- [x] **Reconcile `.cursor/rules/index.md` with orchestration references.**
  - Problem: The file begins with "should not be used as a reference", but other documents point to it as a rule catalog. It also lists role agents as "manual" rules even though the contracts live in `.cursor/agents/`.
  - Task: Either make the index authoritative enough to cite or stop citing it from orchestration/ADR docs. If retained, separate "rules" from "agent contracts".
  - Targets: `.cursor/rules/index.md`, `.cursor/agents/INDEX.md`, `adrs/TEMPLATE.md`, `docs/ORCHESTRATED_DEVELOPMENT.md`.

- [x] **Validate agent model frontmatter against current Cursor model names.** _(team confirmed: keep pins as-is)_
  - Problem: Agent files use model names such as `gpt-5.4-nano-none`, `gpt-5.4-nano-medium`, and `composer-2`; these may be stale or unsupported depending on current Cursor agent model registry.
  - Task: Confirm valid model identifiers. Either update them, remove model pins, or document why these pins are intentionally retained.
  - Targets: `.cursor/agents/orchestrator.md`, `.cursor/agents/planner.md`, `.cursor/agents/builder.md`, `.cursor/agents/test.md`, `.cursor/agents/validator.md`.

- [x] **Reduce repeated gate explanations.** _(canonical mapping in validation-checklist + workflow-gates; MG-\* naming retired legacy gate numbers)_
  - Problem: The lifecycle vs merge-ready distinction is explained in many places: governance, workflow rule, validation checklist, orchestration guide, artifact rule, ADR template, and agents index. The repetition helps discovery but costs tokens and increases drift risk.
  - Task: Keep one canonical mapping, likely in `docs/validation-checklist.md` or `.cursor/rules/workflow-gates.mdc`, and replace most other copies with a one-paragraph summary plus a link.
  - Targets: `docs/ORCHESTRATED_DEVELOPMENT.md`, `adrs/GOVERNANCE.md`, `adrs/TEMPLATE.md`, `.cursor/agents/INDEX.md`, `.cursor/rules/orchestration-artifacts.mdc`, `.cursor/rules/workflow-gates.mdc`.

- [x] **Shorten the prompt library or move it into role-owned snippets.**
  - Problem: `docs/ORCHESTRATED_DEVELOPMENT.md` duplicates role handoff instructions and the Next Agent Directive template already present in agent contracts.
  - Task: Keep a compact quickstart in the guide and move detailed prompts to role contracts or a smaller `docs/orchestration-prompts.md` if humans still need copy-paste prompts.
  - Target: `docs/ORCHESTRATED_DEVELOPMENT.md`; optional new doc only if it reduces total duplicated text.

- [x] **Choose a less ambiguous name for the `Test` role.**
  - Problem: "Test" is both a role name and a noun/verb throughout the docs. It can be hard to parse sentences such as "Test completes Actual coverage" or "Test owns Gate 4".
  - Task: Consider renaming the role to `Tester`, `Test Author`, or `Test Agent`. If renamed, update artifact ownership tables and handoff templates together.
  - **Done:** Renamed to **Tester**; contract file `.cursor/agents/tester.md`; manifest `current_agent` / `pipeline` / `session_counts` use `tester`.

- [x] **Normalize task id terminology.**
  - Problem: Docs alternate between `{task-id}` path syntax and `task_id` manifest syntax without stating whether they must be identical.
  - Task: Add one sentence: "The folder slug and manifest `task_id` must match exactly." If not desired, define the allowed difference.
  - Targets: `docs/ORCHESTRATED_DEVELOPMENT.md`, `.cursor/orchestrations/_template/README.md`, `.cursor/agents/orchestrator.md`.

- [x] **Define allowed `gate_status` values.**
  - Problem: Docs mention `pending`, `passed`, `failed`, `blocked`, `skipped`, and `n/a`, but the manifest has no schema or compact value list.
  - Task: Add a short enum-style list to the manifest expectations and template comments, or add a schema document if validation is planned.
  - Targets: `.cursor/orchestrations/_template/task-manifest.json`, `docs/ORCHESTRATED_DEVELOPMENT.md`, `docs/validation-checklist.md`.

- [x] **Clarify `PASS_WITH_NOTES` semantics.**
  - Problem: Validator rules allow `PASS_WITH_NOTES` for some partial AC cases with justification, while other gate text says unmet ACs block pass unless accepted. The human acceptance point is not fully defined.
  - Task: Define when `PASS_WITH_NOTES` is allowed, who accepts residual risk, and whether it can satisfy merge-ready before Gate 6.
  - Targets: `.cursor/agents/validator.md`, `.cursor/rules/workflow-gates.mdc`, `.cursor/rules/validation-checklist.mdc`, `docs/validation-checklist.md`.

- [x] **Clarify whether `pnpm run build` is default evidence or task-specific evidence.**
  - Problem: `docs/ORCHESTRATED_DEVELOPMENT.md` lists `pnpm run build` with default evidence commands, while merge-ready tooling only requires `pnpm run check` and `pnpm run lint`. This can make build feel required even when Planner scoped narrower commands.
  - Task: State that `build` is recommended for release-impacting work or when Planner requires it, not a universal merge-ready gate unless the team wants that policy.
  - Targets: `docs/ORCHESTRATED_DEVELOPMENT.md`, `.cursor/rules/workflow-gates.mdc`, `docs/validation-checklist.md`.

- [x] **Simplify repeated role responsibility tables.**
  - Problem: Role responsibility and artifact ownership tables appear in `.cursor/agents/INDEX.md`, `docs/ORCHESTRATED_DEVELOPMENT.md`, `.cursor/rules/orchestration-artifacts.mdc`, and template README.
  - Task: Keep detailed ownership in one canonical place and use shorter references elsewhere. Preserve enough local context for humans reading a single file.
  - Targets: `.cursor/agents/INDEX.md`, `docs/ORCHESTRATED_DEVELOPMENT.md`, `.cursor/rules/orchestration-artifacts.mdc`, `.cursor/orchestrations/_template/README.md`.

- [x] **Add a short "minimum read set" for each role.**
  - Problem: The contracts list many inputs, but a fresh agent may over-read high-token documents even for small runs.
  - Task: For each role, split inputs into "always read" and "read when applicable". Keep ADRs/checklists conditional by domain unless the role must always consult them.
  - Targets: `.cursor/agents/planner.md`, `.cursor/agents/builder.md`, `.cursor/agents/test.md`, `.cursor/agents/validator.md`, `docs/ORCHESTRATED_DEVELOPMENT.md`.

- [x] **Decide whether orchestration task folders are normally committed.** _(local during run; Orchestrator asks to commit after Gate 6; commit only on explicit human confirm)_
  - Problem: Template README says not to commit filled task folders unless explicitly tracked, while merge-ready and PR guidance expects validation artifacts to exist. It is unclear whether artifacts are review evidence in git, local-only evidence, or copied into PR text.
  - Task: Define the default: commit artifacts, attach summaries to PRs, or keep local unless requested. Align PR and merge-ready wording with that choice.
  - Targets: `.cursor/orchestrations/_template/README.md`, `.cursor/rules/workflow-gates.mdc`, `docs/pr-and-commit-guide.md`, `.github/pull_request_template.md`, `docs/ORCHESTRATED_DEVELOPMENT.md`.

## Suggested Consolidation Shape

- Keep `.cursor/agents/*.md` as the role mechanics source of truth.
- Keep `.cursor/rules/workflow-gates.mdc` as the merge-ready claim policy.
- Keep `docs/validation-checklist.md` as the canonical checklist and gate mapping.
- Make `docs/ORCHESTRATED_DEVELOPMENT.md` a short human quickstart with links instead of a second full contract.
- Keep `.cursor/orchestrations/_template/` as copy-ready artifact shapes and ensure every template matches its role output contract.

## Request Fit Check

- Full orchestration surface reviewed: yes, including role contracts, templates, workflow rules, validation/test docs, ADR governance, and ADR template orchestration sections.
- Inconsistencies, discrepancies, conflicts, verbosity, and confusion points recorded: yes, each as a follow-up todo with targets.
- Rename opportunities included: yes, specifically merge-ready gates/checks and the `Test` role.
- New document created: yes, this file.
- Existing agents and orchestration files left unchanged: yes.
- Plan compared against request: yes; the audit plan above matches the requested review-only outcome and defers implementation changes to future work.
