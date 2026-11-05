# Human Approval — calendar-page

Gate 6. **Approved by the human** (decision recorded below).

## Evidence Summary

| Field               | Value |
| ------------------- | ----- |
| Task ID             | `calendar-page` |
| Objective           | `/calendar` page: one month at a time as a classic day grid; each day lists the recipes made (from `checkout_history`) as single-line truncated pills linking to `/recipes/{id}`; responsive; month/year navigation; no popups; no cloud table. |
| Risk tier           | medium |
| Files changed       | **New:** `src/lib/api/calendar/` (schemas, types, model, labels, barrel, README, 4 test files); `src/lib/stores/calendar.ts` (+ 2 test files); `src/lib/ui/calendar/` (`MonthGrid`, `MonthNav` + 2 test files); `src/routes/calendar/` (`+page.svelte`, harness, 2 test files); `src/lib/ui/asidenav/` (test + harness); `docs/calendar/README.md`. **Modified:** `src/lib/ui/asidenav/asidenav.svelte` (+15 lines, Calendar link); `README.md` (+1 line); `adrs/ADR-012-feature-roadmap-boundaries.md` (one table cell, link only). **Not touched:** `db.ts`, sync/cloud, service worker, layout, hooks, `src/routes/api/**`. ~864 lines of production code. |
| Acceptance coverage | 37 ACs: 30 ✅, 2 ⚠️ (AC-16 waived by you for < 640 px; AC-32 partial), 3 N/A (E1/E2 not built); AC-20 and AC-37 ✅ with caveats. See `validation-report.md`. |
| Validation verdict  | **PASS_WITH_NOTES** |
| Commands run        | `pnpm run test` → 28 files, **253 passed, 1 skipped** (your skipped boundary test); 75 server tests under 3 time zones; 45 browser tests; eslint / prettier / svelte-autofixer clean on touched paths; `pnpm run build` passes; production-build browser runs (offline, logged-out, axe, service-worker matrix). |
| Commands not run    | Lighthouse; screen-reader pass; Firefox/WebKit; real devices. |
| Rework count        | 1 informal remediation loop (DEF-1 pill height 20 → 24 px, found by Tester's axe run, fixed and re-verified). Manifest `rework_count` unchanged (no formal Gate 6 rejection). |
| Known follow-ups    | See "Residual risk to accept" and `validation-report.md` → Recommended remediations (8 items, none blocking). |

## Residual risk to accept

1. **AC-16 waiver:** phone widths (< 640 px) hide the first calendar column behind the app-wide collapsed side-rail (pre-existing layout behaviour; overhaul planned). You approved this exception.
2. **AC-32 partial:** axe-clean in the calendar content, but no screen-reader pass; axe is not in CI; pills are 24 px and nav controls use the app's standard 36 px (`md+`), not 44 px.
3. **Offline caveat (found at validation):** a hard reload or direct URL to a calendar month never loaded as a document fails offline (service worker caches documents per full URL; same for existing `/recipes?sort=…`). In-app navigation, bare `/calendar`, and previously visited months work.
4. **First-render budget:** E1 trigger "not fired", but one production sample (282 ms at 1×) is over 250 ms if app boot counts against the calendar; the plan didn't specify.
5. **Manual evidence:** AC-20/21 (offline, logged-out) and AC-37 (performance) rest on scripted manual runs, not committed automated tests.
6. **Existing failures untouched:** project-wide lint/check/prettier failures and sidenav a11y findings pre-date this work.

## Approval Decision

| Field                  | Value |
| ---------------------- | ----- |
| Approver               | human |
| Outcome                | approved |
| Approved at (ISO-8601) | 2026-11-05T19:31:33Z |
| Conditions             | None. Residual risks listed above are accepted as documented. |
| Notes                  | Gaps noted for follow-up: GAP-027 (offline reload of uncached month URLs) and GAP-028 (sub-640 px side-rail overlay) in `docs/readme-adr-alignment-gaps.md`, plus the 9-item Follow-ups table in `docs/calendar/README.md`. Approved with all changes (including the human-skipped `import-url-boundary.test.ts` edit) committed to the current branch; **not pushed**. |

## Rework Directive

Complete only when the outcome is `rejected_rework`.

| Field                          | Value |
| ------------------------------ | ----- |
| Rejected by                    |       |
| Rejection timestamp (ISO-8601) |       |
| Rejection reason               |       |
| Required rework                |       |
| Return stage                   | Builder / Planner |

## Confirmation

I have reviewed the implementation, tests, validation report, and command evidence for this task and approve the recorded Gate 6 outcome.

**Signature / record:** (name or system ID)

---

The human explicitly requested a local commit of all changes to the current branch (`feature-calendar`) and explicitly said not to push. No new branch was created and nothing was pushed.
