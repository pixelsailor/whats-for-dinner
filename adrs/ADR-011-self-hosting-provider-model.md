# ADR-011: Self-hosting provider model

## Status

**Proposed**

## Date

2026-05-09

## Scope

- **In scope:** The architectural **service boundaries** WFD must expose so an advanced user can run the product against **user-controlled AI APIs** (e.g. a personal OpenAI-compatible gateway, a self-hosted LLM) and **user-hosted databases** (e.g. their own Supabase project or another Postgres-shaped backend) without requiring WFD-managed accounts. Defines required vs optional vs unsupported provider capabilities, how user-supplied configuration interacts with the existing **anonymous-first** capability matrix ([ADR-001](ADR-001-product-operating-model.md)), the **secret boundary** ([ADR-006](ADR-006-serverless-and-secret-boundary.md)), the **AI provider contract** ([ADR-007](ADR-007-ai-provider-contract.md)), the **account/cloud enhancement model** ([ADR-004](ADR-004-account-and-cloud-enhancement-model.md)), and **sync** semantics ([ADR-005](ADR-005-sync-and-conflict-resolution.md)).
- **Out of scope:** UI for entering personal provider configuration, key-management UX, and migration tooling between providers (delegate to a future implementation ADR or design doc); selecting a specific self-hosted LLM or auth provider; rewriting Supabase RLS policies; replacing the cloud auth model wholesale (this ADR keeps account auth as today’s WFD-managed surface and limits self-hosting to the **AI** and **cloud database** seams).

## Context

The README states that **self-hosting is a future path**: "Support user-configured personal AI APIs and user-hosted database providers so advanced users can run WFD without WFD-managed AI or Supabase accounts." [ADR-004](ADR-004-account-and-cloud-enhancement-model.md) already calls out a **self-hosting compatibility boundary** ("Supabase-specific checks should be treated as current provider implementation details, not immutable product invariants"), and [ADR-007](ADR-007-ai-provider-contract.md) §7 says a user-configured provider must preserve validation and HTTP boundaries. Neither document specifies **which seams** must exist or **how the runtime config** flows through the app.

Without a governing decision, contributors will keep adding Supabase-only checks (table reads in `CloudService`, permission gates in API routes) and OpenAI-only assumptions (singleton client built from one server env var) that quietly close off the self-hosting roadmap item.

### Decision pressure (required)

The current implementation already has shape that **forecloses** self-hosting if not deliberately constrained:

- `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` are **compile-time** public env vars consumed by [`src/lib/supabaseClient.ts`](../src/lib/supabaseClient.ts), [`src/hooks.server.ts`](../src/hooks.server.ts), and [`src/lib/db/remote.ts`](../src/lib/db/remote.ts); there is no runtime way to point at a different cloud database.
- AI server routes ([`src/routes/api/suggestions/+server.ts`](../src/routes/api/suggestions/+server.ts), [`src/routes/api/recipes/+server.ts`](../src/routes/api/recipes/+server.ts), [`src/routes/api/recipes/new/+server.ts`](../src/routes/api/recipes/new/+server.ts)) gate AI access with `permissions.ai_assistance` derived from a Supabase-issued cookie ([`src/lib/utils/session.ts`](../src/lib/utils/session.ts)); a user with their own AI key but no WFD-managed account is currently blocked.
- The AI client in [`src/lib/api/ai/ai.model.ts`](../src/lib/api/ai/ai.model.ts) and [`src/lib/server/openai.ts`](../src/lib/server/openai.ts) is a **singleton** keyed by one server env var (`VITE_OPENAI_API_KEY`); there is no per-request or per-deployment override.
- [`src/lib/api/cloud/cloud.service.ts`](../src/lib/api/cloud/cloud.service.ts) is a Supabase **class**, not a generic interface; sync helpers and route handlers depend on it directly.

We need a binding architectural decision **before** these seams calcify further.

### Supporting context

