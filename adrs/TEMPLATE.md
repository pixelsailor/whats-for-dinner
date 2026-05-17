# ADR-NNN: REPLACE_WITH_SHORT_TITLE

Copy this file to `adrs/ADR-NNN-short-kebab-title.md` under the repository root, incrementing the numeric segment `NNN` (zero-pad to three digits, e.g. `ADR-001`, `ADR-002`) from the highest existing `ADR-*` file in `adrs/`. Replace placeholders (including `REPLACE_WITH_*`) and remove instructional lines before opening a PR. Use an imperative, short title (for example: “Use Dexie for durable recipe storage”).

## Status

One of: **Proposed** · **Accepted** · **Deprecated** · **Superseded**

Meaning, lifecycle, and agent treatment of each status are defined in [GOVERNANCE.md](GOVERNANCE.md) (sections 3–5). In short: **Proposed** is not binding; **Accepted** is binding for new and changed work; **Deprecated** / **Superseded** are not valid guidance for new decisions—follow any successor ADR linked in **Supersession notes**.

## Date

YYYY-MM-DD (date of last material change to this ADR)

## Scope

Define **where this decision applies** and **where it explicitly does not**. Prevents silent scope creep and duplicate ADRs.

- **In scope:** systems, directories, features, data lifecycles, or roles governed by this ADR.
- **Out of scope:** adjacent concerns that remain governed by other ADRs or non-architecture docs.

## Context

Describe the forces driving a decision: product constraints, technical constraints, prior art, and what goes wrong if nothing is decided.

### Decision pressure (required)

What pressure **forces a decision now**? Be specific (for example: scaling limit, DX friction, ambiguous ownership, performance ceiling, incident recurrence, compliance deadline, coupling that blocks delivery). If the answer is “no urgent pressure,” reconsider whether an ADR is needed yet.

### Supporting context

- What problem or ambiguity are we resolving?
- What options were considered at a high level (even if briefly rejected)?
- What must stay true for WFD (offline-first, optional cloud/AI, schema-led contracts, serverless boundaries, etc.)?

## Decision

State the decision in clear, testable language. Prefer “we will …” / “we will not …” over vague principles.

- Single coherent decision (split additional choices into separate ADRs when they can evolve independently).

### Explicit exclusions (required)

List **tempting alternatives we are not choosing** and why (briefly). If a reader might assume “we could also just …,” name it here and mark it out of scope so implementation debates do not relitigate the decision in PR comments.

## Consequences

### Positive

Benefits: simplicity, safety, velocity, operability, alignment with stack.

### Negative

Tradeoffs, costs, or constraints the team accepts.

### Risks and mitigations

Known risks and how we detect or reduce them (monitoring, tests, follow-up ADRs).

## Operational impact

Effects on **performance**, **cost**, **debugging**, **deployment**, or **developer workflow** (including onboarding and local verification). Use “none material” only when genuinely negligible; otherwise call out observability, build time, infra, or runbooks that change.

## Examples (optional)

Concrete examples of how this decision appears in code, data, or flows.

- …

## Compliance (optional)

Relevant standards, frameworks, or regulatory requirements this decision satisfies, aligns with, or intentionally defers.

- **Standards:** e.g., WCAG 2.1 Level AA, OWASP Top 10 — or **Not applicable** / **None** when consciously out of scope.

Remove this section entirely when nothing applies.

## Notes (optional)

Capture material that does not belong in other sections: external references, links to prior discussions, historical context, or one-off clarifications.

- …

Remove this section entirely when empty.

## Enforcement rules

Per-ADR content only (how **this** decision is enforced). Policy for ADRs ↔ Cursor rules, index sync, and agent behavior is in [GOVERNANCE.md](GOVERNANCE.md) (especially sections 5 and 8).

- **Cursor / agent rules:** Which `.cursor/rules/` entries or checks should reflect this ADR (or where new rules belong). Rule catalog: [.cursor/rules/index.md](../.cursor/rules/index.md).
- **Code / architecture:** Directories, boundaries, or patterns that must conform (and what to flag in review if they do not).
- **When to revisit:** Triggers that require updating this ADR instead of silently diverging.

## Supersession notes

- **When to supersede:** Open a **new** ADR when the **core invariant or boundary** of this decision changes. Do **not** spin a new ADR for routine implementation detail evolution—revise this ADR in place or update code and tests while keeping the decision stable.
- **Stable identifiers:** Keep the ADR number fixed; revise content in place until the decision is fundamentally replaced.
- **If superseded:** Link `ADR-NNN-short-kebab-title.md` and summarize what changed for readers migrating mental models.
- **If partially obsolete:** Prefer a new ADR for the new decision and narrow this ADR’s scope rather than overloading one document.

---

## Orchestrated development

Use this section when work is **non-trivial**, **multi-phase**, or touches **durable architecture** (data ownership, auth, sync, AI boundaries, offline-first behavior, security). For a one-line doc fix or an isolated bug with no architectural implication, write **Orchestration not required** on the first line under this heading and **omit the subsections** below.

Repository **policy** for when orchestration applies and how it relates to ADRs lives in [GOVERNANCE.md](GOVERNANCE.md) section 10. This template section is the **authoring guide**: keep subsection headings and intent aligned with existing ADRs so new records stay comparable.

### When orchestration is required

