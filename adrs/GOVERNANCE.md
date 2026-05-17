# ADR Governance — What's For Dinner (WFD)

## 1. Purpose

This document is the **authoritative process and policy** for Architectural Decision Records (ADRs) in this repository. Human contributors and AI agents must treat it as the single source of truth for ADR lifecycle, authority, conflicts, index maintenance, and how ADRs relate to Cursor rules and orchestrated development.

ADRs exist so architectural choices stay **remembered, traceable, and enforceable** across sessions and contributors—especially when agents lack durable memory. They record **significant** decisions that shape architecture, constrain future work, or replace a previously valid approach.

ADRs are **not** tutorials, style guides, or generic product copy. They belong in `adrs/` alongside [INDEX.md](INDEX.md) and [TEMPLATE.md](TEMPLATE.md): the index is the fast lookup; each ADR file is the detailed record; this file governs how all of that works.

---

## 2. What qualifies as an ADR

Write an ADR when a decision meets one or more of:

- It affects how a significant part of the codebase is structured or written.
- It chooses between viable alternatives (and rejected options still matter).
- It deprecates or replaces a pattern that was previously valid.
- It establishes a convention agents or developers must follow consistently.
- It would be non-obvious to a new contributor without explanation.
- Reversing it would require coordinated changes across files or layers.

**Not every decision needs an ADR.** Formatting, minor naming, and one-off implementation details belong in code comments or focused docs—not here.

**Heuristic:** _Would an independent implementer reliably reach the same conclusion without this record?_ If no, add an ADR.

---

## 3. ADR statuses

Every ADR has exactly one status, aligned with [INDEX.md](INDEX.md) and [TEMPLATE.md](TEMPLATE.md):

| Status | Meaning |
| ------ | ------- |
| **Proposed** | Under discussion or spike. **Not binding.** Do not implement as if finalized. |
| **Accepted** | Approved and in force. **Binding** for new and changed work unless a documented deviation process applies. |
| **Deprecated** | No longer recommended; history remains. May still describe legacy code not yet migrated. |
| **Superseded** | Replaced by a newer ADR; must name the successor. **Not** valid guidance for new work—follow the successor. |

ADRs are **not deleted** from the index or the folder; status changes preserve history.

**Note:** Some external ADR guides use the label `active`. In this repo, **Accepted** is the binding state—treat “active” in third-party material as equivalent to **Accepted** when mapping concepts.

---

## 4. Lifecycle

### 4.1 Proposing an ADR

Anyone (human or agent) may propose an ADR. A proposal must:

1. Copy [TEMPLATE.md](TEMPLATE.md), fill required sections, and remove instructional placeholder lines before review.
2. Use the next sequential number: name the file `ADR-NNN-short-kebab-title.md` in `adrs/` (three-digit zero-padded `NNN`, never reused).
3. Set **Status** to **Proposed**.
4. Add a row to [INDEX.md](INDEX.md) with status **Proposed** and the correct **Domain** column (see section 6).

Agents must **surface** proposed ADRs for human review and must **not** treat **Proposed** as authoritative for implementation.

### 4.2 Review

Before **Accepted**, review should cover:

- Scope (not too broad or too narrow).
- Honest alternatives and consequences.
- Conflicts with existing **Accepted** ADRs.

### 4.3 Activation (human only)

An ADR becomes **Accepted** only when a human approves it. Then:

- Set **Status** to **Accepted** in the ADR file.
- Update the index row to **Accepted**.
- If needed, add or update Cursor rules that enforce the decision (see section 8.1).

Agents **must not** promote an ADR from **Proposed** to **Accepted**.

### 4.4 Deprecation vs supersession

- **Deprecated** — Retiring a pattern without a single named replacement ADR.
- **Superseded** — Another ADR explicitly replaces this one; cross-link **Supersession notes** / successor fields and update both index rows.

---

## 5. Agent rules

These rules apply to AI agents working in this codebase.

### 5.1 Consult before deciding

Before making or changing **architectural** choices (patterns, libraries, boundaries, data ownership), consult [INDEX.md](INDEX.md) for **Accepted** ADRs in the affected area.

Failure to consult the ADR system is a failure of this governance model.

### 5.2 Status defines authority

- **Accepted** → binding unless the user explicitly overrides after conflict surfacing (section 5.4).
- **Proposed** → not binding; must not drive “final” implementation without human approval.
- **Deprecated** / **Superseded** → not valid for **new** decisions; legacy code may still match them until migrated.

### 5.3 Agents may propose, not approve

When a gap exists, an agent may draft an ADR (**Proposed**), add it to the index, and notify the human. Agents must not self-**Accept** ADRs or assume silence is approval.

### 5.4 Surface conflicts

If instructions conflict with an **Accepted** ADR, stop, cite the ADR, summarize the decision, and ask how to proceed. Do not silently ignore either side.

### 5.5 Do not infer deprecation

Deprecation is only real when recorded as **Deprecated** or **Superseded** in an ADR (and index). Do not infer it from comment age, file age, or low usage.

### 5.6 Scoped compliance and refactoring (opportunistic fixes)