- **Problem:** "Self-hosting" can mean many things; without scope, every PR will relitigate which provider gets to participate.
- **Options considered:**
  1. **Defer entirely** — rejected; the README already commits to self-hosting as a future path, and ongoing work must not foreclose it.
  2. **Replace Supabase and OpenAI with abstract adapters today** — rejected as premature; we have one provider for each seam and no concrete second implementation, so a generic adapter would be designed without a real second consumer.
  3. **Document the seams that must remain provider-agnostic and the runtime configuration surface that must exist for personal providers, while keeping today's Supabase/OpenAI implementations** — **chosen**. Establishes binding constraints and an opt-in adapter shape without forcing immediate rewrite.
- **Must stay true:** Offline-first and anonymous-first capability matrix ([ADR-001](ADR-001-product-operating-model.md)); server-only secret boundary ([ADR-006](ADR-006-serverless-and-secret-boundary.md)); Zod-validated I/O for AI and persisted data ([ADR-007](ADR-007-ai-provider-contract.md), [ADR-008](ADR-008-schema-led-domain-contracts.md)); cloud and AI remain optional enhancements ([ADR-001](ADR-001-product-operating-model.md), [ADR-004](ADR-004-account-and-cloud-enhancement-model.md)).

## Decision

WFD will support **two independent self-hosting seams** — an **AI provider** seam and a **cloud database** seam — both expressed as **server-side adapters** consumed through stable WFD HTTP routes and Zod-validated payloads. The browser must never call a user-supplied AI or cloud-database endpoint directly.

### 1. Two seams, three roles

We define three orthogonal **roles** that today are bundled together. Self-hosting may replace the **AI** and **cloud database** roles independently; the **identity/auth** role stays WFD-managed for now.

| Role | What it does today | Self-hosting target |
| --- | --- | --- |
| **AI provider** | OpenAI **Responses** calls (preferred, `$lib/api/ai/ai.model.ts`) and deprecated **Chat Completions** calls (legacy, `$lib/server/openai.ts`). | A user-configured **OpenAI-compatible** endpoint (base URL + key, optional model overrides). Must satisfy [ADR-007](ADR-007-ai-provider-contract.md) request and structured-response shapes. |
| **Cloud database** | Supabase Postgres tables (`recipes`, `shared_links`) accessed through `CloudService` and `SyncService`. | A user-hosted Postgres-shaped backend that supports the **same row schemas and operations** WFD already uses. v1 target is **another Supabase project** (BYO project URL/anon key); other Postgres backends are unsupported until they implement the same `CloudService` operations. |
| **Identity / auth** | Supabase Auth via `@supabase/ssr` in `hooks.server.ts`. | **Out of scope** for this ADR. Self-hosting v1 expects users still authenticate against the configured Supabase project (which may be their own). |

### 2. Required vs optional vs unsupported provider capabilities

Each adapter **declares** which capabilities it implements. The UI must degrade for unsupported capabilities the same way it degrades when AI or cloud is disabled today ([ADR-001](ADR-001-product-operating-model.md), [ADR-004](ADR-004-account-and-cloud-enhancement-model.md)).

**AI provider capability matrix**

| Capability | Status | Notes |
| --- | --- | --- |
| Recipe **suggestions** generation (structured array of ideas) | Required | Must accept the suggestion prompt shape and return data validatable against the suggestion schema in `$lib/api/ai`. |
| **Full recipe** generation from suggestion | Required | Must accept preference text and return data validatable against `RecipeSchema`. |
| Recipe **revision** | Optional | Provider may decline; UI degrades to "AI revision unavailable." |
| Recipe **assistance** Q&A | Optional | As above. |
| Recipe metadata **addendum** | Optional | As above. |
| **Vision / OCR** (used by future OCR import in [ADR-012](ADR-012-feature-roadmap-boundaries.md)) | Optional | If unsupported, OCR import falls back to on-device OCR or is hidden. |
| Streaming responses | Unsupported in v1 | Reserved for a successor ADR. |

