# ADR-001: Product operating model

## Status

**Accepted**

## Date

2026-05-02

## Scope

- **In scope:** What WFD is as a product, the ordering of capabilities (offline-first, anonymous-first), and which user-visible capabilities must remain available without authentication, without network connectivity, without Supabase, and without OpenAI. High-level expectations for degraded behavior when optional layers are absent.
- **Out of scope:** Concrete data schemas and table ownership (see [ADR-002: Local data ownership](ADR-002-local-data-ownership.md)), AI artifact retention and invalidation rules (see [ADR-003: AI suggestion lifecycle](ADR-003-ai-suggestion-lifecycle.md)), Supabase role boundaries for account and cloud enhancement (see [ADR-004: Account and cloud enhancement model](ADR-004-account-and-cloud-enhancement-model.md)), detailed Supabase sync semantics (future sync ADR), serverless code layout (future ADR on serverless and secret boundary), and self-hosting configuration details (future ADRs on self-hosting provider model).

## Context

WFD competes with simple recipe apps, cloud-heavy assistants, and auth-walled tools. The project README already states that the local recipe book is the center of gravity and that cloud and AI are optional enhancements. Without a single ADR, implementers can drift toward “feature needs the API” or “sign in to continue,” which breaks the product promise.

### Decision pressure (required)

Core flows are easy to couple to network, auth, or AI for speed of implementation. That coupling is reversible only at high cost and erodes trust for users who cook offline or avoid accounts. A written operating model is required so PRs and agents can reject changes that make optional services mandatory for the recipe book.

### Supporting context

- **Problem:** Ambiguity about whether a capability is “core” or “enhancement” leads to inconsistent UX and architecture.
- **Options considered:** (1) Cloud-first or auth-first product — rejected; contradicts README and deployment goals. (2) AI-first product — rejected; AI must remain an enhancement. (3) Document anonymous/offline-first as binding — **chosen**.
- **Must stay true:** Local-first saved recipes, transient treatment of AI suggestions until explicitly saved, schema-led validation, serverless-safe boundaries (detailed in other docs and future ADRs).

## Decision

We will ship **What's For Dinner** as an **offline-first, anonymous-first recipe book** with **optional** Supabase-backed account features (auth, backup, sharing, sync) and **optional** OpenAI-backed assistance (ideas, full recipes, revisions, Q&A).

We will **not** require an account, live network, Supabase, or OpenAI for any capability listed under **Must work without** below.

### Capability matrix (binding)

| Capability area | Without auth | Without network (after initial load/cache) | Without Supabase | Without OpenAI |
| --- | --- | --- | --- | --- |
| **Recipe book** — save, edit, search, organize, soft-delete, restore locally owned recipes | Required | Required | Required | Required |
| **Preferences and recommendation inputs** stored for local use (dietary, constraints, etc.) | Required | Required | Required | Required |
| **Recommendations** from saved recipes and local usage history (deterministic / local engine) | Required | Required | Required | Required |
| **Viewing locally cached AI suggestions** already retrieved | Required | Required | Required | N/A (content already local) |
| **Generating new AI suggestions or running recipe assistance / Q&A** | Allowed to require user action in UI, but must not require sign-in for anonymous product path | Requires connectivity to reach WFD or user-configured AI endpoint when that path is used | N/A | **Requires** OpenAI or an allowed substitute provider when the user invokes AI |
| **Cloud backup, multi-device sync, sharing** | N/A (by definition) | Requires connectivity when syncing | **Requires** Supabase or a future user-hosted equivalent | N/A |
| **Sign-in and account management** | N/A | Degrades gracefully; no hard lockout of local recipe book | Optional provider | N/A |

**Must work without auth, network, Supabase, and OpenAI** (simultaneously, after the app and local data are present in the browser):

- Full use of the **local recipe book** (CRUD, search, organization, soft delete, restore) against data in IndexedDB.
- **Local recommendations** driven only by local stores (saved recipes, tags, preferences, checkout history, and other inputs defined in a future recommendations ADR).
- **Application shell and navigation** for those flows without calling Supabase or OpenAI.
- **Clear, non-blocking UI** when AI or cloud features are unavailable (empty states, disabled actions, or messaging — not hard errors that prevent recipe book use).

**Registered users offline or logged out:** A user who has previously registered must still be able to use the **same local recipe book behaviors** as an anonymous user when offline or logged out, limited only by absence of cloud-fresh data on that device (per future sync ADR). Auth must not become a gate for opening and editing locally stored recipes.

**Explicit exclusions (required)**

