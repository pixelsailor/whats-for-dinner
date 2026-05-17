# README / ADR alignment gaps

Working backlog of places where **current behavior or implementation** does not match **stated intent** in the top-level [`README.md`](../README.md) or **Accepted** ADRs in [`adrs/`](../adrs/INDEX.md).

This is **not** the same as [`adr-and-rules-todo.md`](./adr-and-rules-todo.md): that file tracks governance artifacts (future ADRs, Cursor rules, workflows). **This file tracks product and architecture drift**—symptoms like slow loads, timeouts, or flows that contradict offline-first, anonymous-first, or local-first mandates.

Agents and contributors should **add rows as gaps are discovered** (for example while working through ADR or rules tasks). Prefer fixing small gaps in the same change set; when a fix is deferred, record it here so intent stays honest.

---

## How to record a gap

Use a new subsection under **Active gaps**, or add a subsection under **Deferred / investigated** with more detail and links.

Suggested fields (adapt as needed):

| Field        | Guidance                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**       | `GAP-NNN` (increment from the highest existing ID in this file).                                                                       |
| **Status**   | `Open`, `Investigating`, `Planned`, `Fixed` (move fixed rows to **Resolved** or delete after a release note if you prefer a slim doc). |
| **Severity** | `Blocker` (violates core mandate for typical users), `Major`, `Minor`, `Cosmetic`.                                                     |
| **Source**   | README section heading and/or ADR ID (e.g. ADR-001 § capability matrix).                                                               |
| **Observed** | What actually happens (repro steps if non-obvious).                                                                                    |
| **Expected** | What README/ADR says should happen.                                                                                                    |
| **Notes**    | Suspected cause, affected routes or modules, links to issues/PRs.                                                                      |
| **Owner**    | Optional; person or team driving remediation.                                                                                          |

---

## Active gaps

### GAP-001

- **Status:** Open
- **Severity:** Major
- **Source:** README — _Offline-first_; [ADR-001](../adrs/ADR-001-product-operating-model.md) capability matrix; [ADR-004](../adrs/ADR-004-account-and-cloud-enhancement-model.md) logged-out / offline continuity
- **Observed:** Using the app while **offline** (or with unreliable network) can produce **slow loading and timeouts**, undermining practical offline use.
- **Expected:** Once cached, the app should remain **useful offline** with **fast repeat loads** and core recipe flows without blocking on network, Supabase, or OpenAI.
- **Notes:** Likely causes include uncapped `fetch` / TanStack Query behavior, layout loads that assume network, or missing offline-first loading paths; triage with DevTools (Network throttling / offline) and trace critical `+layout` / `+page` data dependencies.
- **Owner:** —

### GAP-002

- **Status:** Open
- **Severity:** Major
- **Source:** [ADR-005](../adrs/ADR-005-sync-and-conflict-resolution.md) soft delete and restore behavior
- **Observed:** Current sync planning reads active recipes only, filtering out rows with `deleted_at` or `archived` before building the plan.
- **Expected:** Sync planning should include tombstoned rows so deletes and restores propagate across devices and do not reappear as active data.
- **Notes:** Affected area: `src/lib/api/cloud/sync.service.ts` and `src/lib/api/cloud/cloud.model.ts`; remediation should include tombstone-aware planning and tests for delete/restore propagation.
- **Owner:** —

### GAP-005

- **Status:** Open
- **Severity:** Major
- **Source:** [README](../README.md) — _Preferences shape suggestions_; [ADR-007](../adrs/ADR-007-ai-provider-contract.md) § preferences
- **Observed:** **Revision**, **assistance**, and **addendum** flows in `src/lib/server/openai.ts` do not inject user preference text. `src/routes/api/recipes/new/+server.ts` reads `preferences` for gating only and does not pass dietary/preferences text into `appendRecipeDetails`.
- **Expected:** Preferences and dietary constraints should influence **recipe-related** AI prompts broadly (at minimum revision and metadata addendum when AI is used).
- **Notes:** Assistance may be partially exempt if framed as pure Q&A; revision and addendum are clear gaps.
- **Owner:** —

### GAP-006

- **Status:** Open
- **Severity:** Minor
- **Source:** [ADR-007](../adrs/ADR-007-ai-provider-contract.md) § structured response contract
- **Observed:** Deprecated **Chat Completions** handlers rely on `JSON.parse` and type assertions (`parseJsonPayload` in `src/lib/server/openai.ts`); suggestion routes parse model output again in `+server.ts` without `safeParse`.
- **Expected:** AI JSON should be validated with **Zod** (or equivalent) at the server boundary before success responses.
- **Notes:** `src/lib/api/ai/ai.schemas.ts` — `RecipeSuggestionsResponseSchema` includes `request_id` meant for the API layer but is bundled into the structured-output schema for the model; review schema vs handler merge in `src/routes/api/suggestions/+server.ts`.
- **Owner:** —

### GAP-009