**Cloud database capability matrix**

| Capability | Status | Notes |
| --- | --- | --- |
| Recipe upsert / fetch / list by owner | Required | Must accept `SavedRecipe`-shaped rows including soft-delete and `checkout_history`. |
| Soft-delete and tombstone propagation | Required | See [ADR-005](ADR-005-sync-and-conflict-resolution.md). Provider must preserve `deleted_at` rows so restore works across devices. |
| Shared-recipe tokens | Optional | If unsupported, sharing UI is disabled; backup/sync still works. |
| Archive table | Optional | If unsupported, archive UI is disabled. |
| Full-text or server-side search | Unsupported in v1 | Search remains client-side over Dexie ([ADR-002](ADR-002-local-data-ownership.md)). |
| AI suggestion storage | Unsupported | Suggestions stay transient-local per [ADR-003](ADR-003-ai-suggestion-lifecycle.md). |

### 3. Configuration source of truth and lifetime

User-supplied provider configuration is **device-local** by default and **never** ships in the client bundle.

- **AI provider config** (base URL, API key, optional model name) is held in **server-only** state per request (e.g. resolved from a per-deployment env var, a per-request header validated server-side, or a future signed configuration cookie). The key **must not** appear in `.svelte`, `+page.ts`, `+layout.ts`, or shared client modules ([ADR-006](ADR-006-serverless-and-secret-boundary.md)).
- **Cloud database config** (Supabase project URL and anon key) may be public per Supabase's own model, but a self-hosted deployment that swaps URL/anon key still does so via deployment env or a server-rendered runtime config. The current compile-time `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` are **acceptable for v1** but are **drift relative to runtime self-hosting** (recorded as a gap below).
- **No telemetry, log, or error response** may include the user's AI key, alternate base URL, or other secret values. Logging may include a stable **provider id** (e.g. `openai-default`, `personal-openai-compat`) for debugging.

### 4. Permission semantics under self-hosting

`permissions.ai_assistance` and `permissions.cloud_storage` ([`src/lib/utils/session.ts`](../src/lib/utils/session.ts)) are checks against **WFD-managed Supabase entitlements**. They were intended as gating for **WFD-paid features**, not as a global "is AI available?" flag.

- A request that arrives with valid **personal AI provider** configuration **must not** be rejected solely because `permissions.ai_assistance` is false. The check should become "is **this request's** AI access allowed?" — true when either WFD-managed permission is granted **or** a validated personal provider config is present.
- A request that uses the **WFD-managed default** AI provider (no personal config) keeps today's behavior: `ai_assistance` permission required.
- The same pattern applies to `cloud_storage`: a session pointed at a user-hosted Supabase project must not require WFD-side `cloud_storage` permission to use that user-hosted backup. WFD-managed cloud features still gate on `cloud_storage`.
- **Anonymous self-hosting:** A user with no WFD account but a personal AI provider must still be able to drive AI suggestion and full-recipe flows. Suggestions remain transient-local ([ADR-003](ADR-003-ai-suggestion-lifecycle.md)); the Dexie comment that ties suggestion storage to authenticated users is **drift** under this ADR (recorded as a gap below).

### 5. Validation and safety boundaries are non-negotiable

Self-hosted providers are still **untrusted output**. Every adapter, including personal AI endpoints, must:

- Pass **Zod validation** at the server boundary on responses ([ADR-007](ADR-007-ai-provider-contract.md), [ADR-008](ADR-008-schema-led-domain-contracts.md)). Schema mismatch fails closed; the route returns a `5xx` with a stable client-recognizable code, not the raw provider error.
- Emit the same **`OPENAI_DISABLED` / 503** semantics when no provider (managed or personal) is reachable. The client must not need to distinguish "WFD AI off" from "personal AI off" to render a degraded state.
- Keep the **same-origin HTTP boundary** between client and provider. The client always calls `src/routes/api/...`; only the server resolves which provider answers it.

