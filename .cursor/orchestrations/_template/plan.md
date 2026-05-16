# Plan — wfd-000

Replace `wfd-000` with `task_id`. Delete HTML comments and placeholder bullets before handoff. Required section order is fixed — see [`.cursor/agents/planner.md`](../../agents/planner.md).

## Objective restatement

<!-- One sentence: what "done" looks like for the user or system. -->

## Risk and phase strategy

<!-- Manifest risk_tier (small | medium | large), phase count, skipped-stage assumptions, change budget. -->

## Scope boundary

### In scope

-

### Out of scope

-

## Phases

<!-- Bounded slices the Builder can implement in order. One phase per remediation loop when possible. -->

| Phase | Goal | Done when |
| ----- | ---- | --------- |
| 1 | | |
| 2 | | |

### Phase 1 — (title)

- **Deliverables:**
- **Files touched:** (see Component/file map)
- **Dependencies:** (prior phases, flags, or human decisions)

### Phase 2 — (title)

- **Deliverables:**
- **Files touched:**
- **Dependencies:**

## Component/file map

<!-- Every path to create or modify, with purpose. Align with phases above. -->

| Path | Action | Purpose |
| ---- | ------ | ------- |
| `src/...` | create / modify | |

## Interface contracts

<!-- Props, function signatures, Zod shapes, store contracts — only what Builder must implement. -->

## ADR references

<!-- Accepted ADRs only. State implication for this task, not "see ADR-00X". -->

- **ADR-001:** …
- **ADR-002:** …

## Validation commands

<!-- Exact pnpm commands from package.json. How Test and Validator confirm success. Tie to AC IDs where helpful. Pull applicable items from docs/validation-checklist.md (OFF-*, NET-*, AUTH-*, etc.). -->

| Step | Owner | Command or check | Pass criteria |
| ---- | ----- | ---------------- | ------------- |
| Lint / types | Builder / Validator | `pnpm run lint`, `pnpm run check` | No new errors in touched paths |
| Unit / component tests | Test | `pnpm run test` or scoped `--project server` / `client` (see `docs/test-matrix-template.md`) | AC-… covered in `test-report.md` |
| Offline / anonymous smoke | Test / Validator | (describe: Dexie-only path, `navigator.onLine`, etc.) | AC-… |
| Manual QA | Human | (only if automation cannot cover) | AC-… |

## Risks

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| | low / med / high | | |

## Rollback

<!-- How to undo this change set safely (git revert, feature flag, data migration reversal, etc.). -->

- **Code:** …
- **Data / Dexie:** …
- **Config / env:** …

## Open questions

<!-- Unresolved items. Builder must not invent answers; list under build-log Unresolved open questions. -->

- [ ] …
