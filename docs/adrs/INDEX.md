# ADR Index — What's For Dinner

## Agent Instructions

- Consult this index before making any architectural decision.
- Only **Accepted** ADRs are binding; do not act on **Proposed**, **Deprecated**, or **Superseded** entries.
- `Superseded` with a successor called out in the ADR body means the listed record is no longer governing — follow the referenced ADR instead.
- If no relevant ADR exists for a decision you are about to make, draft one with status **Proposed** and surface it for review before proceeding.
- ADRs are grouped by domain in the category tables below.

## Index Maintenance Rules

- Update this index in the same session as any ADR status change.
- `Title` should link to the corresponding ADR file.
- The index and the ADR file must never be out of sync.
- ADRs are never removed from this index; use **Deprecated** or **Superseded** (with a clear successor link) as appropriate.

## Creating a New ADR

1. Copy [TEMPLATE.md](TEMPLATE.md).
2. Assign the next sequential ID (increment the numeric segment from the highest existing `ADR-*` file in `docs/adrs/`, e.g. after `ADR-002-…` use `003` → `ADR-003-…`).
3. Name the file `ADR-NNN-short-kebab-title.md` under `docs/adrs/` (see [TEMPLATE.md](TEMPLATE.md) for the full naming rule).
4. Set **Status** to **Proposed**.
5. Fill in all sections per the template (remove instructional lines before opening a PR).
6. Submit for review. Once accepted, update **Status** to **Accepted** and add a row in the correct domain table below.

---

## Index

### Platform

| ID  | Domain   | Title | Status | Description   |
| --- | -------- | ----- | ------ | ------------- |
| [ADR-001](ADR-001-product-operating-model.md) | Platform | Product operating model | Accepted | Offline-first, anonymous-first recipe book; optional cloud and AI; binding capability matrix without auth/network/Supabase/OpenAI. |
| [ADR-004](ADR-004-account-and-cloud-enhancement-model.md) | Platform | Account and cloud enhancement model | Accepted | Supabase as optional enhancement for auth, backup, sharing, and sync; logged-out/offline continuity required for local recipe flows. |

---

### Architecture

| ID  | Domain       | Title | Status | Description   |
| --- | ------------ | ----- | ------ | ------------- |
| [ADR-002](ADR-002-local-data-ownership.md) | Architecture | Local data ownership | Accepted | Dexie/IndexedDB as default home for recipes, preferences, recommendation inputs, and cached AI artifacts; durable vs transient classification. |
| [ADR-003](ADR-003-ai-suggestion-lifecycle.md) | Architecture | AI suggestion lifecycle | Accepted | Prompt-to-suggestion lifecycle is transient-local with dedup, bounded history, and explicit promotion boundary to durable recipes. |
| [ADR-005](ADR-005-sync-and-conflict-resolution.md) | Architecture | Sync and conflict resolution | Proposed | Local-first Dexie sync semantics with Supabase replicas, tombstone propagation, timestamp-led conflict resolution, restore behavior, and checkout-history handling. |
| [ADR-007](ADR-007-ai-provider-contract.md) | Architecture | AI provider contract | Accepted | Server-only provider access; Chat Completions vs Responses+Zod paths; preference injection for generation; errors, offline degradation, and future personal-provider shape. |

---

### UI

| ID  | Domain | Title | Status | Description   |
| --- | ------ | ----- | ------ | ------------- |
| —   | UI     | —     | —      | _No ADRs yet_ |

---

### Security

| ID  | Domain   | Title | Status | Description   |
| --- | -------- | ----- | ------ | ------------- |
| [ADR-006](ADR-006-serverless-and-secret-boundary.md) | Security | Serverless and secret boundary | Accepted | Server-only OpenAI and private env; no secrets in client or `.svelte`; serverless/portability constraints (incl. Workers-style). |

---

### Quality

| ID  | Domain  | Title | Status | Description   |
| --- | ------- | ----- | ------ | ------------- |
| —   | Quality | —     | —      | _No ADRs yet_ |