- **We are not** building an online-only recipe product where the browser is a thin shell over a mandatory remote recipe API.
- **We are not** treating AI-generated suggestions as durable cloud-backed user recipes unless the user explicitly saves them as recipes (lifecycle ADR will refine this).
- **We are not** requiring sign-in for first-run value; onboarding may offer account benefits but must not block local recipe book entry.
- **We are not** assuming OpenAI or Supabase are the only future providers; we still require the **anonymous/offline** matrix above when those integrations are absent or replaced (future self-hosting ADRs).

## Consequences

### Positive

- Single checklist for reviewers and agents when evaluating feature design.
- Aligns implementation with README and deployment on serverless/offline-friendly stacks.
- Reduces accidental coupling of core UX to optional services.

### Negative

- Some features cost more engineering (sync conflict UI, offline cache, anonymous paths).
- AI and cloud features need explicit “unavailable” states instead of failing the whole app.

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Creeping mandatory auth/network | Treat violations as architecture gaps; document in alignment-gap doc until fixed |
| Ambiguity for “hybrid” features (e.g. import) | Each feature gets scoped ADR or design doc before implementation (see roadmap ADR backlog) |

## Operational impact

- **Performance / cost:** Favor local reads from Dexie for core flows; optional services add cost only when invoked.
- **Debugging:** Reproduce bugs in logged-out, offline, and “no API keys” configurations for core flows.
- **Developer workflow:** New features should state which matrix cells they touch; Planner consults this ADR (see orchestration below).

## Examples (optional)

- A user on a plane opens WFD: recipes and local recommendations work; “Generate ideas” shows that AI needs a connection or is disabled.
- A user without a Supabase account uses WFD for months; all recipe data remains local until they optionally connect an account.

## Compliance (optional)

Not applicable beyond general accessibility expectations for public UI (handled in UI rules and standards).

## Enforcement rules

- **Cursor / agent rules:** Future rules for offline-first development and Supabase/AI boundaries should cite this ADR; until those rules exist, use [README.md](../../README.md) **Product Principles** and [AGENTS.md](../../AGENTS.md) as secondary references.
- **Code / architecture:** Do not add imports of private env secrets or direct OpenAI calls in client-only modules for core recipe book behavior (detailed boundary in future serverless ADR). Core routes and stores for recipes must remain usable when `navigator.onLine` is false and when Supabase session is null.
- **When to revisit:** Material change to product promise (e.g. mandatory account), new mandatory provider, or addition of a new **core** capability that must be reclassified in the matrix — update this ADR in place or supersede with a new ADR.

## Supersession notes

- **When to supersede:** If the core invariant changes from “anonymous-first offline-first recipe book” to a different primary product shape, create a successor ADR and mark this one **Superseded**.
- **Stable identifiers:** This file remains `ADR-001-product-operating-model.md`.

---

## Orchestrated development

**Orchestration not required** for routine documentation edits to this ADR. Orchestration is required when implementation work changes the capability matrix or user-facing guarantees above.

### Relevant ADRs for implementation

- ADR-001: Product operating model (this document) — baseline for subsequent ADRs on data, AI, sync, and self-hosting.
- [ADR-002: Local data ownership](ADR-002-local-data-ownership.md) — Dexie/IndexedDB as default home; durable user data vs transient AI/cache data.
- [ADR-003: AI suggestion lifecycle](ADR-003-ai-suggestion-lifecycle.md) — prompt/request/cache/promotion lifecycle for AI suggestion artifacts.
- [ADR-004: Account and cloud enhancement model](ADR-004-account-and-cloud-enhancement-model.md) — Supabase scope and continuity expectations for logged-out/offline use.

### Planning artifact

- Omit until a phased plan exists for a specific initiative.

### Builder scope boundary

- N/A for this ADR alone; applies repo-wide as a constraint on feature PRs.

### Validator expectations

- Verify new features against the matrix: no new **core** capability that requires auth, network, Supabase, or OpenAI unless this ADR is updated or a row is added in [docs/readme-adr-alignment-gaps.md](../readme-adr-alignment-gaps.md).
- Confirm logged-out and offline paths remain navigable for recipe book flows.

### Test role and evidence

- Playwright or manual scenarios: offline + logged out + local recipes present; AI buttons degraded without crash.
- Record gaps in [docs/readme-adr-alignment-gaps.md](../readme-adr-alignment-gaps.md) when tests cannot yet cover a declared guarantee.

### Alignment gaps

- Track significant mismatches in [docs/readme-adr-alignment-gaps.md](../readme-adr-alignment-gaps.md); use PR descriptions only for gaps fixed in the same change.

### Merge / workflow gates

- [x] ADR created before treating product-shape debates as settled for new work.
- [ ] Known deviations documented when implementation lags this ADR.
- [ ] Validation evidence for behavior changes that touch the matrix.