### 6. Capability advertisement to the client

[`src/routes/+layout.server.ts`](../src/routes/+layout.server.ts) already exposes a boolean `featureFlags.openai`. Self-hosting expands that surface (without exposing keys) to enable accurate UI degradation:

- `featureFlags.ai`: boolean — any AI provider is available for this session (managed or personal).
- `featureFlags.aiCapabilities`: an enumerated set the client can intersect with the table in §2 (e.g. `{ suggestions, fullRecipe, revision, assistance, addendum, vision }`).
- `featureFlags.cloud`: boolean — cloud backup/sync is available.
- `featureFlags.cloudCapabilities`: enumerated set per the cloud table in §2.

The client must treat **absent** capabilities as feature-off (hide or disable), not as failure.

### Explicit exclusions (required)

- We are **not** building a personal-key entry UI in this ADR. UX, storage location (cookie vs IndexedDB row vs deployment env), and validation are deferred to an implementation ADR or design doc.
- We are **not** allowing the browser to call a user's AI endpoint directly, even when the user pastes their own key. Same-origin server proxy is mandatory ([ADR-006](ADR-006-serverless-and-secret-boundary.md)).
- We are **not** committing to non-OpenAI-compatible AI endpoints (e.g. raw Anthropic, Gemini) in v1. Compatible gateways (LiteLLM, Ollama with OpenAI-compatible mode, Together AI, etc.) are the supported v1 surface; native APIs require a successor ADR.
- We are **not** committing to non-Postgres cloud databases or to local file-based "cloud" alternatives in v1. Sync semantics in [ADR-005](ADR-005-sync-and-conflict-resolution.md) assume a relational backend with the recipe row shape.
- We are **not** replacing Supabase Auth in this ADR. Identity is out of scope; a future ADR may add provider-agnostic auth (OIDC, Authentik, etc.).
- We are **not** treating recommendations as a self-hosting seam: recommendations remain client-only deterministic logic over local Dexie ([ADR-009](ADR-009-recommendations-engine-inputs.md)); personal AI endpoints do not affect them.

## Consequences

### Positive

- New cloud or AI work has a checklist (§2 capability matrix, §4 permission semantics, §5 validation) that prevents accidental Supabase-only or OpenAI-only assumptions from shipping.
- Anonymous + personal-AI usage becomes a documented expectation, not an aspiration.
- Existing implementation does not have to change immediately; only **net-new** code is held to the boundary, and known gaps are tracked.

### Negative

- API route handlers gain a small amount of branching logic (managed vs personal provider, capability checks).
- The `featureFlags` payload grows; client code that reads `featureFlags.openai` directly must migrate to the richer shape over time.
- Two parallel "is AI allowed?" paths exist until permission gating is rewritten: recorded as drift (GAP-010 below) rather than fixed in this ADR.

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Personal-AI key leaks via logs or error response | Stable provider-id logging only; redact request headers carrying keys; review checklist in route handlers; no key in `featureFlags`. |
| OpenAI-compatible gateway returns slightly different JSON shape | Zod `safeParse` at the boundary; failure surfaces as a normal AI error to the client, never as silently corrupt data. |
| User-hosted Supabase has different RLS / column set | Sync planning must surface schema mismatches as plan-level errors ([ADR-005](ADR-005-sync-and-conflict-resolution.md)); document required Postgres schema in a future implementation doc. |
| Capability matrix drifts from real provider behavior | Treat the matrix as authoritative; update this ADR (not silent code) when a capability is added or removed. |

## Operational impact

- **Performance / cost:** Personal AI providers shift cost off WFD; managed default keeps current cost shape. No expected impact on local read paths.
- **Debugging:** Server logs must tag AI calls with the resolved **provider id**; failures should be diagnosable without seeing the user's key. Cloud logs already include `owner_id`; provider-side errors continue to surface as 5xx to the client.
- **Deployment:** Deployment can keep using a single managed provider configuration. Adding a personal-provider seam is additive: server-side resolver, no client redeploy required for the WFD-default path.
- **Developer workflow:** New AI/cloud features must explicitly state their **capability requirement** ("requires `aiCapabilities.fullRecipe`", "requires `cloudCapabilities.sharedTokens`") rather than assuming a single provider answers everything.

