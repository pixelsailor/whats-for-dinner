# ADR-010: Offline cache and service worker policy

## Status

**Accepted**

## Date

2026-05-09

## Scope

- **In scope:** How the browser **Service Worker** and **Cache Storage** may be used to satisfy WFD’s **offline-first** shell and navigation goals; what categories of responses are cached; what must **not** be treated as durable state via the cache; coordination with **Dexie / IndexedDB**; versioning and eviction; same-origin vs cross-origin behavior; expectations for **storage growth** and **freshness** at the policy level (not every implementation detail).
- **Out of scope:** Dexie schema and table lifecycle ([ADR-002](ADR-002-local-data-ownership.md), [ADR-003](ADR-003-ai-suggestion-lifecycle.md)); Supabase sync ([ADR-005](ADR-005-sync-and-conflict-resolution.md)); server route and secret boundaries ([ADR-006](ADR-006-serverless-and-secret-boundary.md)); AI provider behavior ([ADR-007](ADR-007-ai-provider-contract.md)); self-hosting deployment topology (future ADR).

## Context

WFD commits to remaining **useful offline** after the app is cached ([README](../README.md), [ADR-001](ADR-001-product-operating-model.md)). Without an explicit policy, contributors may add caching that **confuses HTTP cache with durable user data**, bloat **Cache Storage**, or serve **stale personalized responses**. The product also keeps **authoritative recipe and preference state in IndexedDB**, not in HTTP caches—those layers must stay distinct.

### Decision pressure (required)

The repo already ships a **custom SvelteKit service worker** (`src/service-worker.js`). We need a **binding policy** so changes to caching strategies are reviewable against offline-first intent, security, and data ownership ADRs—especially as new **GET** endpoints or navigations are added.

### Supporting context

- **Problem:** Ambiguity over what the service worker may cache, for how long, and how that relates to Dexie-backed data.
- **Options considered:** (1) **No** service worker — rejected; weakens offline shell and repeat visits. (2) **Third-party PWA toolkit only** (e.g. Workbox via plugin) — deferred; current hand-rolled worker is acceptable if policy-constrained. (3) **Document a two-tier model** (static shell + network-first documents) aligned with IndexedDB ownership — **chosen**.
- **Must stay true:** Offline-first and anonymous-first matrix ([ADR-001](ADR-001-product-operating-model.md)); durable vs transient data stays in **Dexie** per [ADR-002](ADR-002-local-data-ownership.md); secrets and provider calls remain **server-only** ([ADR-006](ADR-006-serverless-and-secret-boundary.md)).

## Decision

We will use the **SvelteKit service worker** (source at `src/service-worker.js`, built from `$service-worker` precursors) to implement a **two-tier** caching model:

1. **Application shell and static assets** — compiled JS/CSS and other build-time static assets listed in SvelteKit’s `build` and `files` sets. These **must** be cached so repeat loads and offline startup remain practical. Strategy: **cache-first** (serve from `app-cache-${version}` when present; populate on miss). Cache names **must** include the build **`version`** so deployments roll forward cleanly.

2. **HTML documents and other same-origin GET navigations** — **network-first** with **Cache Storage fallback** (`data-cache-${version}`) so offline revisits can still render the last successful response when the network is unavailable. This applies to product routes such as `/`, `/recipes`, `/recommendations`, `/suggestions`, and `/preferences` and their path prefixes, and **defaults to the same network-first behavior for any other same-origin GET** not served as a static asset from tier (1).

We will **not** use Cache Storage as the **system of record** for recipes, preferences, checkout history, or AI suggestion rows. That data **must** live in **Dexie** ([ADR-002](ADR-002-local-data-ownership.md)); the service worker only helps deliver the **app shell** and **last-known HTML** when the network fails.

We will **not** intercept **cross-origin** requests in the service worker (pass-through to the browser). Remote providers (Supabase, OpenAI, etc.) **must not** depend on this worker for correctness.

We will **not** run **secret-bearing logic** in the service worker; it performs caching and fetch routing only.

### Explicit exclusions (required)

- **We are not** persisting AI suggestion **content** in Cache Storage as a substitute for `db.suggestions` and related Dexie tables; transient AI artifacts remain governed by [ADR-002](ADR-002-local-data-ownership.md) and [ADR-003](ADR-003-ai-suggestion-lifecycle.md).
- **We are not** adopting a **single global stale-while-revalidate** policy for all APIs without revisiting this ADR; future **GET** APIs that must never be cached need an explicit **opt-out** list or alternate strategy.
- **We are not** guaranteeing **instant** control of all tabs on first install without `clients.claim()` or equivalent; that is an implementation detail that may be added without changing the policy above.
- **We are not** replacing browser **quota** management with application-level “exact byte budgets” in this ADR; we rely on **versioned** cache names, activation cleanup, and browser eviction under pressure, and we keep the static shell **lean** as a product goal ([README](../README.md)).