Agents must respect task scope.

**Disallowed:** Broad refactors or large compliance rewrites solely for ADR cleanup when not part of the assigned task.

**Allowed:** Small, low-risk compliance fixes **in files already being edited** for the task, when the change is local, supports the task, and does not require wide cascading edits.

**Escalate:** If compliance needs multi-file or architectural migration, leave behavior unchanged, note the gap (e.g. alignment doc or follow-up), and do not expand scope unilaterally.

### 5.7 Partial implementation

An **Accepted** ADR may describe a target not yet fully realized. The ADR remains binding for **new and modified** code; existing gaps are **technical debt**, not a license to diverge on new work.

### 5.8 When no ADR exists

Use sound judgment, or propose a **Proposed** ADR when the choice is non-trivial, recurring, or architectural.

---

## 6. Domains and the index

[WFD `adrs/INDEX.md`](INDEX.md) groups ADRs by **Domain** (Platform, Architecture, UI, Security, Quality). When adding an ADR:

- Place the new row in the correct domain table.
- Keep **Title**, **Status**, and **Description** in sync with the ADR file.

The ADR body uses **Scope** (and related sections) to define boundaries; the index row is the navigational projection—both must agree.

---

## 7. Authoring rules

### 7.1 Template

New ADRs follow [TEMPLATE.md](TEMPLATE.md). Required sections must be present unless genuinely N/A (do not drop required headings for convenience).

**Orchestrated development:** Keep the heading `## Orchestrated development` and the standard `###` sub-headings as in the template so every ADR that includes orchestration matches the shape of existing **Accepted** records (for example [ADR-001](ADR-001-product-operating-model.md)). Optional sections elsewhere in the template (**Examples**, **Compliance**, **Notes**) may be omitted when not applicable, per template instructions.

### 7.2 Language

- Prefer clear, testable statements for **Decision**.
- **Context** may use past tense; decision and consequences should be precise.
- Name concrete libraries, boundaries, and artifacts.

### 7.3 Alternatives

List real alternatives that were considered; weak straw options undermine the record.

### 7.4 Numbering and filenames

`ADR-NNN-short-kebab-title.md` under `adrs/`; `NNN` sequential, never reused.

### 7.5 Linking

Cross-link **Superseded** / successor ADRs and use **Related** style links when decisions constrain each other without supersession.

---

## 8. Relationship to other artifacts

### 8.1 ADRs and Cursor rules

- ADRs record **why** and **what**; Cursor rules under `.cursor/rules/` help agents apply constraints in daily work.
- An **Accepted** ADR **may** motivate a Cursor rule; a rule that contradicts an **Accepted** ADR is wrong and should be fixed—the ADR wins.
- Rules may cite ADR ids for traceability (e.g. `.cursor/rules/adr-compliance.mdc`).

### 8.2 Deprecated patterns

The index and ADR statuses are the registry. Do not maintain a separate shadow list unless a human-owned doc explicitly says otherwise.

### 8.3 ADRs and skills / shared components

When an **Accepted** ADR mandates a component or workflow, the ADR is authoritative; supporting docs should reference the ADR.

---

## 9. Index maintenance

[INDEX.md](INDEX.md) is the canonical list of ADRs, statuses, and short descriptions.

- Update the index in the **same change** as any new ADR or status transition.
- Never leave an ADR file and its index row inconsistent.
- Prefer concise index rows; depth lives in the ADR file.

If index and ADR disagree, fix immediately; the ADR file wins for detailed meaning, but the index must match status and title.

---

## 10. Orchestrated development (WFD)

**Policy vs template:** Section 10 here states **when** orchestration is expected and **what** must remain true at merge time. **How** to fill each subsection (wording, links, checklist, optional “Orchestration not required”) is defined in [TEMPLATE.md](TEMPLATE.md) under **Orchestrated development**. Keep those in sync: if you change one, update the other so agents and humans do not get conflicting instructions.

Use the ADR template’s **Orchestrated development** block when work is **non-trivial**, **multi-phase**, or touches **durable architecture** (data ownership, auth, sync, AI boundaries, offline-first behavior, security). Trivial doc-only or isolated non-architectural fixes should state **Orchestration not required** per the template.

### 10.1 When orchestration is expected

Treat Plan–Build–Validate–Test style orchestration as **required** when any of the following hold; otherwise the ADR may omit detailed orchestration subsection **content** but should still follow the template’s guidance for the heading and “not required” wording:

- The change spans multiple PRs or phases, or carries significant rollback risk.
- The change touches ADR-governed boundaries (see enforcement pointers in [docs/adr-and-rules-todo.md](../docs/adr-and-rules-todo.md) where still current).
- You would otherwise need a written plan, validation report, and test evidence before calling work merge-ready.

### 10.2 Authoritative workflow artifacts

Repo-specific orchestration lives under `.cursor/agents/` and `.cursor/orchestrations/`. See [.cursor/agents/orchestrator.md](../.cursor/agents/orchestrator.md) for stage order, manifest fields, and artifact names. For a narrative guide, [docs/ORCHESTRATED_DEVELOPMENT.md](../docs/ORCHESTRATED_DEVELOPMENT.md) mirrors the same contracts in prose.

