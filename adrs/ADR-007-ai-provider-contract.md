# ADR-007: AI provider contract

## Status

**Accepted**

## Date

2026-05-09

## Scope

- **In scope:** How WFD talks to an AI provider from the server: supported API surfaces, structured output expectations, preference injection for generation flows, error and availability signaling to the client, and how a future user-configured provider must preserve the same validation and secret boundaries. Relationship to transient suggestion lifecycle ([ADR-003](ADR-003-ai-suggestion-lifecycle.md)) and server-only secrets ([ADR-006](ADR-006-serverless-and-secret-boundary.md)).
- **Out of scope:** Self-hosting deployment UX and configuration storage (see backlog ADR for self-hosting provider model); full Zod-as-source-of-truth policy for all domains (future schema ADR); recommendation engine inputs without AI (future ADR); Supabase permission matrix beyond `ai_assistance` checks.

## Context

WFD treats AI as an optional enhancement ([README](../README.md), [ADR-001](ADR-001-product-operating-model.md)). The product still needs a **stable contract** so contributors know: which server modules may call the provider, what shape responses must take, how user preferences enter prompts, and how the UI should behave when the provider is disabled or unreachable. Without that contract, new routes may skip preference injection, parse JSON without validation, or assume a single OpenAI API family.

### Decision pressure (required)

The codebase has **two parallel integration styles** (deprecated Chat Completions in `$lib/server/openai.ts` versus the preferred Responses API with Zod-structured text in `$lib/api/ai/ai.model.ts`). Documentation and agent guidance should name both, mark Completions as legacy, and steer new work to Responses + Zod. Product text also states preferences should apply to AI recipe work. This ADR keeps README, rules, and implementation aligned intentionally rather than by accident.

### Supporting context

- **Problem:** Ambiguous provider contract invites inconsistent validation, missing preferences, and unclear error semantics.
- **Options considered:** (1) Mandate Chat Completions only — rejected; structured outputs already add value for suggestion and full-recipe paths. (2) Mandate Responses API only — deferred; legacy handlers still use Chat Completions until migrated. (3) Document **both** as transitional, require **Zod-validated structured outputs** for new work and for endpoints that already use them — **chosen**. Chat Completions is **deprecated** for WFD: no new features on that surface; migrate call sites when touching related flows.
- **Must stay true:** Server-only keys and clients ([ADR-006](ADR-006-serverless-and-secret-boundary.md)); suggestions remain transient-local ([ADR-003](ADR-003-ai-suggestion-lifecycle.md)); offline-first degradation when AI is unavailable ([ADR-001](ADR-001-product-operating-model.md)).

## Decision

1. **Provider access** is **server-only**. The browser calls same-origin HTTP APIs (`src/routes/api/**`, server actions). No OpenAI (or alternate provider) client is constructed in `.svelte`, client `+page.ts` loads, or other client bundles.

2. **Accepted API families** (OpenAI SDK today; analogous calls for compatible gateways later):
   - **Responses API** (`responses.create`) with **`zodTextFormat` / structured text**: **preferred** path in [`src/lib/api/ai/ai.model.ts`](../src/lib/api/ai/ai.model.ts), consumed by [`src/routes/api/suggestions/+server.ts`](../src/routes/api/suggestions/+server.ts) and [`src/routes/api/suggestions/recipe/+server.ts`](../src/routes/api/suggestions/recipe/+server.ts), and by [`src/routes/api/recipes/new/+server.ts`](../src/routes/api/recipes/new/+server.ts) where it delegates to `$lib/api/ai`.
   - **Chat Completions** (`chat.completions.create`): **deprecated** legacy path in [`src/lib/server/openai.ts`](../src/lib/server/openai.ts), consumed by [`src/routes/api/recipes/+server.ts`](../src/routes/api/recipes/+server.ts) and [`src/routes/recipes/[...id]/+page.server.ts`](../src/routes/recipes/[...id]/+page.server.ts). **Do not add new call sites.** Migrate to Responses + Zod when changing these flows.

   New AI features must use **Responses + Zod-structured output** unless a technical constraint blocks it; remaining Chat Completions usage is **migration debt** to eliminate, not a pattern to extend.

