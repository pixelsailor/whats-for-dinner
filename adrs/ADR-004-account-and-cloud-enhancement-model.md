# ADR-004: Account and cloud enhancement model

## Status

**Accepted**

## Date

2026-05-06

## Scope

- **In scope:** Account and cloud responsibilities in WFD, including Supabase role boundaries (auth, backup, sharing, sync), capability gating, and continuity expectations when users are logged out or offline after prior registration.
- **Out of scope:** Detailed sync/conflict algorithms (future sync ADR), provider contract internals for AI or alternative databases (future provider/self-hosting ADRs), and low-level schema decisions.

## Context

WFD is anonymous-first and offline-first, but supports account-backed enhancements. Current route behavior gates AI and cloud operations based on session/permissions/network, while local recipe interactions remain available. Without a specific ADR, teams may accidentally elevate account/cloud dependencies into mandatory product prerequisites.

### Decision pressure (required)

As account-linked features expand, accidental coupling can force sign-in for core flows or make offline/logged-out states feel broken. We need explicit model boundaries so cloud remains an enhancement, not a requirement.

### Supporting context

- **Problem:** Ambiguity around what Supabase owns versus what local browser state owns.
- **Options considered:** (1) Auth-first cloud-centric model — rejected; violates product promise. (2) No account features — rejected; removes backup/sharing value. (3) Optional account/cloud enhancement model with strict continuity guarantees — **chosen**.
- **Must stay true:** ADR-001 capability matrix and ADR-002 durable/transient data ownership.

## Decision

Supabase is an **optional enhancement provider** with the following scope:

1. **Authentication and identity**: Account sign-in/session identity.
2. **Cloud backup and synchronization**: Multi-device continuity for durable recipe data and account-scoped records defined by sync ADRs.
3. **Sharing and cloud collaboration surfaces**: Provider-backed sharing paths where implemented.
4. **Permission evaluation for enhancement features**: Capability checks may limit enhancement actions (for example AI-assistance or cloud sync operations) without blocking local recipe-book use.

### Continuity guarantees (binding)

- A previously registered user who is offline or logged out must continue to use local recipe-book behaviors on that device (open, edit, search, organize local recipes) with graceful cloud unavailability messaging.
- Missing cloud permissions must not block non-cloud local operations.
- Capability-gated enhancement actions should degrade clearly (disabled actions, explanatory text), not fail in ways that break unrelated local UX.

### Data responsibility model

- **Local-first durable data:** Browser-local Dexie data remains primary for on-device recipe book continuity.
- **Cloud enhancement data:** Supabase stores account-linked backup/sync/share state for supported domains.
- **Transient AI artifacts:** Suggestion artifacts remain local/transient per ADR-003 and are not promoted to cloud durable recipe data unless explicitly converted/saved as recipes.

### Self-hosting compatibility boundary

- Supabase-specific checks should be treated as current provider implementation details, not immutable product invariants.
- Architecture should permit future user-hosted database providers that can satisfy backup/sync/share responsibilities without requiring WFD-managed Supabase accounts.
- Permission checks must avoid assuming WFD-managed Supabase is the only valid cloud provider path once alternative providers are introduced.

### Explicit exclusions (required)

- **We are not** requiring sign-in for first-run recipe-book value.
- **We are not** treating cloud availability as a precondition for local recipe browsing/editing.
- **We are not** hard-coding Supabase as a forever-exclusive provider contract.

## Consequences

### Positive

- Preserves anonymous/offline product guarantees while allowing strong account value.
- Clarifies where to add capability checks and where not to.
- Creates a clear migration path toward user-hosted providers.

### Negative

- Requires duplicate-path testing (local-only vs account-enhanced).
- Some UX states need extra messaging for permissions/network/session conditions.

### Risks and mitigations

| Risk                                                            | Mitigation                                                |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| Feature teams accidentally block local flows behind auth checks | Enforce ADR-001 + ADR-004 in reviews and future rule set  |
| Provider lock-in through Supabase-only assumptions              | Require provider-neutral boundaries in new cloud features |
| User confusion in degraded cloud states                         | Standardize capability messages and disabled-state UX     |

## Operational impact

- **Performance / cost:** Cloud calls are on-demand enhancement operations; local-first paths reduce dependency on network round trips.
- **Debugging:** Test with matrix of session present/absent, permission allowed/denied, online/offline.
- **Developer workflow:** Any cloud/auth feature should state whether it is enhancement-only and how logged-out/offline continuity is preserved.

## Examples (optional)

- Logged-out user opens existing local recipes and edits them; sync controls are hidden/disabled with clear messaging.
- Registered user loses connectivity mid-session; local recipe actions continue, cloud sync actions defer/fail gracefully.
- AI suggestions may require auth/permission/network, but “Recent Suggestions” and recipe-book pages still load local data.

## Enforcement rules

- **Cursor / agent rules:** Future “Supabase enhancement boundary” and “Self-hosting compatibility” rules should cite this ADR.
- **Code / architecture:** Keep cloud operations behind service boundaries (`CloudService`, `SyncService` or successors); maintain local fallbacks in feature paths.
- **When to revisit:** Introduction of new cloud providers, expanded sharing model, or product decision to require account for previously local capabilities.

## Supersession notes

- **When to supersede:** If WFD changes from optional account enhancement to mandatory account-centric product model.
- **Stable identifiers:** This file remains `ADR-004-account-and-cloud-enhancement-model.md`.

---

## Orchestrated development

Orchestration is not required for writing this ADR alone. It is required for multi-phase account/sync architecture changes.

### Relevant ADRs for implementation

- [ADR-001: Product operating model](ADR-001-product-operating-model.md)
- [ADR-002: Local data ownership](ADR-002-local-data-ownership.md)
- [ADR-003: AI suggestion lifecycle](ADR-003-ai-suggestion-lifecycle.md)
- ADR-004: Account and cloud enhancement model (this document)

### Planning artifact

- Omit until a phased plan exists for account/sync redesign work.

### Builder scope boundary

- N/A for this ADR-only change.

### Validator expectations

- Verify cloud and auth checks do not block core local recipe flows.
- Verify enhancement-only operations degrade gracefully for offline/logged-out/unauthorized states.

### Test role and evidence

- Validate matrix scenarios for session, permission, and network states across recipe core flows and enhancement features.

### Alignment gaps

- Record features where cloud/auth checks currently gate local-first behavior until remediated.

### Merge / workflow gates

- [x] ADR created for account and cloud enhancement model backlog item.
- [ ] Known deviations documented when implementation lags this ADR.
- [ ] Validation evidence when behavior changes touch this boundary.