- **Status:** Open
- **Severity:** Minor
- **Source:** [README](../README.md) — _Offline-first_; [ADR-010](../adrs/ADR-010-offline-cache-and-service-worker.md)
- **Observed:** `src/service-worker.js` caches **successful same-origin GET** responses (including navigations and `/api/...` GETs) in `data-cache-*` with **no per-route opt-out or TTL**; `activate` does not call **`clients.claim()`**.
- **Expected:** Shell and documents should support offline use without equating HTTP cache with Dexie; **highly dynamic or sensitive GET** surfaces should be excluded or freshness-bound; optional **immediate control** via `clients.claim()` when UX requires it.
- **Notes:** Only **`/api/share/[token]`** is GET today; risk rises if more GET APIs ship without updating the worker. Versioned cache names still clear old generations on deploy.
- **Owner:** —

### GAP-010

- **Status:** Open
- **Severity:** Major
- **Source:** [README](../README.md) — _Self-hosting as a future path_; [ADR-011](../adrs/ADR-011-self-hosting-provider-model.md)
- **Observed:** (a) AI route handlers in `src/routes/api/suggestions/+server.ts`, `src/routes/api/recipes/+server.ts`, and `src/routes/api/recipes/new/+server.ts` reject any request without `permissions.ai_assistance`, with **no escape path for a validated personal AI provider**; (b) the `OpenAI` client in `src/lib/api/ai/ai.model.ts` and `src/lib/server/openai.ts` is a **singleton** keyed by `OPENAI_API_KEY`, so a per-request or personal-provider override cannot be supplied; (c) `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are read at compile time in Supabase client entry points, so a deployment cannot point at a different Supabase project at runtime; (d) `src/lib/api/cloud/cloud.service.ts` is a Supabase-bound class with no provider-agnostic interface; (e) `src/routes/+layout.server.ts` exposes only `featureFlags.openai` as a single boolean — no `aiCapabilities` or `cloudCapabilities` set; (f) `src/lib/db.ts` header comment claims "By virtue of `ai_assistance` permission requirements, `suggestions` may only be stored for authenticated users," tying suggestion storage to a WFD-managed account.
- **Expected:** AI gating should pair `permissions.ai_assistance` with a validated **personal-provider** path; AI clients should be resolvable per request from managed default or personal config; cloud URL/publishable key should be resolvable at runtime; cloud database operations should be expressible against a capability matrix; `featureFlags` should expose AI/cloud capability sets; suggestion storage should follow [ADR-003](../adrs/ADR-003-ai-suggestion-lifecycle.md) regardless of WFD account state.
- **Notes:** Pre-implementation drift: nothing currently advertises personal-provider support to users, but several seams already foreclose it. Remediation likely starts by factoring the `OpenAI` client behind a server-side resolver and widening `featureFlags`, then revisiting AI route gating. See [ADR-011](../adrs/ADR-011-self-hosting-provider-model.md) § Alignment gaps for the per-row breakdown.
- **Owner:** —

### GAP-016

- **Status:** Open
- **Severity:** Major
- **Source:** [README](../README.md) env sample; [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md) public env examples; [`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc); maintainer confirmation (distinct Supabase-issued keys, multiple official examples).
- **Observed:**
  - **Historical:** `PUBLIC_SUPABASE_PUBLISHABLE_KEY` was used in [`src/routes/+layout.ts`](../src/routes/+layout.ts), while `PUBLIC_SUPABASE_ANON_KEY` was used in [`src/hooks.server.ts`](../src/hooks.server.ts), [`src/lib/supabaseClient.ts`](../src/lib/supabaseClient.ts), `src/lib/db/remote.ts` (since **removed**; recipe cloud I/O lives under [`src/lib/api/cloud/`](../src/lib/api/cloud/)), and [`src/lib/api/common/common.model.ts`](../src/lib/api/common/common.model.ts).
  - **Current source direction:** production Supabase client entry points now read **`PUBLIC_SUPABASE_PUBLISHABLE_KEY`**. [`src/routes/+layout.server.ts`](../src/routes/+layout.server.ts) supplies validated `session` / `user` from `locals.safeGetSession`, and [`src/routes/+layout.ts`](../src/routes/+layout.ts) avoids duplicate server-side auth reads while retaining the Supabase SvelteKit SSR/client pattern needed by UI consumers.
  - The [README](../README.md) env section now documents **`PUBLIC_SUPABASE_PUBLISHABLE_KEY`**.
  - The split traced to **different Supabase-supplied examples** applied in different parts of the app, not a single deliberate key strategy.
  - **Product reality:** both keys were **distinct** credentials available from the Supabase project (not two names for one pasted string). The **`anon`-key env var was a legacy / obsolete carry-over** relative to Supabase’s current **preferred publishable-key** guidance.
