# Test matrix — recent-recipes-behavior

Layer definitions and runners: [`docs/test-matrix-template.md`](../../../docs/test-matrix-template.md).

Per-run AC evidence (test names, uncovered list, commands executed): [`test-report.md`](./test-report.md).

## Planned coverage (Planner)

| Layer ID | AC IDs | Approach / notes |
| -------- | ------ | ---------------- |
| **UNIT** | AC-01–AC-06, AC-11–AC-14, AC-20, AC-22, AC-28, AC-29 | Vitest **server** project. Pure reconciler in `src/lib/stores/recent-recipes-reconcile.test.ts`. Pending flush helper in `src/lib/api/cloud/last-opened-pending.test.ts` with mocked `SyncService` / `db`. |
| **COMP** | AC-17–AC-19, AC-27 | **Manual** Validator check preferred: inspect sidenav DOM for active class and `aria-current="page"` on Recent Recipes link. Optional future `asidenav.svelte.test.ts` — not required by plan. |
| **INTG** | — | **N/A** — batch flush boundaries covered by UNIT mocks; full Dexie+SyncService integration out of scope for this task. |
| **OFFL** | AC-07–AC-10, AC-24–AC-26 | **Manual** named smoke: open recipe with DevTools offline (local `last_opened` + stable list); verify no immediate network on open; pending retained offline; reconnect/visibility triggers flush when signed in with write access. Document steps in `test-report.md`. |

### AC → layers (summary)

| AC ID | Layers | Notes |
| ----- | ------ | ----- |
| AC-01 | UNIT | First snapshot sort desc, cap 15 |
| AC-02 | UNIT | Same list reference/order after last_opened-only change |
| AC-03 | UNIT | Prepend + tail drop at 15 |
| AC-04 | UNIT | Title update in place |
| AC-05 | UNIT | Delete removes; no backfill |
| AC-06 | UNIT | Older never-listed id excluded |
| AC-07 | OFFL | Manual — no delay; optional timing observation |
| AC-08 | OFFL | Manual — re-open same day writes again |
| AC-09 | OFFL, UNIT | Code review + ensure no saveChanges in open path |
| AC-10 | OFFL | Manual — no loop on edit while staying on page |
| AC-11 | UNIT | Re-open overwrites pending entry |
| AC-12 | UNIT | Empty pending → sync mock not called |
| AC-13 | UNIT | Non-empty → one PATCH per id, clear on success |
| AC-14 | UNIT | Offline/no write → pending retained, no call |
| AC-15 | OFFL | Manual reconnect / tab visibility flush |
| AC-16 | OFFL | Manual — navigate away / unmount layout |
| AC-17 | COMP (manual) | `/recipes/{id}` active styling |
| AC-18 | COMP (manual) | `/recipes/shared/{id}` active styling |
| AC-19 | COMP (manual) | `/recipes/new` not active |
| AC-20 | UNIT | Assert Dexie update omits `updated_at` bump |
| AC-21 | OFFL (manual) | Spot-check edit/favorite/checkout still sync immediately |
| AC-22 | UNIT | Content `synced:false` row not flushed as last_opened-only |
| AC-23 | OFFL (manual) | Dexie-only sidenav with network disabled |
| AC-24 | OFFL | Offline open smoke |
| AC-25 | OFFL | No blocking UI on flush skip |
| AC-26 | OFFL | No new blocking errors |
| AC-27 | COMP (manual) | `aria-current="page"` on active link |
| AC-28 | UNIT | Reconciler test file — all six source-design scenarios |
| AC-29 | UNIT | Flush helper test file — four source-design scenarios |
| AC-30 | UNIT + tooling | Full `pnpm run test`, `check`, `lint` |
| AC-31 | Validator review | Absence of out-of-scope changes |

### Planned test files (Tester may refine paths)

| File | Covers |
| ---- | ------ |
| `src/lib/stores/recent-recipes-reconcile.test.ts` | AC-01–AC-06, AC-28 |
| `src/lib/api/cloud/last-opened-pending.test.ts` | AC-11–AC-14, AC-20, AC-22, AC-29 |

### Planned commands (Tester)

```bash
pnpm run test:unit -- --run --project server src/lib/stores/recent-recipes-reconcile.test.ts
pnpm run test:unit -- --run --project server src/lib/api/cloud/last-opened-pending.test.ts
pnpm run test
pnpm run check
pnpm run lint
```

## Actual coverage (Tester)

| Layer ID | AC IDs | Test file(s) / evidence | Status |
| -------- | ------ | ----------------------- | ------ |
| UNIT | AC-01–AC-06, AC-11–AC-14, AC-20, AC-22, AC-28, AC-29 | `src/lib/stores/recent-recipes-reconcile.test.ts` (6); `src/lib/api/cloud/last-opened-pending.test.ts` (8). Command: `pnpm exec vitest run --project server` on those two files → **14 passed** | **Pass** |
| COMP | AC-17–AC-19, AC-27 | No component spec added (per plan). Manual Validator DOM / a11y check | **Manual** |
| INTG | — | N/A as planned | **N/A** |
| OFFL | AC-07–AC-10, AC-15–AC-16, AC-21, AC-23–AC-26 | Named smoke steps in `test-report.md` | **Manual** |

### Gaps vs plan

- AC-09/AC-21 rely on Validator code review / spot-check rather than UNIT (page wiring / unchanged content sync).
- AC-30 full `pnpm run test` not green: pre-existing `import-url-boundary.test.ts` failure; client Playwright Chromium missing in this environment.
- Plan CLI `pnpm run test:unit -- --run --project server <file>` did not reliably filter to a single file here; use `pnpm exec vitest run --project server <files>`.

## Residual risk

- Active link styling and `aria-current` rely on manual COMP inspection (no `asidenav.svelte.test.ts` this run).
- OFFL reconnect/visibility flush timing may vary with layout hook ordering — manual smoke documents environment.
- Local `markLastOpenedLocally` UNIT asserts `updated_at` omitted; sync.service failure path may still write `updated_at` (existing service behavior; outside pending helper).