Treat Plan–Build–Test–Validate orchestration as **required** when any of the following hold; otherwise keep this ADR but **omit detailed fills** under the subsections (still keep the heading and **Orchestration not required** if nothing applies):

- The change spans multiple PRs or phases, or has significant rollback risk.
- The change touches ADR-governed boundaries (see enforcement bullets in [docs/adr-and-rules-todo.md](../docs/adr-and-rules-todo.md): “Orchestrated Agent Workflow Backlog” and “Define Plan-Build-Test-Validate roles” where still current).
- You would otherwise need a written plan, validation report, and test evidence before calling the work merge-ready.

### Authoritative workflow artifacts and gates

Orchestration contracts for this repo live under `.cursor/agents/` and `.cursor/orchestrations/`. Read [.cursor/agents/orchestrator.md](../.cursor/agents/orchestrator.md) for stage order, manifest fields, and artifacts such as `plan.md`, `acceptance-criteria.md`, `test-matrix.md`, `build-log.md`, `test-report.md`, `validation-report.md`. Legacy underscore-prefixed names (`_ORCH_PLAN.md`, `_TEST_MATRIX.md`, etc.) from older orchestrator drafts are **not** used in this repo — use the kebab-case files under `.cursor/orchestrations/{task-id}/` and templates in [`.cursor/orchestrations/_template/`](../.cursor/orchestrations/_template/).

For a human-readable walkthrough of the same model, see [docs/ORCHESTRATED_DEVELOPMENT.md](../docs/ORCHESTRATED_DEVELOPMENT.md).

### Agent and coding conventions

Typical session context for implementers and agents:

- [.cursor/rules/index.md](../.cursor/rules/index.md) (agent rule catalog; including `adr-compliance` when present).
- [.cursor/rules/project-best-practices.mdc](../.cursor/rules/project-best-practices.mdc) and [.cursor/rules/svelte-mcp-workflow.mdc](../.cursor/rules/svelte-mcp-workflow.mdc).

### Lint / automated style

Project ESLint flat config: [eslint.config.js](../eslint.config.js) (TypeScript + Svelte presets, Prettier compatibility, project-local tweaks such as import member ordering).

If a referenced rule file or artifact is missing, link the closest existing parent doc above and file a backlog item—do not treat the gap as implicit policy.

### Relevant ADRs for implementation

List ADR numbers and titles the **Planner** must read before drafting an executable plan for work that touches this area (not pointer-only text such as “see ADR-003”—state **implication** for this task).

- ADR-…: …
- ADR-…: …

### Planning artifact

Link or path to the scoped plan (phases, files likely to change, validation commands, risks, rollback). For orchestrated runs, the plan lives at `.cursor/orchestrations/{task-id}/plan.md` using [`.cursor/orchestrations/_template/plan.md`](../.cursor/orchestrations/_template/plan.md). Omit until a plan exists.

- Plan: `.cursor/orchestrations/{task-id}/plan.md` or `docs/…` / issue / PR link

### Builder scope boundary

One bounded phase or PR-sized slice this ADR governs for the **current** change set, and what is explicitly **out of scope**.

### Validator expectations

What the **Validator** must verify against **this ADR**, applicable `.cursor/rules/*` (see [.cursor/rules/index.md](../.cursor/rules/index.md)), [.cursor/rules/project-best-practices.mdc](../.cursor/rules/project-best-practices.mdc), and [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md) for recorded implementation drift.

### Tester role and evidence

What the **Tester** role should add or update (unit, component, browser, offline, integration-style). Prefer Vitest commands from [package.json](../package.json) `scripts` and layer IDs from [`docs/test-matrix-template.md`](../docs/test-matrix-template.md). Record residual risk if something is intentionally untested. When orchestration applies, update `test-matrix.md` (actual coverage) and `test-report.md` per [.cursor/agents/tester.md](../.cursor/agents/tester.md).

### Alignment gaps

If current implementation differs from this ADR and the gap is not fixed in the same change, record it in [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md) (owner, severity, affected areas, remediation, whether it blocks future work). You may extend this heading for clarity (for example **Alignment gaps (current implementation vs this ADR)**) when a table is used. Do not hide divergence only in code comments.

### Merge / workflow gates

Confirm before claiming merge-ready (orchestrated work). Agent contract: [`.cursor/rules/workflow-gates.mdc`](../.cursor/rules/workflow-gates.mdc); checklist IDs **MG-01**–**MG-05** in [`docs/validation-checklist.md`](../docs/validation-checklist.md). **Lifecycle gates 0–6** (pipeline) vs **merge-ready gates 1–5** (MG-\*): [GOVERNANCE.md §10.5](GOVERNANCE.md#105-merge-ready-gates-orchestrated-efforts) and [validation checklist — gate mapping](../docs/validation-checklist.md#lifecycle-gates-merge-ready-gates-and-gate_status).

- [ ] ADR created or updated **before** durable architecture change (or follow-up filed with explicit timeline).
- [ ] Known deviations documented as alignment gaps when not fixed here.
- [ ] Validation output recorded for behavior this ADR cares about ([`docs/validation-checklist.md`](../docs/validation-checklist.md) or equivalent; orchestrated: `validation-report.md` with **Checklist audit**).
- [ ] Test evidence recorded when orchestration applies (`test-report.md`; `test-matrix.md` actual coverage when planned — per [GOVERNANCE.md §10.5](GOVERNANCE.md#105-merge-ready-gates-orchestrated-efforts)).