### Legacy Chat Completions inventory (refactor / removal targets)

| Location | Role |
| -------- | ---- |
| [`src/lib/server/openai.ts`](../src/lib/server/openai.ts) | All `openai.chat.completions.create` usage; central legacy module to retire after call sites migrate. |
| [`src/routes/api/recipes/+server.ts`](../src/routes/api/recipes/+server.ts) | Recipe AI HTTP handlers that call `$lib/server/openai`. |
| [`src/routes/recipes/[...id]/+page.server.ts`](../src/routes/recipes/[...id]/+page.server.ts) | Server actions calling `$lib/server/openai` (revisions, Q&A, etc.). |
| [`src/lib/api/ai/ai.model.ts`](../src/lib/api/ai/ai.model.ts) | Commented-out `chat.completions.create` snippets only — remove when cleaning dead code; **active** AI in this module uses `responses.create`. |

3. **Structured response contract**
   - For Responses-based calls, the Zod schema passed to `zodTextFormat` is the **authoritative** shape for that response; the model output must be treated as invalid if the SDK/schema pipeline fails.
   - **`zodTextFormat` schema shape:** The SDK maps Zod to provider structured-output constraints; **advanced Zod** (notably **`.transform()`**, **`.pipe()`**, and refinements that do not correspond to plain JSON properties) is **not reliably supported**. Schemas used **directly** with `zodTextFormat` should be **standard JSON object trees**—objects, arrays, strings, numbers, booleans, and null where the contract allows—plus **`.describe()`** (and similar field metadata) to guide the model. **Normalization** (coercion, derived fields, merging API-layer fields) belongs in a **separate** Zod parse or helper **after** structured output succeeds, not on the schema object passed into `zodTextFormat`.
   - For **deprecated** Chat Completions JSON-in-message flows, prompts must require **raw JSON only**; the server must **parse** and **validate or reject** before returning success. Current legacy code often uses `JSON.parse` and type assertions — **new code must not add unvalidated parses**; tightening validation on legacy paths is encouraged in the same PR when touching them.

4. **User preferences in prompts**
   - **Recipe idea generation** and **full recipe generation from a suggestion** must include the caller-supplied preferences string in provider instructions (including empty string when none provided).
   - **Revision, conversational assistance, and addendum** flows should include preferences when they can affect dietary or constraint-sensitive output; until implemented, treat absence as **known drift** (record in [`docs/readme-adr-alignment-gaps.md`](../docs/readme-adr-alignment-gaps.md)).

5. **Errors and availability**
   - Missing private API key must map to a **disabled** outcome: throw or translate `OPENAI_DISABLED` / `OPENAI_DISABLED_ERROR` so handlers return **503** (or equivalent) with a stable client-recognizable message/code where already established (e.g. [`src/routes/api/recipes/+server.ts`](../src/routes/api/recipes/+server.ts)).
   - Other provider failures: log server-side; return **5xx** with a safe message; do not leak secrets or raw provider errors to clients.
   - **Retries:** No mandatory automatic retry loop is required today; bounded retries may be added per-route with backoff and idempotency awareness. Client-side TanStack `retry` for general fetches is separate from provider-level retry.

6. **Offline / no-AI behavior**
   - Core recipe book flows must remain usable without AI ([ADR-001](ADR-001-product-operating-model.md)). When AI is disabled or errors, the client shows a clear state and does not assume success payloads.

7. **Future user-configured provider** (personal base URL / key / model): configuration is **server-side only**; the client never receives the key. The same **validation, permission, and HTTP boundary** rules apply. A compatible provider must honor the **JSON shapes** (or structured-output equivalents) expected by the route handlers; unsupported capabilities are rejected explicitly rather than silently mis-parsed.

### Explicit exclusions (required)