- **Expected:**
  - **Documentation:** README (and any `.env.example` / host docs) state the publishable key expected by the app.
  - **Single preferred direction:** new work and eventual refactors align with Supabase’s **current preferred** public key (`PUBLIC_SUPABASE_PUBLISHABLE_KEY` path).
  - **Acceptance gate (mandatory):** browser-verified flows pass after the key migration (e.g. sign-in / session refresh, layout-driven auth, cloud sync, share-by-token, and any path using `locals.supabase`). Automated tests alone are insufficient for this gap’s closure if they do not cover those behaviors.
- **Notes:** Pairs with **GAP-017** (unified client surface). Implementation inventory: [Deferred — Supabase consolidation audit](#supabase-consolidation-audit-2026-05-10). **2026-05-12 update:** production source and ADR-006 examples now use `PUBLIC_SUPABASE_PUBLISHABLE_KEY`; keep this gap open until the browser acceptance checklist is completed against the deployed Supabase project. **2026-05-14 update:** `src/lib/db/remote.ts` was removed; cloud recipe access is consolidated under [`src/lib/api/cloud/`](../src/lib/api/cloud/).

### GAP-017

- **Status:** Open
- **Severity:** Major
- **Source:** [ADR-004](../adrs/ADR-004-account-and-cloud-enhancement-model.md) (service boundaries); [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md); [`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc); **GAP-016** (dual-key drift).
- **Observed:** Supabase JS clients are still created in **multiple disconnected ways** (`@supabase/ssr` in `hooks.server.ts` and `+layout.ts`, plain `createClient` in `supabaseClient.ts`, unused `common.model.ts`). The legacy anon-key split and standalone `src/lib/db/remote.ts` factory have been **removed** from production source (cloud recipe paths use [`src/lib/api/cloud/`](../src/lib/api/cloud/) with an injected `SupabaseClient`). There is still no single documented module or interface that answers “which factory for authenticated SSR vs universal layout vs anonymous server handler,” so the codebase can still perpetuate example-driven client creation.
- **Expected:** A **planned** (then implemented) unified approach: e.g. one small internal API—factories or adapters that take explicit configuration, document session vs sessionless usage, and route all new code through it; `CloudService` / `AccountService` continue to receive an injected `SupabaseClient` built from that layer.
- **Notes:** **No production refactor until** GAP-016 documentation + browser verification strategy is agreed. Overlaps items (2)–(3) in [Deferred — Supabase consolidation audit](#supabase-consolidation-audit-2026-05-10).

### GAP-019

- **Status:** Open
- **Severity:** Major
- **Source:** Proposed [ADR-015](../adrs/ADR-015-progressive-enhancement-and-no-js-baseline.md) § Decision 3 (progressive enhancement for shell navigation); [ADR-014](../adrs/ADR-014-semantic-html-and-accessibility.md) § Decision 2 (equivalent paths to destinations).
- **Observed:** Root [`+layout.svelte`](../src/routes/+layout.svelte) renders **no markup** in the `mobile--collapsed` branch (between expanded overlay and desktop layouts). The `Viewport` helper defaults **`#width` to `0`**, which sets **device = mobile** and **nav = collapsed**, so the initial layout state is **`mobile--collapsed`** until `svelte:window` binds a real `innerWidth`. That means **SSR and first paint** can ship **without** the sidebar anchor set (`/`, `/recipes`, preferences, auth links) that exists in expanded or desktop-minimized modes.
- **Expected:** Primary app routes remain reachable via **real `<a href>`** (or equivalent) in the **first** HTML for typical mobile viewports—ADR-015 still prefers **href-based shell navigation** even though **Dexie** requires JS for recipe data.
- **Notes:** Desktop-minimized already exposes `Button href` targets; fix is likely “always render a minimal `<nav>` strip for mobile collapsed” or “SSR default to expanded / desktop until `innerWidth` is known.” ADR-015 does **not** relax this shell concern: it separates **JS+Dexie for data** from **semantic / resilient navigation**.
- **Owner:** —

### GAP-020

- **Status:** Open
- **Severity:** Major
- **Source:** Proposed [ADR-015](../adrs/ADR-015-progressive-enhancement-and-no-js-baseline.md) § Decision 5 (honest degradation); [ADR-001](../adrs/ADR-001-product-operating-model.md) capability matrix (local recipe book); [ADR-002](../adrs/ADR-002-local-data-ownership.md) (Dexie as system of record).
- **Observed:** [`createLiveQueryStore`](../src/lib/stores/_utils.ts) initializes `{ loading: true }` and only resolves after **browser** `liveQuery` runs. Pages such as [`recipes/+page.svelte`](../src/routes/recipes/+page.svelte), [`recipes/[...id]/+page.svelte`](../src/routes/recipes/[...id]/+page.svelte), [`recommendations/+page.svelte`](../src/routes/recommendations/+page.svelte), and [`recipes/trash/+page.svelte`](../src/routes/recipes/trash/+page.svelte) gate content on `$…Store.loading` / `data` without a **no-JavaScript** and **no-IndexedDB** explanation. Without JS, users see **indefinite loading** or empty shells—not the “honest degraded state” ADR-015 describes for JS-dependent features.
- **Expected:** Static copy in `<main>` (and/or `<noscript>`) explaining that **local recipes require JavaScript and IndexedDB (Dexie)**, plus links to surfaces that **do** work without JS where applicable; optional SSR snapshots only if product invests in them. ADR-015 now **formalizes** the Dexie+JS requirement—this gap is **UX honesty**, not a mandate to remove Dexie or SSR the recipe book.
- **Notes:** Policy tension resolved in ADR-015 rewrite (2026-05-11): **Dexie requires JS**; remaining work is **messaging** and avoiding infinite spinners.
- **Owner:** —

### GAP-021

- **Status:** Open
- **Severity:** Minor
- **Source:** Proposed [ADR-015](../adrs/ADR-015-progressive-enhancement-and-no-js-baseline.md) § Decision 3 (progressive enhancement for forms where helpful).
- **Observed:** Home [`+page.svelte`](../src/routes/+page.svelte) AI prompt uses `onsubmit={getSuggestions}` with **`preventDefault`** and **`goto`** to `/suggestions?prompt=…` instead of a native **`GET` form** (`action="/suggestions"` + `name="prompt"`). The page still exposes static **`Button` links** to `/suggestions`, `/recommendations`, and `/recipes`, so navigation is not fully gated—only the **prompt submission path** is JS-only.
- **Expected:** Prefer `method="get"` / `action` navigation for the prompt where possible; keep JS to enhance in-place results if desired.
- **Notes:** Low risk; does not by itself justify revoking ADR-015.
- **Owner:** —

### GAP-022

- **Status:** Open
- **Severity:** Minor
- **Source:** Proposed [ADR-015](../adrs/ADR-015-progressive-enhancement-and-no-js-baseline.md) § Decision 3 (native forms where helpful); [ADR-004](../adrs/ADR-004-account-and-cloud-enhancement-model.md) (session continuity).
- **Observed:** Signed-in users sign out via a **plain `<button onclick={handleSignOut}>`** in [`+layout.svelte`](../src/routes/+layout.svelte) with **no** `method="POST"` form to a SvelteKit **logout action**. Without JavaScript, users cannot end the server session from the shell (contrast [`auth/+page.svelte`](../src/routes/auth/+page.svelte), which already uses **`method="POST"`** + **`action="?/login"`**).
- **Expected:** Add a progressive **`form`** + server **`logout`** action (or documented Kit pattern) so sign-out works without client JS, **or** document sign-out as JS-required and show static guidance when scripts are disabled.
- **Notes:** Severity stays **Minor** because anonymous use is primary and auth is enhancement; still matters for shared-device hygiene.
- **Owner:** —

### GAP-023

- **Status:** Open
- **Severity:** Major
- **Source:** Proposed [ADR-015](../adrs/ADR-015-progressive-enhancement-and-no-js-baseline.md) § Decision 1 (Dexie + JS for local writes) and § Decision 5 (honest degradation); [ADR-002](../adrs/ADR-002-local-data-ownership.md) (local writes).
- **Observed:** [`recipes/new/+page.svelte`](../src/routes/recipes/new/+page.svelte) declares **`method="POST"`** but **`saveRecipe` always calls `event.preventDefault()`** and persists via **`db.recipes.add`** / optional cloud—there is **no** [`+page.server.ts`](../src/routes/recipes/new/+page.server.ts) **form action** for a native submit fallback. Creating a recipe **requires** a running client and IndexedDB.
- **Expected:** **Honest UX:** static or progressive copy that **JavaScript (and Dexie) are required to save** a recipe locally; optionally add a Kit action later only if product wants a server-mediated path—**not** required by ADR-015 as currently written. Misleading `method="POST"` without a real submit path may still warrant a **small** markup fix.
- **Notes:** ADR-015 (2026-05-11) now states **client-side Dexie writes are allowed** as the architecture; this gap tracks **deception / confusion** (form looks progressively enhanced but is not) and **Decision 5** messaging.
- **Owner:** —

### GAP-024

- **Status:** Open
- **Severity:** Minor
- **Source:** [ADR-016](../adrs/ADR-016-frontend-data-flow-and-svelte-dx.md); [`docs/adr-and-rules-todo.md`](./adr-and-rules-todo.md) implementation backlog item
- **Observed:** Several routes still use hand-managed **`ViewState`** (`app.status`), manual store **`$effect` subscriptions**, or **`$effect` + `fetch`** instead of deriving UI from Dexie/TanStack envelopes; no `{#await}` usage; mixed API error parsing (e.g. suggestions page vs `ai.queries.ts` `error()` throw).
- **Expected:** Pages and queries align with ADR-016 layered defaults during the dedicated implementation pass; consistent error field handling for JSON APIs.
- **Notes:** Examples: [`suggestions/+page.svelte`](../src/routes/suggestions/+page.svelte), [`recipes/[...id]/+page.svelte`](../src/routes/recipes/[...id]/+page.svelte), [`recipes/new/+page.svelte`](../src/routes/recipes/new/+page.svelte). ADR-016 documents current direction; this gap tracks **migration**, not missing policy.
- **Owner:** —

---

## Deferred / investigated

Use this section for longer write-ups, spikes, or gaps that need design before a table row is enough.

### Supabase consolidation audit (2026-05-10)

Cross-check of Supabase-related code after env secrets were restored and **GAP-011** scope was clarified (GAP-011 was `agents.md` migration, not Supabase keys; **GAP-011** resolved 2026-05-16).

#### How permissions and “online” interact today

| Mechanism            | Role                                                                                                | Files / notes                                                                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase session** | Identity + JWT for RLS-scoped `SupabaseClient` calls                                                | `hooks.server.ts` (`locals.supabase`, `safeGetSession`), `+layout.ts` (client passed to pages), `auth/+page.server.ts`, `auth/confirm/+server.ts`                                                                                                   |
| **Permission flags** | `ai_assistance` and `cloud_storage` from `user_profiles`, cached in **httpOnly cookie** after login | `AccountService` in `auth/+page.server.ts`; `getSessionPermissions` / `setSessionPermissions` in [`src/lib/utils/session.ts`](../src/lib/utils/session.ts); exposed as `data.permissions` in [`+layout.server.ts`](../src/routes/+layout.server.ts) |
| **Browser “online”** | `navigator.onLine` only — **not** a probe of Supabase reachability                                  | [`src/lib/stores/network.ts`](../src/lib/stores/network.ts); gates sync in [`+layout.svelte`](../src/routes/+layout.svelte) (`runSync` bails if `!network.online`)                                                                                  |
| **AI capability UI** | Combines online + `featureFlags.openai` + session + `aiAssistedRecipe` permission                   | [`src/lib/utils/capabilities.ts`](../src/lib/utils/capabilities.ts) `deriveAICapability` — **no** cloud/Sync capability helper parallel to this                                                                                                     |

**Implication:** A user can be “online” per the browser but still fail cloud calls (DNS, 401, RLS); sync currently surfaces errors via try/catch and `syncStore`, not via a unified “cloud reachable” signal. **Proposed direction:** keep `navigator.onLine` as a cheap gate, optionally add explicit Supabase health or failed-call backoff in `SyncService` / layout, and introduce a **`deriveCloudCapability`**-style helper (session + `cloudSync` + online) if UX needs symmetry with AI.

#### Supabase client entry points (inventory)

| #   | Location                                                                      | Client type                                                                          | Session / cookies                                                                                    | Still used?                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [`src/hooks.server.ts`](../src/hooks.server.ts)                               | `createServerClient` + `PUBLIC_SUPABASE_PUBLISHABLE_KEY`                             | Yes — canonical trusted SSR auth/session path                                                        | **Yes** — key migrated; **GAP-016** remains browser-verification pending                                                                                                                                                                                                                     |
| 2   | [`src/routes/+layout.ts`](../src/routes/+layout.ts)                           | `createBrowserClient` / SSR `createServerClient` + `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes (SSR branch reads cookies from layout data); trusted session/user comes from `+layout.server.ts` | **Yes** — matches publishable-key path; still part of **GAP-017** factory consolidation                                                                                                                                                                                                      |
| 3   | [`src/lib/supabaseClient.ts`](../src/lib/supabaseClient.ts)                   | `createClient` + `PUBLIC_SUPABASE_PUBLISHABLE_KEY`                                   | **No** — singleton                                                                                   | **Yes** — share route only; **GAP-017**                                                                                                                                                                                                                                                      |
| 4   | ~~`src/lib/db/remote.ts`~~ **removed**                                        | Was standalone `createClient` + `PUBLIC_SUPABASE_PUBLISHABLE_KEY`                    | No                                                                                                   | **No** — superseded by [`src/lib/api/cloud/`](../src/lib/api/cloud/) (`CloudService` / `SyncService` with the injected-client pattern in row 6). Example: [`src/routes/api/recipes/[id]/+server.ts`](../src/routes/api/recipes/%5Bid%5D/+server.ts) uses `locals.supabase` + `CloudService`. |
| 5   | [`src/lib/api/common/common.model.ts`](../src/lib/api/common/common.model.ts) | Same as (3)                                                                          | No                                                                                                   | **Unused** — duplicate singleton; remove or fold into a single sessionless public-client module                                                                                                                                                                                              |
| 6   | Injected `SupabaseClient`                                                     | From layout `data` into `CloudService` / `AccountService`                            | Yes                                                                                                  | **Yes** — preferred pattern for user-scoped cloud                                                                                                                                                                                                                                            |

**Remaining discrepancy — multiple factories:** `hooks.server.ts` and `+layout.ts` each construct an SSR Supabase client. That matches `@supabase/ssr` SvelteKit patterns, but still duplicates factory configuration. The key split has been removed by standardizing production clients on `PUBLIC_SUPABASE_PUBLISHABLE_KEY`; longer-term consolidation remains **GAP-017**.

**Proposed consolidation (phased):**

1. **Verify (GAP-016):** Run the **browser acceptance** checklist after the publishable-key migration before closing the gap.
2. **Unified client factory (GAP-017):** Replace ad hoc `createClient` / duplicate SSR setup with one documented internal surface (names TBD) so “legacy anon example” vs “publishable `@supabase/ssr` example” is not reintroduced file-by-file.
3. **Remove dead paths:** `src/lib/db/remote.ts` **removed** (superseded by `src/lib/api/cloud/`). Delete or archive `common.model.ts` export if unused.
4. **Capability matrix in layout data (aligns with GAP-010):** Extend `+layout.server.ts` (or a helper) with explicit `cloudCapabilities` / `syncAllowed` derived from `session` + `cloud_storage` + optional feature flag, mirroring `deriveAICapability`, so pages stop re-deriving policy ad hoc.
5. **Longer term (ADR-004 / ADR-011):** Introduce a narrow interface implemented by `CloudService` for testability and alternate DB providers; keep Supabase types at the adapter edge.

#### Note on `PUBLIC_SUPABASE_PUBLISHABLE_KEY` vs `PUBLIC_SUPABASE_ANON_KEY`

**Maintainer position:** these env vars corresponded to **two different keys** issued by Supabase (not duplicate names for one paste). **`PUBLIC_SUPABASE_ANON_KEY` was obsolete** for forward-looking work; production source now uses **`PUBLIC_SUPABASE_PUBLISHABLE_KEY`**. Full closure still requires **GAP-016** browser verification and **GAP-017** unified client interface work.

### Supabase wiring migration notes (2026-05-12)

Migrating _Supabase Auth, Sharing and Cloud Backup_ from legacy root `agents.md` into [`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc) (worksheet row 10 in [`docs/agents-md-distribution-worksheet.md`](./agents-md-distribution-worksheet.md)) replaced two legacy bullets with a **multi-surface map** aligned to the [Supabase consolidation audit](#supabase-consolidation-audit-2026-05-10). **No new GAP rows.**

| Topic                                                                          | Resolution / where tracked                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Legacy `agents.md` named `supabaseClient.ts` for “authentication at login”** | **Inaccurate for current code.** Password and OTP flows use **`locals.supabase`** in [`src/routes/auth/+page.server.ts`](../src/routes/auth/+page.server.ts) and [`src/routes/auth/confirm/+server.ts`](../src/routes/auth/confirm/+server.ts). [`src/lib/supabaseClient.ts`](../src/lib/supabaseClient.ts) is a standalone `createClient` used on a **narrow** path (e.g. share-by-token server route). |
| **Legacy `agents.md` named only `hooks.server.ts` “for route guards”**         | **Incomplete.** Guards depend on **`safeGetSession`**, `locals.session` / `user` / `permissions`, and layout data — not `locals.supabase` alone. See the rule’s client-surface table and the consolidation audit’s “How permissions and ‘online’ interact today.”                                                                                                                                        |
| **Dual public keys and multiple client factories**                             | The dual-key production source split has been migrated to `PUBLIC_SUPABASE_PUBLISHABLE_KEY`; **GAP-016** remains open for browser verification, and **GAP-017** tracks factory consolidation ([`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc)).                                                                                                  |
| **Sharing / backup vs auth**                                                   | Product scope: [ADR-004](../adrs/ADR-004-account-and-cloud-enhancement-model.md). Implementation: prefer **`CloudService` / `SyncService`** with injected `SupabaseClient` ([`src/lib/api/cloud/README.md`](../src/lib/api/cloud/README.md)).                                                                                                                                                            |
| **`remote.ts` removed**                                                        | Standalone `src/lib/db/remote.ts` (deprecated recipe sync helpers) is **gone**; use `CloudService` / `SyncService` and server `locals.supabase` per [`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc). ADR text: [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md), [ADR-011](../adrs/ADR-011-self-hosting-provider-model.md).             |

### Offline connectivity rule notes (2026-05-11)

Authoring [`.cursor/rules/offline-connectivity-capability.mdc`](../.cursor/rules/offline-connectivity-capability.mdc) did not open new product gaps; it **documents agent/review discipline** against existing drift:

| Topic                                                                                                              | Where tracked                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Offline use undermined by slow loads / timeouts                                                                    | **GAP-001**                                                                                                                                                                                      |
| Dual public Supabase keys and mixed client factories; risk to auth/sync continuity if “fixed” without verification | Dual-key source split migrated to `PUBLIC_SUPABASE_PUBLISHABLE_KEY`; browser verification remains **GAP-016**, factory consolidation remains **GAP-017**; **Supabase consolidation audit** above |
| `navigator.onLine` is not Supabase reachability; sync errors vs “online”                                           | Same audit — **“How permissions and ‘online’ interact today”**                                                                                                                                   |
| Service worker caches broad same-origin GETs; optional immediate tab control                                       | **GAP-009**                                                                                                                                                                                      |

**Naming discrepancy:** [`docs/adr-and-rules-todo.md`](./adr-and-rules-todo.md) listed this work as **Rule: Offline and connectivity user messaging**; the delivered artifact intentionally covers **capability state, implementation, and periodic re-check** in addition to user-facing copy. The todo row was renamed on completion.

### TypeScript and general code-style migration notes (2026-05-11)

Migrating _TypeScript Conventions_, _General Code Style_, and _Accessibility and UX_ from legacy root `agents.md` into [`.cursor/rules/lint-and-code-quality.mdc`](../.cursor/rules/lint-and-code-quality.mdc) (rows 7, 12, 13 in [`docs/agents-md-distribution-worksheet.md`](./agents-md-distribution-worksheet.md)) did not open new product gaps. It **documented agent guidance** and reconciled internal contradictions:

| Topic                                                                                                                                                                                                                                                      | Resolution / where tracked                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Indentation contradiction** in legacy `agents.md` (_General Code Style_: "Use 2-space indentation" vs _TypeScript Conventions_: "Respect indents…")                                                                                                      | **Resolved by deferring to [`.prettierrc`](../.prettierrc) as the source of truth** — [`.cursor/rules/lint-and-code-quality.mdc`](../.cursor/rules/lint-and-code-quality.mdc) points at `.prettierrc` rather than restating values. |
| **JSDoc overlap** between legacy _General Code Style_ and [`.cursor/rules/documentation-conventions.mdc`](../.cursor/rules/documentation-conventions.mdc)                                                                                                  | **No conflict.** `lint-and-code-quality.mdc` defers to `documentation-conventions.mdc` for doc blocks.                                                                                                                              |
| **Accessibility duplication** between legacy `agents.md` _Accessibility and UX_, [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc), and [ADR-014](../adrs/ADR-014-semantic-html-and-accessibility.md) (Accepted) | **A11y stays under ADR-014 and the Svelte rule** (authoritative). Cross-cutting bullets moved into `lint-and-code-quality.mdc`.                                                                                                     |
| **ESLint import-order claim** in legacy `agents.md` vs configured ESLint (`sort-imports` with `ignoreDeclarationSort: true`)                                                                                                                               | **Documented, not auto-enforced.** `lint-and-code-quality.mdc` notes this explicitly. **Not a product gap.**                                                                                                                        |
| **Authority transfer** for [ADR-008 § Implementation compliance](../adrs/ADR-008-schema-led-domain-contracts.md#implementation-compliance-discovered)                                                                                                      | **Resolved:** [`.cursor/rules/schema-and-type-safety.mdc`](../.cursor/rules/schema-and-type-safety.mdc) (**GAP-007**).                                                                                                              |

**No new GAP rows added.** **GAP-011** and **GAP-018** resolved when `agents.md` was retired (2026-05-16).

### Serverless compatibility rule notes (2026-05-11)

Authoring [`.cursor/rules/serverless-compatibility.mdc`](../.cursor/rules/serverless-compatibility.mdc) encodes [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md) for agents; it did **not** change product behavior. Cross-checks:

| Topic                                                                            | Where tracked / notes                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Private OpenAI env naming (`OPENAI_API_KEY` + `$env/static/private`)             | **GAP-003** resolved — ADR-006 _Risks_ / _Notes_ and code/README aligned; [`.cursor/rules/serverless-compatibility.mdc`](../.cursor/rules/serverless-compatibility.mdc) defers to ADR-006                                                                                                                                                                                         |
| **AI-specific** server paths, Responses + Zod, preference injection              | [`.cursor/rules/ai-integration-boundary.mdc`](../.cursor/rules/ai-integration-boundary.mdc) — keep both rules when editing `src/lib/api/ai/**` and API routes                                                                                                                                                                                                                     |
| ADR-006 **Enforcement rules** cited legacy `agents.md` as transitional authority | **Resolved (2026-05-16):** ADR-006 cites [`.cursor/rules/serverless-compatibility.mdc`](../.cursor/rules/serverless-compatibility.mdc) only; `agents.md` retired                                                                                                                                                                                                                  |
| **Netlify** vs edge portability                                                  | **GAP-014** (resolved) — README/rules aligned on adapter vs discipline; [`svelte.config.js`](../svelte.config.js) has `adapter-netlify` with `runtime: 'edge'` commented out                                                                                                                                                                                                      |
| **SvelteKit `experimental.remoteFunctions`**                                     | [`svelte.config.js`](../svelte.config.js) enables it; ADR-006 does not name remote functions explicitly — treat them like other **server entrypoints** under ADR-006 (same secret and portability bar). [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) already points contributors at remote-functions docs with a deployment caveat |

---

## Resolved

Move **Fixed** items here with a one-line **Resolution** (and optional PR link) so the doc stays a useful history.

| ID          | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAP-008** | Shared deterministic bucketing in [`src/lib/recommendations/recommendations.ts`](../src/lib/recommendations/recommendations.ts) (filter `is_current` + `!deleted_at`, **last** checkout for stale tiers, mutually exclusive 2–6 month vs 6+ month buckets, non-mutating sort for “all time” popularity, ISO-safe `toMillis`). [`src/routes/recommendations/+page.svelte`](../src/routes/recommendations/+page.svelte) uses `unsortedRecipesStore` + that module only; unused `recommendedRecipes` store file under `src/lib/stores/` removed. Vitest: [`src/lib/recommendations/recommendations.test.ts`](../src/lib/recommendations/recommendations.test.ts). ADR-009 alignment table updated.                                                                                                   |
| **GAP-007** | **Policy / agent guidance closed:** [`.cursor/rules/schema-and-type-safety.mdc`](../.cursor/rules/schema-and-type-safety.mdc) encodes ADR-008 (Zod source of truth, `z.infer`, `src/lib/api/**` layout, `$lib/types` for cross-cutting generics only, `.svelte` not for shared domain types, `.strict()` on new/revised API object schemas, `safeParse` at boundaries). **Residual implementation** (deprecated duplicate imports from `src/lib/types.ts`, `PromptRequest` without Zod, incremental `.strict()` on existing schemas, overlap with **GAP-006** on some AI paths) is deferred to a dedicated code refactor; [ADR-008 § Implementation compliance](../adrs/ADR-008-schema-led-domain-contracts.md#implementation-compliance-discovered) remains the checklist until that work lands. |
| **GAP-004** | README _Technology Stack_, legacy `agents.md` (since retired), [`adrs/ADR-007-ai-provider-contract.md`](../adrs/ADR-007-ai-provider-contract.md) (including a **Legacy Chat Completions inventory** table), [`adrs/INDEX.md`](../adrs/INDEX.md), [`adrs/ADR-011-self-hosting-provider-model.md`](../adrs/ADR-011-self-hosting-provider-model.md), [`docs/adr-and-rules-todo.md`](./adr-and-rules-todo.md), and [`adrs/ADR-008-schema-led-domain-contracts.md`](../adrs/ADR-008-schema-led-domain-contracts.md) now treat **Chat Completions as deprecated** and document the **Responses API + Zod structured output** as preferred. Production call sites were not changed.                                                                                                                      |
| **GAP-013** | Legacy `agents.md` (since retired) matched [ADR-008](../adrs/ADR-008-schema-led-domain-contracts.md) and [`src/lib/api/README.md`](../src/lib/api/README.md): API contracts are organized by **domain folder** with `*.schemas.ts`, `*.types.ts`, `*.model.ts`, `*.service.ts`, and a domain `index.ts` barrel. ADR-008 no longer depends on `agents.md` as the source for strict schema guidance.                                                                                                                                                                                                                                                                                                                                                                                                |
| **GAP-012** | [`src/lib/db.ts`](../src/lib/db.ts) is the canonical Dexie application database; [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc) and migration docs define `src/lib/db/` as a helper directory only. No production code referenced `$lib/db/local`; the unused `src/lib/db/local.ts` duplicate Dexie root was removed.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **GAP-014** | Legacy `agents.md` serverless line (since retired), [`.cursor/rules/svelte-mcp-workflow.mdc`](../.cursor/rules/svelte-mcp-workflow.mdc), and [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) now align with [`svelte.config.js`](../svelte.config.js) and [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md): **Netlify** is the configured adapter; other runtimes are a portability discipline.                                                                                                                                                                                                                                                                                                                                           |
| **GAP-015** | [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) documents **`$effect`** as a legitimate rune for true side effects, with **prefer `$derived`** for pure derivations when that does not harm clarity or performance (see migration note in [`docs/adr-and-rules-todo.md`](./adr-and-rules-todo.md)).                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **GAP-003** | Private OpenAI secret renamed to **`OPENAI_API_KEY`** (loaded only via `$env/static/private` in `src/lib/api/ai/ai.model.ts`, `src/lib/server/openai.ts`, `src/lib/openai/index.ts`, and boolean gating in `src/routes/+layout.server.ts`). [ADR-006](../adrs/ADR-006-serverless-and-secret-boundary.md) _Risks_ / _Notes_ and [ADR-011](../adrs/ADR-011-self-hosting-provider-model.md) citations updated; README / `.env` / deployment docs already aligned.                                                                                                                                                                                                                                                                                                                                    |
| **GAP-011** | Root `agents.md` **retired** (2026-05-16); agent guidance lives in [`.cursor/rules/`](../.cursor/rules/) (see [`.cursor/rules/index.md`](../.cursor/rules/index.md)), Accepted ADRs, and topic docs such as [`docs/tanstack-query.md`](./tanstack-query.md). Audit: [`docs/agents-md-distribution-worksheet.md`](./agents-md-distribution-worksheet.md).                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **GAP-018** | [ADR-001](../adrs/ADR-001-product-operating-model.md) and [ADR-010](../adrs/ADR-010-offline-cache-and-service-worker.md) enforcement sections cite current offline-first Cursor rules; `agents.md` removed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