## Examples (optional)

- A new "Bulk recipe import" route says it **requires** `aiCapabilities.suggestions` and **optionally** uses `aiCapabilities.vision`; with a personal endpoint that lacks vision, the route falls back to text-only and surfaces a one-line UI note.
- A user runs WFD against their own Supabase project: `featureFlags.cloud = true`, `cloudCapabilities = { recipeUpsert, tombstone }` (no `sharedTokens`); the share button is hidden, but backup and sync continue to work.
- An anonymous user with a personal OpenAI-compatible endpoint pointed at a local model: `permissions.ai_assistance = false`, `featureFlags.ai = true`. AI routes succeed because the personal config is valid; suggestions are stored in Dexie under [ADR-003](ADR-003-ai-suggestion-lifecycle.md) without requiring a WFD account.

## Compliance

- **Not applicable** beyond the existing security hygiene already governed by [ADR-006](ADR-006-serverless-and-secret-boundary.md) (no secrets in client bundles or `.svelte`).

## Notes (optional)

- "Self-hosting" in this ADR specifically means **user-controlled providers**, not "deploy WFD itself somewhere new." WFD's own deploy target is governed by [ADR-006](ADR-006-serverless-and-secret-boundary.md) and [ADR-010](ADR-010-offline-cache-and-service-worker.md).
- "OpenAI-compatible" in §1 and §2 is a deliberate constraint: it lets us reuse the existing `OpenAI` SDK with a custom `baseURL` and key, keeping the validation pipeline in [`src/lib/api/ai/ai.model.ts`](../src/lib/api/ai/ai.model.ts) intact.

## Enforcement rules

- **Cursor / agent rules:** The backlog **Rule: Self-hosting compatibility** in [`docs/adr-and-rules-todo.md`](../docs/adr-and-rules-todo.md) should cite this ADR alongside [ADR-004](ADR-004-account-and-cloud-enhancement-model.md) and [ADR-007](ADR-007-ai-provider-contract.md). The future **Rule: Supabase enhancement boundary** and **Rule: AI integration boundary** should similarly require new code to read capability flags rather than assume a single managed provider.
- **Code / architecture:** New AI/cloud code must (a) call only same-origin server routes from the client, (b) tolerate `featureFlags.ai === false` and `featureFlags.cloud === false`, (c) declare its required capability subset, and (d) avoid reading `permissions.ai_assistance` / `permissions.cloud_storage` as the **sole** signal that AI/cloud is unavailable — pair the permission check with the capability flag once both are wired.
- **When to revisit:** First implementation of a personal AI key flow; introduction of a non-OpenAI-compatible provider; introduction of a non-Supabase cloud backend; replacement of Supabase Auth.

## Supersession notes

- **Stable identifier:** ADR-011.
- **If superseded:** Likely successors include "Personal AI configuration UX," "Provider-agnostic auth," or "Multi-backend cloud sync." Link forward and narrow this ADR's scope rather than overload it.

---

## Orchestrated development

Orchestration **not required** for authoring this ADR. Plan–Build–Validate–Test orchestration **is** required when implementing the first personal-provider flow because it spans the secret boundary, AI route handlers, and the cloud capability surface.

### Relevant ADRs for implementation

