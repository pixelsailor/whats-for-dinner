# ADR-NNN: REPLACE_WITH_SHORT_TITLE

Copy this file to `adrs/ADR-NNN-short-kebab-title.md` at the repository root, incrementing the numeric segment `NNN` (zero-pad to three digits, e.g. `ADR-001`, `ADR-002`) from the highest existing `ADR-*` file in `adrs/`. Replace placeholders (including `REPLACE_WITH_*`) and remove instructional lines before opening a PR. Use an imperative, short title (for example: “Use Dexie for durable recipe storage”).

## Status

One of: **Proposed** · **Accepted** · **Deprecated** · **Superseded**

- Use **Proposed** while discussion or parallel implementation spikes are in flight.
- Use **Accepted** only after deciders agree this is the governing record for the topic.
- Use **Deprecated** when the approach is retired but history should remain readable.
- Use **Superseded** when another ADR replaces this one; link the successor in **Supersession notes** below.

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

How this ADR becomes enforceable work, not only documentation.

- **Cursor / agent rules:** Which project rules or checks should reflect this ADR (or where new rules belong). Prefer paths under `.cursor/rules/`; see the rule catalog at [.cursor/rules/index.md](../.cursor/rules/index.md).
- **Code / architecture:** Directories, boundaries, or patterns that must conform (and what to flag in review if they do not).
- **When to revisit:** Triggers that require updating this ADR instead of silently diverging.

## Supersession notes

- **When to supersede:** Open a **new** ADR when the **core invariant or boundary** of this decision changes. Do **not** spin a new ADR for routine implementation detail evolution—revise this ADR in place or update code and tests while keeping the decision stable.
- **Stable identifiers:** Keep the ADR number fixed; revise content in place until the decision is fundamentally replaced.
- **If superseded:** Link `ADR-NNN-short-kebab-title.md` and summarize what changed for readers migrating mental models.
- **If partially obsolete:** Prefer a new ADR for the new decision and narrow this ADR’s scope rather than overloading one document.

---

## Orchestrated development

Use this section when work is **non-trivial**, **multi-phase**, or touches **durable architecture** (data ownership, auth, sync, AI boundaries, offline-first behavior, security). For a one-line doc fix or isolated bug with no architectural implication, note “orchestration not required” and skip the subsections.

### When orchestration is required

Treat Plan–Build–Validate–Test orchestration as **required** when any of the following hold; otherwise keep the ADR but omit detailed orchestration fills:

- The change spans multiple PRs or phases, or has significant rollback risk.
- The change touches ADR-governed boundaries (see enforcement bullets in [docs/adr-and-rules-todo.md](../docs/adr-and-rules-todo.md) — “Orchestrated Agent Workflow Backlog” and “Define Plan-Build-Validate-Test roles”).
- You would otherwise need a written plan, validation report, and test evidence before calling the work merge-ready.

**Authoritative workflow artifacts and gates** for this repo are described in [.cursor/agents/orchestrator.md](../.cursor/agents/orchestrator.md) (for example `_ORCH_PLAN.md`, `_ACCEPTANCE.md`, `_RISKS.md`, `_ARCHITECTURE_CONSTRAINTS.md`, `_VALIDATION_REPORT.md`, `_TEST_MATRIX.md`, `_TELEMETRY.md`). Use repo-root paths when creating those files for a given effort.

**Agent and coding conventions** loaded in typical sessions: [AGENTS.md](../AGENTS.md), [.cursor/rules/project-best-practices.mdc](../.cursor/rules/project-best-practices.mdc). **Rule catalog and activation** (including governance rows such as `adr-compliance` when those rule files exist): [.cursor/rules/index.md](../.cursor/rules/index.md).

**Lint / automated style:** project ESLint flat config [eslint.config.js](../eslint.config.js) (TypeScript + Svelte recommended presets, Prettier compatibility, and project-local rule tweaks such as import member ordering).

If a referenced rule file or artifact is not yet present in the repo, link the closest existing parent doc (as above) and file a backlog item to add the missing rule or template rather than treating the gap as implicit.

### Relevant ADRs for implementation

List ADR numbers and titles the **Planner** must read before drafting an executable plan for work that touches this area.

- ADR-…: …
- ADR-…: …

### Planning artifact

Link or path to the scoped plan (phases, files likely to change, validation steps, risks, rollback). Omit until a plan exists.

- Plan: `docs/…` or issue/PR link

### Builder scope boundary

One bounded phase or PR-sized slice this ADR governs; what is explicitly **out of scope** for the current change set.

### Validator expectations

What the **Validator** must verify against this ADR, [AGENTS.md](../AGENTS.md), [.cursor/rules/project-best-practices.mdc](../.cursor/rules/project-best-practices.mdc), and [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md) for recorded implementation drift.

### Test role and evidence

What the **Test** role should add or update (unit, component, browser, offline, integration-style). Prefer Vitest commands from [package.json](../package.json) `scripts`. Record residual risk if something is intentionally untested. When orchestration applies, update `_TEST_MATRIX.md` per [.cursor/agents/orchestrator.md](../.cursor/agents/orchestrator.md).

### Alignment gaps

If current implementation differs from this ADR and the gap is not fixed in the same change, record it in [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md) (owner, severity, affected areas, remediation, whether it blocks future work). Do not hide divergence only in code comments.

### Merge / workflow gates

Confirm before claiming merge-ready:

- [ ] ADR created or updated **before** durable architecture change (or follow-up filed with explicit timeline).
- [ ] Known deviations documented as alignment gaps when not fixed here.
- [ ] Validation output recorded (checklist or equivalent) for behavior this ADR cares about.