- We are **not** standardizing on Chat Completions alone; Responses + structured output is allowed and preferred for new work.
- We are **not** implementing personal AI endpoints or user-supplied keys in this ADR; this document only defines the **contract** they must satisfy later.
- We are **not** requiring client-side AI execution or streaming-specific UX; streaming may be added later behind the same server boundary.

## Consequences

### Positive

- Clear split between legacy and preferred integration paths and a migration direction.
- Explicit preference and validation expectations for reviewers.
- Aligns product “AI as enhancement” with predictable HTTP error behavior.

### Negative

- Deprecated Chat Completions and preferred Responses paths must both be maintained until legacy call sites are migrated off `chat.completions.create`.
- Structured-output schema design must stay in sync with Dexie/UI consumers.

### Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Schema drift between OpenAI output and UI | Co-locate Zod schemas with AI module; use strict parsing at the route boundary when returning JSON. |
| Overly rich Zod on `zodTextFormat` | Keep structured-output schemas JSON-plain + `.describe()`; run transforms in a second parse (see **Structured response contract** § `zodTextFormat` schema shape). |
| Accidental client import of server AI module | Follow ADR-006; avoid barrels that mix server implementations with client imports. |
| Provider outage or rate limits | User-visible errors; optional future retry policy; dedup/throttle for suggestions per ADR-003. |

## Operational impact

- **Cost:** Responses vs Completions and model choice (`gpt-5-nano` / `gpt-5-mini` in `ai.model.ts`, `gpt-4.1-nano` in `server/openai.ts`) affect token billing; changes should be intentional and documented in PRs.
- **Debugging:** Server logs for parse failures and provider errors; compare request action or route when triaging.

## Examples (optional)

- Responses + Zod: `generateRecipeSuggestions` and `generateRecipe` ([`src/routes/api/suggestions/+server.ts`](../src/routes/api/suggestions/+server.ts), [`src/routes/api/suggestions/recipe/+server.ts`](../src/routes/api/suggestions/recipe/+server.ts)); `appendRecipeDetails` from `$lib/api/ai` ([`src/routes/api/recipes/new/+server.ts`](../src/routes/api/recipes/new/+server.ts)).
- Chat Completions (**deprecated**): same route files as in the inventory above via [`src/lib/server/openai.ts`](../src/lib/server/openai.ts) (`getRecipeSuggestions`, `getFullRecipe`, `requestRecipeModifications`, `askCookingQuestion`, and a different `appendRecipeDetails` implementation than `$lib/api/ai`).

## Enforcement rules

- **Cursor / agent rules:** [`.cursor/rules/ai-integration-boundary.mdc`](../.cursor/rules/ai-integration-boundary.mdc) references this ADR alongside ADR-006.
- **Code / architecture:** New AI calls go through server routes or server actions; prefer `$lib/api/ai` structured patterns; include preferences on generation paths; document deviations in [`docs/readme-adr-alignment-gaps.md`](../docs/readme-adr-alignment-gaps.md).
- **When to revisit:** Introduction of streaming, a single merged provider adapter, or first-class self-hosted AI configuration.

## Supersession notes

- **Stable identifier:** ADR-007.
- **Related:** [ADR-006](ADR-006-serverless-and-secret-boundary.md) remains the secret-boundary authority; this ADR specializes **provider behavior and payloads**.

---

## Orchestrated development

Orchestration not required for documenting this ADR; migration of remaining **deprecated** Chat Completions callers is ordinary phased engineering.

### Relevant ADRs for implementation

- [ADR-001](ADR-001-product-operating-model.md) — capability matrix and optional AI.
- [ADR-003](ADR-003-ai-suggestion-lifecycle.md) — transient suggestions and dedup.
- [ADR-006](ADR-006-serverless-and-secret-boundary.md) — server-only secrets and import discipline.

### Alignment gaps

Implementation mismatches discovered while authoring this ADR are recorded in [`docs/readme-adr-alignment-gaps.md`](../docs/readme-adr-alignment-gaps.md) (see GAP-005–GAP-006; **GAP-004** resolved when README and agent docs reflected Responses-first and deprecated Completions).
