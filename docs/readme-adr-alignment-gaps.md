# README / ADR alignment gaps

Working backlog of places where **current behavior or implementation** does not match **stated intent** in the top-level [`README.md`](../README.md) or **Accepted** ADRs in [`docs/adrs/`](./adrs/INDEX.md).

This is **not** the same as [`adr-and-rules-todo.md`](./adr-and-rules-todo.md): that file tracks governance artifacts (future ADRs, Cursor rules, workflows). **This file tracks product and architecture drift**—symptoms like slow loads, timeouts, or flows that contradict offline-first, anonymous-first, or local-first mandates.

Agents and contributors should **add rows as gaps are discovered** (for example while working through ADR or rules tasks). Prefer fixing small gaps in the same change set; when a fix is deferred, record it here so intent stays honest.

---

## How to record a gap

Use a new row in the table below, or add a subsection under **Deferred / investigated** with more detail and links.

Suggested fields (adapt as needed):

| Field | Guidance |
| ----- | -------- |
| **ID** | `GAP-NNN` (increment from the highest existing ID in this file). |
| **Status** | `Open`, `Investigating`, `Planned`, `Fixed` (move fixed rows to **Resolved** or delete after a release note if you prefer a slim doc). |
| **Severity** | `Blocker` (violates core mandate for typical users), `Major`, `Minor`, `Cosmetic`. |
| **Source** | README section heading and/or ADR ID (e.g. ADR-001 § capability matrix). |
| **Observed** | What actually happens (repro steps if non-obvious). |
| **Expected** | What README/ADR says should happen. |
| **Notes** | Suspected cause, affected routes or modules, links to issues/PRs. |
| **Owner** | Optional; person or team driving remediation. |

---

## Active gaps

| ID | Status | Severity | Source | Observed | Expected | Notes | Owner |
| -- | ------ | -------- | ------ | -------- | -------- | ----- | ----- |
| GAP-001 | Open | Major | README — *Offline-first*; [ADR-001](./adrs/ADR-001-product-operating-model.md) capability matrix; [ADR-004](./adrs/ADR-004-account-and-cloud-enhancement-model.md) logged-out / offline continuity | Using the app while **offline** (or with unreliable network) can produce **slow loading and timeouts**, undermining practical offline use. | Once cached, the app should remain **useful offline** with **fast repeat loads** and core recipe flows without blocking on network, Supabase, or OpenAI. | Likely causes include uncapped `fetch` / TanStack Query behavior, layout loads that assume network, or missing offline-first loading paths; triage with DevTools (Network throttling / offline) and trace critical `+layout` / `+page` data dependencies. | — |
| GAP-002 | Open | Major | [ADR-005](./adrs/ADR-005-sync-and-conflict-resolution.md) soft delete and restore behavior | Current sync planning reads active recipes only, filtering out rows with `deleted_at` or `archived` before building the plan. | Sync planning should include tombstoned rows so deletes and restores propagate across devices and do not reappear as active data. | Affected area: `src/lib/api/cloud/sync.service.ts` and `src/lib/api/cloud/cloud.model.ts`; remediation should include tombstone-aware planning and tests for delete/restore propagation. | — |

---

## Deferred / investigated

Use this section for longer write-ups, spikes, or gaps that need design before a table row is enough.

_(None yet.)_

---

## Resolved

Move **Fixed** items here with a one-line **Resolution** (and optional PR link) so the doc stays a useful history.

_(None yet.)_
