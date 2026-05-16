# WFD validation checklist

Reusable audit checklist for **orchestrated Validator runs**, **human PR review**, and **Planner scoping** (`plan.md` → Validation steps). It complements per-task `acceptance-criteria.md` with cross-cutting product and architecture gates from Accepted ADRs and Cursor rules.

**Related artifacts:** [`validation-report.md`](../.cursor/orchestrations/_template/validation-report.md) (orchestrated output), [`test-report.md`](../.cursor/orchestrations/_template/test-report.md), [`test-matrix.md`](../.cursor/orchestrations/_template/test-matrix.md), [`docs/test-matrix-template.md`](./test-matrix-template.md), [`.cursor/agents/validator.md`](../.cursor/agents/validator.md), [`docs/readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md), [`adrs/INDEX.md`](../adrs/INDEX.md).

## How to use

| Context | Action |
| ------- | ------ |
| **Orchestrated Validator** | Read this file; mark each **applicable** item in `validation-report.md` → **Checklist audit** (✅ / ⚠️ / ❌ / N/A + evidence). Any ❌ on a required item blocks **PASS** unless escalated as **PASS_WITH_NOTES** with explicit human/Orchestrator acceptance. |
| **Planner** | Pull relevant rows into `plan.md` → **Validation steps** and map to AC IDs; do not duplicate the entire checklist unless the task is broad. |
| **Human PR review** | Use [PR template](../.github/pull_request_template.md) and [`docs/pr-and-commit-guide.md`](./pr-and-commit-guide.md) (product / architecture / gaps + test evidence); copy applicable checklist sections into review comments; link alignment gaps when deviating. |

**Evidence** means file:line, test name, command output, or a named manual step (e.g. “offline smoke: recipes list loads with DevTools offline”).

## Applicability

Run a section when the change **touches** that domain. When unsure, include the section and mark non-applicable items **N/A** with one-line justification.

| Section | Run when change involves… |
| ------- | ------------------------- |
| [Merge-ready gates](#merge-ready-gates) | Any orchestrated or architecture-touching PR |
| [Offline behavior](#offline-behavior) | Routes, loaders, Dexie reads, service worker, caching, core recipe flows |
| [Connectivity and capability messaging](#connectivity-and-capability-messaging) | Status banners, disabled actions, sync/network/session copy, reconnect |
| [Anonymous-first](#anonymous-first) | Onboarding, guards, first-run, features that might require sign-in |
| [Auth boundaries](#auth-boundaries) | `hooks.server.ts`, session, login/logout, route protection |
| [Cloud enhancement](#cloud-enhancement) | Supabase, sync, backup, share, `CloudService` / `SyncService` |
| [AI disabled and degraded](#ai-disabled-and-degraded) | Suggestions, generation, AI settings, provider errors |
| [Self-hosted providers](#self-hosted-providers) | Personal AI keys, user-hosted DB, provider matrix, `featureFlags` |
| [Schema and validation](#schema-and-validation) | Zod schemas, API payloads, Dexie rows, AI structured output |
| [Accessibility](#accessibility) | `.svelte` UI, forms, dialogs, navigation, focus, motion |
| [Tests and evidence](#tests-and-evidence) | All production changes (minimum bar below) |
| [ADR-specific annexes](#adr-specific-annexes) | Recommendations inputs (ADR-009) or service worker policy (ADR-010) |

---

## Merge-ready gates

Binding for orchestrated work per [GOVERNANCE.md §10.5](../adrs/GOVERNANCE.md#105-merge-ready-gates-orchestrated-efforts), [`.cursor/rules/workflow-gates.mdc`](../.cursor/rules/workflow-gates.mdc), and [ADR template — Merge / workflow gates](../adrs/TEMPLATE.md).

- [ ] **MG-01:** Accepted ADRs cited in `plan.md` were read; implementation matches or deviation is documented in [`readme-adr-alignment-gaps.md`](./readme-adr-alignment-gaps.md).
- [ ] **MG-02:** Durable architecture change has an ADR create/update **before** merge, or an explicit follow-up with timeline (not comment-only).
- [ ] **MG-03:** `validation-report.md` exists with verdict, AC audit, ADR compliance, and checklist audit (orchestrated runs).
- [ ] **MG-04:** `test-report.md` exists with AC coverage map and commands run (orchestrated runs).
- [ ] **MG-05:** `pnpm run check` and `pnpm run lint` pass for touched paths (or documented pre-existing failure outside scope).

---

## Offline behavior

**Refs:** [ADR-001](../adrs/ADR-001-product-operating-model.md), [ADR-002](../adrs/ADR-002-local-data-ownership.md), [ADR-010](../adrs/ADR-010-offline-cache-and-service-worker.md), [offline-first-development](../.cursor/rules/offline-first-development.mdc).

- [ ] **OFF-01:** Core recipe book flows (view, search, save, edit, organize, soft-delete/restore of **local** recipes) do not **block** on auth, Supabase, OpenAI, or arbitrary network for Dexie-backed data.
- [ ] **OFF-02:** Loading states distinguish cold shell, warm local data, and stale document cache where the change affects route entry (ADR-010).
- [ ] **OFF-03:** Optional network work is deferred or retried on reconnect; pending local changes are not silently dropped when cloud is unavailable (ADR-005 design intent where sync UI exists).
- [ ] **OFF-04:** Service worker changes preserve versioned cache names, static vs document split, no cross-origin interception, no secrets in the worker (ADR-010; see **GAP-009** in alignment gaps when GET caching is broad).
- [ ] **OFF-05:** Dexie remains system of record; HTTP or Cache Storage is not used as the only store for user recipes (ADR-002, ADR-010).

---

## Connectivity and capability messaging

**Refs:** [offline-connectivity-capability](../.cursor/rules/offline-connectivity-capability.mdc), ADR-001, ADR-004, ADR-007.

- [ ] **NET-01:** UI does not collapse **offline**, **logged out**, **missing cloud/AI permission**, and **provider/sync failure** into a single misleading “offline” message.
- [ ] **NET-02:** `navigator.onLine` is treated as a **hint** only; sync/cloud failures while online show provider/deferred state when surfaced (see **GAP-001**, **GAP-016**).
- [ ] **NET-03:** Gated surfaces subscribe or re-check on `online`/`offline`, visibility resume, or focus where the feature defers network work (not one-shot at mount only).
- [ ] **NET-04:** Disabled controls show a short, honest reason (degraded) rather than a blocking global error for local-only paths.

---

## Anonymous-first

**Refs:** ADR-001 matrix (anonymous / offline cells).

- [ ] **ANO-01:** First-run and core navigation do not **require** sign-in to use the local recipe book.
- [ ] **ANO-02:** Account onboarding may promote cloud/AI benefits but does not block local entry.
- [ ] **ANO-03:** Features scoped to registered users degrade clearly for anonymous users without breaking unrelated local flows.

---

## Auth boundaries

**Refs:** [ADR-004](../adrs/ADR-004-account-and-cloud-enhancement-model.md), [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md), [supabase-enhancement-boundary](../.cursor/rules/supabase-enhancement-boundary.mdc).

- [ ] **AUTH-01:** Session and guards use `locals.supabase` / layout `data.supabase` patterns; no new ad hoc client-only session assumptions for server actions.
- [ ] **AUTH-02:** Logged-out users with local data retain local recipe book behavior (ADR-001 registered-offline row).
- [ ] **AUTH-03:** Sign-in is required only where the product action is genuinely account-scoped (sync, share, backup), with explicit UX—not for opening/editing local recipes.

---

## Cloud enhancement

**Refs:** ADR-004, [ADR-005](../adrs/ADR-005-sync-and-conflict-resolution.md) (Proposed design intent), supabase-enhancement-boundary.

- [ ] **CLD-01:** Cloud backup/sync/share fail gracefully: local data remains usable; errors are surfaced as enhancement failures, not app fatals.
- [ ] **CLD-02:** Missing cloud permission disables cloud actions with distinct copy from “offline” or “logged out.”
- [ ] **CLD-03:** Sync or backup code does not clear local recipe data because cloud is unreachable.
- [ ] **CLD-04:** New Supabase usage documents which public key surface applies and does not expand dual-key drift without alignment-gap note (**GAP-016**, **GAP-017**).

---

## AI disabled and degraded

**Refs:** [ADR-007](../adrs/ADR-007-ai-provider-contract.md), [ai-integration-boundary](../.cursor/rules/ai-integration-boundary.mdc).

- [ ] **AI-01:** No OpenAI (or provider) secrets or server-only imports in client graphs (`.svelte`, client modules).
- [ ] **AI-02:** New generation paths use server routes / `src/lib/api/ai/` (Responses + Zod); legacy Chat Completions path is not extended for new features.
- [ ] **AI-03:** When AI is disabled, offline, or errors: UI remains usable; cached/local suggestion content still readable where ADR-001 requires.
- [ ] **AI-04:** User preferences are included in generation prompts when the feature generates recipes/suggestions.
- [ ] **AI-05:** Request/response boundaries use Zod `safeParse`; failures do not corrupt Dexie or present unvalidated AI JSON as domain truth.

---

## Self-hosted providers

**Refs:** [ADR-011](../adrs/ADR-011-self-hosting-provider-model.md) (**Proposed** — apply when touching provider matrix, personal AI, or user-hosted DB seams).

- [ ] **SH-01:** New cloud/AI code states whether it depends on WFD-managed services, user-provided services, or either.
- [ ] **SH-02:** Account permission checks do not block a configured personal AI API or user-hosted DB when ADR-011 capability matrix allows it.
- [ ] **SH-03:** Personal AI keys are not logged, returned in errors, or stored in client-visible `featureFlags`.
- [ ] **SH-04:** Browser does not call user AI endpoints directly; same-origin server proxy only (ADR-006).

---

## Schema and validation

**Refs:** [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md), [schema-and-type-safety](../.cursor/rules/schema-and-type-safety.mdc).

- [ ] **SCH-01:** Persisted records, API payloads, and AI-generated shapes have Zod schemas in the appropriate `src/lib/api/**` (or documented Dexie row schema).
- [ ] **SCH-02:** Object schemas use `.strict()` at boundaries unless an documented exception exists.
- [ ] **SCH-03:** Exported domain types use `z.infer` (or equivalent) rather than duplicated manual interfaces for the same shape.
- [ ] **SCH-04:** HTTP and AI boundaries validate with `.safeParse()`; invalid data does not reach stores as authoritative.

---

## Accessibility

**Refs:** [ADR-014](../adrs/ADR-014-semantic-html-and-accessibility.md), [svelte-5-ui-conventions](../.cursor/rules/svelte-5-ui-conventions.mdc).

- [ ] **A11Y-01:** Interactive controls use native elements (`button`, `a href`, `label`+`input`) unless bits-ui (or approved primitive) meets keyboard and naming requirements.
- [ ] **A11Y-02:** Exactly one primary content landmark in the app shell; route navigation uses real URLs where applicable (ADR-015 coordination).
- [ ] **A11Y-03:** Heading hierarchy is logical on new/changed pages; icon-only controls have accessible names (`aria-label` or `sr-only` text).
- [ ] **A11Y-04:** Dialogs/menus manage focus and Escape dismiss per project patterns; motion respects `prefers-reduced-motion` when adding animation.
- [ ] **A11Y-05:** Svelte MCP `svelte-autofixer` run on new/changed `.svelte` components (or noted N/A with reason).

---

## Tests and evidence

**Refs:** [`.cursor/agents/test.md`](../.cursor/agents/test.md), [`docs/test-matrix-template.md`](./test-matrix-template.md), `package.json` scripts.

- [ ] **TST-01:** Every AC in `acceptance-criteria.md` is mapped in `test-report.md` to a test, command, or explicit “untested” reason.
- [ ] **TST-02:** New logic has focused unit/component tests where Vitest is practical; flaky or browser gaps recorded as residual risk in `test-report.md` / `test-matrix.md`.
- [ ] **TST-03:** Offline or anonymous smoke is documented when the change affects ADR-001/010 paths (automated or manual step name in test/validation report; **OFFL** layer when `test-matrix.md` exists).
- [ ] **TST-04:** Commands in `test-report.md` were run or the report states why not (e.g. environment limitation).
- [ ] **TST-05:** When `test-matrix.md` exists, **Actual coverage** matches **Planned coverage** or gaps are listed in **Gaps vs plan** / `test-report.md` **Uncovered criteria**.

---

## ADR-specific annexes

Use when the task touches these domains (in addition to sections above).

### Recommendations and local inputs (ADR-009)

- [ ] **REC-01:** Recommendation inputs read from Dexie only (saved recipes, tags, preferences, ratings/favorites, `checkout_history` per ADR table).
- [ ] **REC-02:** Deterministic local recommendations are not conflated with AI suggestion lifecycle (separate code paths and UX).
- [ ] **REC-03:** Checkout history bucketing excludes non-current rows per ADR rules.

### Offline shell and service worker (ADR-010)

- [ ] **SW-01:** After deploy version bump, obsolete caches are dropped; static shell still loads offline after warm visit.
- [ ] **SW-02:** Sensitive or highly dynamic GET APIs are not cached against ADR intent (note **GAP-009** if network-first persists all same-origin GETs).
- [ ] **SW-03:** Manual smoke documented: cold offline open, warm offline navigation on a core recipe route.

---

## Checklist versioning

| Version | Date | Notes |
| ------- | ---- | ----- |
| 1.0.0 | 2026-05-16 | Initial checklist: offline, connectivity, anonymous, auth, cloud, AI, self-host, schema, a11y, tests, ADR-009/010 annexes |
| 1.0.1 | 2026-05-16 | TST-05 + cross-links to test matrix template and orchestration test artifacts |

When checklist items change, bump the version table and sync [`.cursor/agents/validator.md`](../.cursor/agents/validator.md) if the output contract changes.