## Consequences

### Positive

- Clear split: **Cache Storage** = delivery layer; **IndexedDB** = durable and transient **domain** data.
- Offline repeat use aligns with ADR-001’s “after initial load/cache” capability row.
- Cross-origin pass-through avoids leaking or over-caching provider traffic.

### Negative

- Users may briefly see **stale HTML** after deploy until a successful network fetch refreshes `data-cache-*`.
- **Successful** same-origin **GET** responses that fall through to the default handler may be **retained** until the next build version; without per-route rules, some responses may be **fresher or staler than ideal** (see **Alignment gaps** below).

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Stale navigations or GET APIs after releases | Versioned cache names + network-first; add **explicit no-store routes** when a feature needs freshness. |
| Confusion between HTTP cache and Dexie | This ADR + [ADR-002](ADR-002-local-data-ownership.md); code review flags that persist user recipes only via Dexie stores. |
| Storage growth | Activation deletes prior `app-cache-*` / `data-cache-*` generations; keep static payloads small; monitor if Cache Storage grows unexpectedly in QA. |

## Operational impact

- **Performance:** Cache-first static assets improve repeat load; network-first documents trade freshness for offline resilience.
- **Debugging:** Use Application → Service Workers and Cache Storage in devtools; correlate `version` with build output.
- **Deployment:** Each release bumps `$service-worker` `version`, triggering new cache keys and cleanup on activate.

## Examples (optional)

- Offline open of `/recipes/...` after a prior online visit: **network-first** may serve the last cached document from `data-cache-${version}` when offline, while recipe bodies still load from **Dexie** in the client.
- Cold install: **install** event pre-caches static asset list; first navigation populates document cache on success.

## Compliance

- **Not applicable** beyond normal web security hygiene (no secrets in SW; HTTPS in production).

## Enforcement rules

- **Cursor / agent rules:** The future **offline-first development** rule should require new features to state behavior when the SW cache is cold, warm, or stale, and to avoid mandatory network for core recipe flows ([ADR-001](ADR-001-product-operating-model.md)).
- **Code / architecture:** Changes to `src/service-worker.js` must preserve: **versioned** cache names; **static vs document** split; **no cross-origin interception**; **no secrets** in the worker. Add **tests or manual checklist** evidence when changing fetch strategies.
- **When to revisit:** Introduction of significant **GET** APIs, auth-sensitive **GET** responses, or a move to **Workbox** / another toolkit warrants updating this ADR rather than silent drift.

## Supersession notes

- **Stable identifier:** ADR-010.
- **If superseded:** Link the successor and state whether Cache Storage roles or tier strategies changed.

---

## Orchestrated development

orchestration not required for documenting this decision; use Plan–Build–Validate–Test when implementing **large** changes to caching tiers or adding many new GET surfaces.

### Relevant ADRs for implementation

- [ADR-001](ADR-001-product-operating-model.md) — offline capability matrix.
- [ADR-002](ADR-002-local-data-ownership.md) — IndexedDB vs cache layers.
- [ADR-003](ADR-003-ai-suggestion-lifecycle.md) — transient AI artifacts not cloud-backed.
- [ADR-006](ADR-006-serverless-and-secret-boundary.md) — no secrets in client-side workers.

### Planning artifact

- Omit until a scoped change plan exists (for example TTLs, opt-out lists, or `clients.claim()` hardening).

### Builder scope boundary

- Omit.

### Validator expectations

- Verify fetch handler behavior against the **two-tier** model and cross-origin pass-through; record intentional deviations in [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md).

### Test role and evidence

- Manual: offline mode after online warm-up for core routes; deploy upgrade (new `version`) clears obsolete caches.
- Automated: add checks if the project later introduces SW-focused tests.

### Alignment gaps (current implementation vs this ADR)

The following gaps were identified when comparing this ADR to `src/service-worker.js`; they are also recorded in [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md) as **GAP-009**.

| Topic | ADR expectation | Observed |
| --- | --- | --- |
| **Selective caching for GET APIs** | Sensitive or highly dynamic same-origin **GET** responses should be **opted out** or use stricter freshness rules once they exist. | Any same-origin **GET** not in the static asset set uses **network-first** and **persists successful responses** to `data-cache-${version}` with **no TTL** and **no `/api/*` exclusion**; today only **`/api/share/[token]`** exposes GET, but the pattern applies globally. |
| **Immediate client control** | Optional hardening. | **No `clients.claim()`** in `activate`; first load behavior depends on browser registration timing (usually acceptable). |

### Merge / workflow gates

- [x] ADR created for offline cache and service worker policy.
- [x] Known deviations documented as alignment gaps.
- [x] Validation checklist for offline shell behavior — [`docs/validation-checklist.md`](../docs/validation-checklist.md) **Offline behavior** (`OFF-*`) and **ADR-specific annexes → Service worker (ADR-010)** (`SW-*` items).
