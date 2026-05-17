# WFD test matrix template

Reusable **layer definitions** and **coverage conventions** for orchestrated Tester runs, **Planner** scoping (`test-matrix.md` → Planned coverage), and **human PR review**. Per-run **AC evidence** lives in [`test-report.md`](../.cursor/orchestrations/_template/test-report.md); this document is the canonical layer catalog.

**Related:** [`.cursor/agents/tester.md`](../.cursor/agents/tester.md), [`.cursor/orchestrations/_template/test-matrix.md`](../.cursor/orchestrations/_template/test-matrix.md), [`docs/validation-checklist.md`](./validation-checklist.md) (**Tests and evidence**, `TST-*`), [`vite.config.ts`](../vite.config.ts) (Vitest projects).

## How artifacts fit together

| Artifact                                       | Owner                               | Purpose                                                         |
| ---------------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| **`docs/test-matrix-template.md`** (this file) | Maintainers                         | Stable layer IDs, runners, applicability, commands              |
| **`test-matrix.md`** (per `task-id`)           | Planner (planned) → Tester (actual) | Which **layers** each AC needs; planned vs executed coverage    |
| **`test-report.md`** (per `task-id`)           | Tester                              | AC → test name map, uncovered criteria, stability, commands run |
| **`acceptance-criteria.md`**                   | Planner                             | Verifiable AC IDs (`AC-01`, …) both artifacts reference         |

**When `test-matrix.md` is required:** Medium/large runs or any testable code change. **Optional** for small doc-only or explicitly non-testable runs (coverage may live in `test-report.md` only).

**Rule:** Every AC must appear in `test-report.md` (**Coverage map** or **Uncovered criteria**). When `test-matrix.md` exists, every AC must also appear in at least one layer row (planned or actual) or be marked **N/A** with reason.

## Test layers

Use **layer IDs** in matrices and plans. A single AC may span multiple layers (for example unit logic + offline smoke).

| Layer ID | Name                   | Runner / environment                                                                                  | Typical scope                                                                                                 | When to include                                                                     |
| -------- | ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **UNIT** | Unit (Node)            | Vitest **`server`** project (`environment: 'node'`)                                                   | Pure functions, Zod helpers, recommendation math, store/db helpers without UI                                 | New or changed logic in `src/**/*.ts` (excluding `*.svelte.test.ts`)                |
| **COMP** | Component (browser)    | Vitest **`client`** project (`environment: 'browser'`, Playwright **provider** via `@vitest/browser`) | Svelte components/harnesses: `src/**/*.svelte.{test,spec}.{js,ts}`                                            | New or changed `.svelte` UI, forms, dialogs, client-only branches                   |
| **INTG** | Integration-style      | Vitest **server** or **client** with mocks, or focused multi-module tests                             | `+server` handlers, API adapters, Dexie + service orchestration with test doubles                             | Boundaries between modules, validated request/response paths                        |
| **OFFL** | Offline / capability   | **Manual** named step, or future automation (not required today)                                      | ADR-001 core flows without cloud/AI; ADR-010 shell/cache; distinct degraded copy (ADR-004, connectivity rule) | Touches routes, SW, Dexie-first reads, sync/cloud/AI gates, or capability messaging |
| **E2E**  | Standalone browser E2E | **`@playwright/test` CLI**                                                                            | Full app journeys in a real browser                                                                           | **Not adopted** — see [Playwright vs Vitest browser](#playwright-vs-vitest-browser) |

### Playwright vs Vitest browser

- **In use:** Playwright is installed as the **Vitest browser provider** (`vite.config.ts` → `client` project). Component tests use `vitest-browser-svelte` and `render()` (see `src/routes/page.svelte.test.ts`).
- **Not in use:** There is no `playwright test` script, no `e2e/` Playwright Test suite, and no merge requirement for standalone E2E. Do **not** add **E2E** rows unless the repo adopts `@playwright/test` as a first-class runner (update this doc and `package.json` scripts when that happens).

### File patterns (Vitest)

| Project    | `include`                             | `exclude` (high level)                |
| ---------- | ------------------------------------- | ------------------------------------- |
| **client** | `src/**/*.svelte.{test,spec}.{js,ts}` | `src/lib/server/**`                   |
| **server** | `src/**/*.{test,spec}.{js,ts}`        | `src/**/*.svelte.{test,spec}.{js,ts}` |

Prefer co-located tests next to the module under test. Reuse existing harness patterns (for example `__tests__/PageHarness.svelte`) for route-level UI.

## Commands

Copy-paste commands for reports (**Commands to run** in `test-report.md`). Adjust file paths when scoping.

| Goal                                         | Command                                            |
| -------------------------------------------- | -------------------------------------------------- |
| Full suite (CI-style, once)                  | `pnpm run test`                                    |
| Watch mode                                   | `pnpm run test:unit`                               |
| Server (unit) project only                   | `pnpm run test:unit -- --run --project server`     |
| Client (component/browser) project only      | `pnpm run test:unit -- --run --project client`     |
| Single file                                  | `pnpm run test:unit -- --run path/to/file.test.ts` |
| Typecheck / lint (Validator, not Test-owned) | `pnpm run check`, `pnpm run lint`                  |

Record the exact command (including `--project` and path) in `test-report.md` when reporting what was executed.

## Applicability by change type

| Change involves…                               | Layers to plan (minimum)                                            |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| Pure TS helper / algorithm                     | **UNIT**                                                            |
| Svelte UI / client interaction                 | **COMP** (+ **UNIT** for extracted pure helpers)                    |
| API route / server handler                     | **INTG** or **UNIT** with mocked `Request`                          |
| Dexie reads, recipe book flows, SW, offline UX | **UNIT** / **COMP** as practical + **OFFL** (named smoke)           |
| Cloud / Supabase / sync (enhancement only)     | **INTG** or manual; must not block local **OFFL** recipe-book proof |
| AI generation / suggestions                    | **INTG** for server contract; **OFFL** or manual for degraded UI    |

Pull **OFFL** and **SW-\*** items from [`validation-checklist.md`](./validation-checklist.md) when the task touches offline or service worker behavior.

## Orchestrated workflow

1. **Planner** (required for medium/large or testable code changes): copy [`.cursor/orchestrations/_template/test-matrix.md`](../.cursor/orchestrations/_template/test-matrix.md) into `{task-id}/` and fill **Planned coverage** (layer × AC, approach notes). Mirror layers in `plan.md` → **Validation commands**. Skip only for small doc-only or explicitly non-testable runs.
2. **Tester:** implement Vitest specs; fill **Actual coverage** in `test-matrix.md`; produce `test-report.md` per [`.cursor/agents/tester.md`](../.cursor/agents/tester.md).
3. **Validator:** cross-check `test-report.md` against ACs and `test-matrix.md` for gaps (`TST-*` in validation checklist).

## PR / non-orchestrated use

For PRs without a task folder, copy the **Layer × AC** table from the template into the PR description or link a short matrix comment. Still map each AC to a test, command, or explicit untested reason.

## Matrix versioning

| Version | Date       | Notes                                                                                                         |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-05-16 | Initial layers: UNIT, COMP, INTG, OFFL; E2E reserved; Vitest dual-project; Playwright as Vitest provider only |

When layers or runners change, bump this table and sync [`.cursor/agents/tester.md`](../.cursor/agents/tester.md) if the output contract changes.