### 10.3 Conventions and tooling

Same references as in [TEMPLATE.md](TEMPLATE.md) **Orchestrated development** (root [agents.md](../agents.md), `.cursor/rules/*`, [eslint.config.js](../eslint.config.js)). If a linked file is missing, file a backlog item—do not treat gaps as implicit policy.

### 10.4 ADR template subsections for orchestrated work

When orchestration applies, the ADR must use the **subsection headings** from [TEMPLATE.md](TEMPLATE.md) (**Relevant ADRs for implementation** through **Merge / workflow gates**) so existing and new ADRs stay structurally consistent. Bodies may use bullets, tables, or “N/A” / “Omit until …” as today’s **Accepted** ADRs do.

### 10.5 Merge-ready gates (orchestrated efforts)

WFD uses **two gate vocabularies**. Do not conflate them.

| Vocabulary | Range | Tracks | Recorded in |
| -------- | ----- | ------ | ----------- |
| **Lifecycle gates** | **0–6** | Pipeline stage completion (Orchestrator → Planner → Builder → Test → Validator → human approval) | `task-manifest.json` → `gate_status` (`gate_0_intake` … `gate_6_human_approval`) |
| **Merge-ready gates** | **1–5** | Whether work may be claimed **merge-ready** (ADR, gaps, validation artifact, tests, tooling) | Checklist **MG-01**–**MG-05**; orchestrated evidence in `validation-report.md` / `test-report.md` |

**Lifecycle Gate 5** (validation green) is **not** merge-ready **Gate 5** (tooling / **MG-05**). **Lifecycle Gate 6** (human approval) follows a green merge-ready path; it does not replace MG-* checklist items.

Canonical mapping (lifecycle ↔ merge-ready ↔ MG-* ↔ `gate_status`, small-run skips, non-orchestrated PRs): [`docs/validation-checklist.md` — Lifecycle gates, merge-ready gates, and `gate_status`](../docs/validation-checklist.md#lifecycle-gates-merge-ready-gates-and-gate_status). Narrative: [`docs/ORCHESTRATED_DEVELOPMENT.md`](../docs/ORCHESTRATED_DEVELOPMENT.md). Agent contract: [`.cursor/rules/workflow-gates.mdc`](../.cursor/rules/workflow-gates.mdc).

#### Merge-ready ↔ lifecycle (summary)

| Merge-ready gate | MG-* | Typical lifecycle gate(s) | Evidence |
| ---------------- | ---- | ------------------------- | -------- |
| 1 — ADR before durable architecture | **MG-02** | 2 (plan), 5 (re-check) | ADR file; `plan.md` → ADR references |
| 2 — Alignment gaps | **MG-01** | 5 | `validation-report.md` → ADR compliance; [`readme-adr-alignment-gaps.md`](../docs/readme-adr-alignment-gaps.md) |
| 3 — Validation evidence | **MG-03** + domain rows | 5 | `validation-report.md` (verdict + checklist audit) |
| 4 — Test evidence | **MG-04**, **TST-05** | 4 (primary), 5 (cross-check) | `test-report.md`; `test-matrix.md` when planned |
| 5 — Tooling | **MG-05** | 3–5 | `build-log.md`, `test-report.md`, or validation command section |

Domain checklist rows (**OFF-***, **AUTH-***, etc.) are audited at **lifecycle Gate 5** when applicable, not as separate lifecycle gates.

#### Merge-ready checklist (orchestrated efforts)

Before claiming merge-ready for orchestrated work, confirm (same checklist as the template’s **Merge / workflow gates** and [`.cursor/rules/workflow-gates.mdc`](../.cursor/rules/workflow-gates.mdc)):

- ADR created or updated **before** durable architecture change (merge-ready Gate 1 / **MG-02**), or an explicit follow-up exists.
- Known deviations are documented as alignment gaps when not fixed in scope (merge-ready Gate 2 / **MG-01**).
- Validation output exists for behavior the ADR cares about (merge-ready Gate 3 / **MG-03**; orchestrated: `validation-report.md` with **Checklist audit** per [`docs/validation-checklist.md`](../docs/validation-checklist.md)).
- Test evidence exists when orchestration applies (merge-ready Gate 4 / **MG-04**; `test-report.md`; `test-matrix.md` when planned layers were scoped — per [`docs/test-matrix-template.md`](../docs/test-matrix-template.md)).
- Tooling passes for touched paths (merge-ready Gate 5 / **MG-05**): `pnpm run check` and `pnpm run lint`, or documented pre-existing failures outside scope.

**Who may claim merge-ready:** Validator issues verdict only; Orchestrator may set `awaiting_human` after merge-ready Gates 1–5 are satisfied; `complete` requires **lifecycle Gate 6** human approval. Builder, Test, and Planner must not assert merge-ready.

---

## 11. Bootstrap note

This governance document is a foundational policy artifact; it does not need its own ADR to exist. **Material** process changes here should be reflected in human review and, when they encode new architecture or constraints, may warrant a new ADR.

---

_Last updated: 2026-05-16_