- [ADR-001](ADR-001-product-operating-model.md) — capability matrix; offline/anonymous baseline.
- [ADR-002](ADR-002-local-data-ownership.md) — Dexie remains the local home regardless of provider.
- [ADR-003](ADR-003-ai-suggestion-lifecycle.md) — suggestions transient-local even under personal AI.
- [ADR-004](ADR-004-account-and-cloud-enhancement-model.md) — cloud is optional; permissions are scoped to WFD-managed features.
- [ADR-005](ADR-005-sync-and-conflict-resolution.md) — sync semantics any cloud backend must satisfy.
- [ADR-006](ADR-006-serverless-and-secret-boundary.md) — server-only keys; same-origin client/server boundary.
- [ADR-007](ADR-007-ai-provider-contract.md) — request/response and validation contract for AI providers.
- [ADR-008](ADR-008-schema-led-domain-contracts.md) — Zod-validated I/O at every boundary.

### Planning artifact

- Omit until a personal-provider implementation plan exists.

### Builder scope boundary

- Omit; first builder phase is most likely "factor `OpenAI` client construction behind a server-side resolver" without changing call sites.

### Validator expectations

- Verify new code paths honor §2 capability matrix and §4 permission semantics; verify no client bundle imports a personal AI key; verify Zod validation runs on responses regardless of which provider answered.

### Test role and evidence

- Add unit tests for the provider resolver (managed default, personal override, no-provider) once it exists; integration test that an anonymous request with personal config can drive a suggestion flow under [ADR-003](ADR-003-ai-suggestion-lifecycle.md).

### Alignment gaps (current implementation vs this ADR)

The following gaps were identified while authoring this ADR and are recorded in [`docs/readme-adr-alignment-gaps.md`](../docs/readme-adr-alignment-gaps.md) as **GAP-010**.

| Topic | ADR expectation | Observed |
| --- | --- | --- |
| **AI gating uses capability + permission** | A request with valid personal AI config should not be rejected solely on `permissions.ai_assistance`. | [`src/routes/api/suggestions/+server.ts`](../src/routes/api/suggestions/+server.ts), [`src/routes/api/recipes/+server.ts`](../src/routes/api/recipes/+server.ts), and [`src/routes/api/recipes/new/+server.ts`](../src/routes/api/recipes/new/+server.ts) reject when `permissions.ai_assistance` is false; no personal-provider escape hatch exists. |
| **Per-request AI provider resolution** | The `OpenAI` client should be resolvable per request from managed default or personal config. | [`src/lib/api/ai/ai.model.ts`](../src/lib/api/ai/ai.model.ts) and [`src/lib/server/openai.ts`](../src/lib/server/openai.ts) build a singleton client from `VITE_OPENAI_API_KEY` only. |
| **Runtime cloud provider configuration** | Cloud URL/anon key should be resolvable at runtime so a deployment can swap Supabase projects without rebuilding. | [`src/lib/supabaseClient.ts`](../src/lib/supabaseClient.ts) and [`src/hooks.server.ts`](../src/hooks.server.ts) read `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` from `$env/static/public` (compile-time). |
| **Cloud adapter shape** | Cloud database operations should be expressible against the capability matrix in §2, not a Supabase-only class. | [`src/lib/api/cloud/cloud.service.ts`](../src/lib/api/cloud/cloud.service.ts) is a Supabase-bound class with no provider-agnostic interface; the deprecated [`src/lib/db/remote.ts`](../src/lib/db/remote.ts) is similarly Supabase-only. |
| **Capability advertisement to client** | `featureFlags` should expose AI and cloud capability sets, not a single boolean. | [`src/routes/+layout.server.ts`](../src/routes/+layout.server.ts) exposes only `featureFlags.openai` derived from the managed key. |
| **Suggestion storage independent of WFD account** | Suggestions remain transient-local under [ADR-003](ADR-003-ai-suggestion-lifecycle.md); they should not require a WFD-managed account to be cached locally. | [`src/lib/db.ts`](../src/lib/db.ts) header comment claims "By virtue of `ai_assistance` permission requirements, `suggestions` may only be stored for authenticated users." This conflicts with anonymous + personal-AI usage. |

### Merge / workflow gates

- [x] ADR created for self-hosting provider model backlog item.
- [x] Known deviations documented as alignment gaps.
- [ ] Validation evidence when behavior changes touch this boundary.
