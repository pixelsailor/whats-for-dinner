# PR and commit guide

How humans and agents describe changes in **commit messages** and **pull request** bodies. Merge-ready **gates** (ADR, alignment gaps, validation, tooling) stay in [`.cursor/rules/workflow-gates.mdc`](../.cursor/rules/workflow-gates.mdc) and [`docs/validation-checklist.md`](./validation-checklist.md); this guide defines **what to write** so reviewers can see intent, scope, and test evidence without opening every file.

**GitHub:** [`.github/pull_request_template.md`](../.github/pull_request_template.md) pre-fills the same sections for new PRs.

## When this guide applies

| Change                                                           | PR body                                                                                        | Commit message                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| Any PR to `main` (or default branch)                             | Full template (summary buckets + test evidence)                                                | N/A                             |
| Direct commits (no PR)                                           | Optional short body in commit message                                                          | Subject + optional body buckets |
| **Orchestrated** run (`.cursor/orchestrations/{task-id}/`)       | Link `validation-report.md` and `test-report.md`; PR summary may point to orchestration folder | Same as non-orchestrated        |
| **Trivial** (typo, comment-only, isolated non-architectural fix) | One-line summary; test section may be “N/A — trivial”                                          | Imperative subject only         |

Architecture-touching work (see [workflow-gates](../.cursor/rules/workflow-gates.mdc)) must still satisfy merge-ready gates; this guide does not replace them.

## PR and commit summaries — three buckets

Separate **what changed for users** from **what changed for the system** and from **documented drift**. Use the headings below in PRs; in commits, fold into the subject line and optional body.

### Product / UX

User-visible behavior: flows, copy, loading states, offline/degraded messaging, accessibility fixes users would notice. If nothing user-facing changed, write **None** (do not omit the heading).

### Architecture / ADR

Durable design: new or updated ADRs, data ownership, auth/sync/AI/offline boundaries, Dexie schema, service worker policy, secrets/server surfaces. Link `adrs/ADR-NNN-….md` or state **None**. For orchestrated work, cite ADRs from `plan.md` → **ADR references**.

### Alignment gaps

Intentional deviation from an **Accepted** ADR recorded in [`docs/readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md): new or updated **GAP-\*** rows with owner/severity. If implementation matches cited ADRs, write **None**. Do not hide drift in code comments only ([adr-compliance](../.cursor/rules/adr-compliance.mdc)).

**Example (PR excerpt):**

```markdown
### Product / UX

Recipe search shows offline hint when `navigator.onLine` is false; core search still runs on Dexie.

### Architecture / ADR

None.

### Alignment gaps

None.
```

## Test evidence (required every PR)

Every PR must include **either** evidence that behavior was exercised **or** an explicit **untested risk** statement. Orchestrated runs satisfy this by linking `test-report.md` (and `test-matrix.md` when planned).

| Field              | Content                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Commands run**   | e.g. `pnpm run test -- src/lib/...`, `pnpm run check`, `pnpm run lint`, manual step name     |
| **Coverage notes** | What was automated vs manual; map to AC IDs or checklist **TST-\*** when relevant            |
| **Untested risk**  | Required when no automated or manual verification — what could break and why it was deferred |

Align with [`docs/validation-checklist.md`](./validation-checklist.md) → **Tests and evidence** (**TST-01**–**TST-05**) for architecture-touching or orchestrated work.

## Merge-ready block (architecture-touching PRs)

Add when the change touches architecture, auth, sync, AI, offline/service worker, Dexie ownership, or secrets ([workflow-gates](../.cursor/rules/workflow-gates.mdc)):

- [ ] ADR created/updated or follow-up with timeline (**MG-02**)
- [ ] Deviations recorded in `readme-adr-alignment-gaps.md` if not fixed in scope (**MG-01**)
- [ ] `pnpm run check` and `pnpm run lint` pass for touched paths, or documented pre-existing failures (**MG-05**)
- [ ] Orchestrated: `validation-report.md` + `test-report.md` linked; verdict **PASS** / **PASS_WITH_NOTES**

State **Orchestration not required** when the change is trivial or non-architectural per [GOVERNANCE.md §10](../adrs/GOVERNANCE.md#10-orchestrated-development-wfd).

## Commit messages

Use **imperative** subjects (~72 characters): what the commit does, not what you did.

```
Fix offline banner when session refresh fails

Product: show distinct copy for sync failure vs offline hint.
Architecture: none.
Gaps: none.

Test: manual — offline + logged-in sync disabled; pnpm run lint.
```

| Part        | Guidance                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| **Subject** | Required; imperative mood; optional `Fix GAP-NNN:` prefix when the commit primarily addresses a gap row |
| **Body**    | Optional; use the three buckets + test line when the commit is review-worthy without a PR               |
| **Scope**   | Conventional prefixes (`feat:`, `fix:`, `docs:`) are optional; match recent repo style                  |

Agents must **not** create git commits unless the user explicitly asks ([user commit rule](../.cursor/rules/pr-commit-expectations.mdc) defers to that).

## Related

| Topic                    | Location                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Merge-ready gates        | [`.cursor/rules/workflow-gates.mdc`](../.cursor/rules/workflow-gates.mdc), [GOVERNANCE.md §10.5](../adrs/GOVERNANCE.md#105-merge-ready-gates-orchestrated-efforts) |
| Checklist IDs            | [`docs/validation-checklist.md`](./validation-checklist.md)                                                                                                        |
| Orchestrated development | [`docs/ORCHESTRATED_DEVELOPMENT.md`](./ORCHESTRATED_DEVELOPMENT.md)                                                                                                |
| Agent rule               | [`.cursor/rules/pr-commit-expectations.mdc`](../.cursor/rules/pr-commit-expectations.mdc)                                                                          |
