# ADR-006: Serverless and secret boundary

## Status

**Accepted**

## Date

2026-05-09

## Scope

- **In scope:** Where OpenAI and other privileged server work may run; how secrets and `$env/static/private` (and dynamic private env) may be used; what client-side modules and `.svelte` files must never import; portability expectations for serverless and edge-style runtimes (including Cloudflare Workers/Pages–style constraints).
- **Out of scope:** Detailed OpenAI request/response contracts ([ADR-007](ADR-007-ai-provider-contract.md)), self-hosted AI/database wiring, Zod schema placement (future schema ADR), and Supabase data model beyond “which side of the boundary” the anon client vs any future service role lives on.

## Context

WFD is offline-first and anonymous-first; OpenAI and account-backed cloud features are optional enhancements ([ADR-001](ADR-001-product-operating-model.md), [ADR-004](ADR-004-account-and-cloud-enhancement-model.md)). If API keys, service-role credentials, or server-only modules leak into the browser bundle, we break user trust and hosting portability. SvelteKit already distinguishes server and client graphs, but without an explicit ADR, contributors may colocate shared types with server-only AI clients, add Node-only APIs to code bundled for edge, or import private env from the wrong module.

### Decision pressure (required)

Deployment targets are serverless or edge-capable (see [agents.md](../agents.md): remote functions and handlers should remain compatible with constrained runtimes). Secrets must never be exposed to anonymous clients or shipped in static client JS. The project already routes AI through HTTP handlers; this ADR locks that pattern in as architecture, not accident.

### Supporting context

- **Problem:** Ambiguity about “where OpenAI runs” and where secrets may appear.
- **Options considered:** (1) Client-side AI with a public proxy key — rejected; unacceptable exposure and abuse risk. (2) Long-lived Node servers with filesystem secrets — rejected; mismatched to serverless deployment and project direction. (3) Server-only modules and SvelteKit server surfaces (`+server.ts`, `+page.server.ts`, `hooks.server.ts`, server-only `src/lib/server/*` and carefully isolated `src/lib/api/*` used only from server) with private env — **chosen**.
- **Must stay true:** AI suggestion artifacts stay transient/local per [ADR-003](ADR-003-ai-suggestion-lifecycle.md); optional cloud remains optional per ADR-004.

## Decision

1. **Privileged OpenAI access** runs only on the **server**: SvelteKit `+server.ts` route handlers, `+page.server.ts` / `+layout.server.ts` load functions, `hooks.server.ts`, and modules that are **only** imported from those entry points (or from other server-only modules). The browser calls **same-origin HTTP APIs** (for example under `src/routes/api/**`) or relies on server load data; it does not construct an OpenAI client with a secret key.

2. **Secrets and private environment variables** (`$env/static/private`, `$env/dynamic/private`) may appear **only** in server-side modules as defined above. They must **not** appear in:
   - `.svelte` files (including `+page.svelte`, `+layout.svelte`, and `src/lib/**/*.svelte`),
   - `+page.ts` / `+layout.ts` / `src/routes/**/+layout.ts` client load (universal load that ships to the client),
   - or any module imported by the client bundle for execution (including shared `src/lib/**` files used from components).

3. **Public environment** (`$env/static/public`, `$env/dynamic/public`) may be used in client or server code when the value is intentionally exposed (for example `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`). Never place secrets in `PUBLIC_*` vars.

4. **Supabase privileged work**: The browser and shared client code use the **anon** key with user session (see `hooks.server.ts` and client helpers). **Service role** or other privileged Supabase credentials, if introduced later, belong **only** in server-only modules and must never be imported from client code.

5. **Serverless / portability**: New server code must avoid **Node-only** APIs (`node:fs`, `node:path`, implicit `Buffer` reliance, etc.) **unless** isolated behind a build target that guarantees Node (this project does not assume that for core handlers). Prefer Web APIs and runtime-neutral dependencies. This keeps the door open to Netlify Edge, Cloudflare Workers/Pages, and similar targets alongside the current adapter choice.

### Explicit exclusions (required)

- We are **not** adopting client-side OpenAI calls with a secret key, even via “obfuscation.”
- We are **not** treating `src/lib/api/**` as automatically server-only: only modules that are **never** imported from client code may hold secrets or server-only clients. Barrel files that re-export server implementations alongside types are a **footgun**; prefer importing types from dedicated modules (for example `ai.types`, `ai.schemas`) from the client when possible.
- We are **not** mandating a specific cloud vendor: **Netlify** is the configured SvelteKit adapter today ([`svelte.config.js`](../svelte.config.js)); Cloudflare is a **compatibility discipline**, not a promise that all deploy configs are switched.

## Consequences

### Positive

- Clear review rule: private env and OpenAI clients belong in server graphs only.
- Aligns with offline-first UX: client degrades when APIs are unavailable without needing secrets locally.
- Reduces risk of accidental key exposure via Vite client bundles.

### Negative

- Every new AI or privileged operation needs an API or server load indirection; slightly more boilerplate than a direct client SDK call.
- Developers must think about **import direction** when adding shared `src/lib` code.

### Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Accidental client import of a server module with private env | SvelteKit/Vite should fail the build; code review; avoid barrel exports that mix server implementations with client-imported values. |
| Node-only API in shared code | ESLint / review; [`.cursor/rules/serverless-compatibility.mdc`](../.cursor/rules/serverless-compatibility.mdc) in [.cursor/rules](../.cursor/rules/index.md). |
| Misleading env var names | The project currently uses `VITE_OPENAI_API_KEY` with `$env/static/private` (see **Notes**); treat as technical debt to rename to a non-`VITE_` private name when convenient. |

## Operational impact

- **Deployment:** No change required; documents existing boundary.
- **Debugging:** AI failures are inspected server-side (logs) and as HTTP error responses to the client; keys never appear in browser devtools for OpenAI.
- **Developer workflow:** Add server routes or server loads for new privileged behavior; keep Zod validation at boundaries (handler or server load).

## Examples (optional)

- Server route calling AI: [`src/routes/api/suggestions/+server.ts`](../src/routes/api/suggestions/+server.ts) imports generation helpers from `$lib/api/ai` (server-only import chain).
- Capability flag without exposing key: [`src/routes/+layout.server.ts`](../src/routes/+layout.server.ts) exposes a boolean `openai` derived from whether a private key is configured.
- Client calls API only: [`src/lib/api/ai/ai.queries.ts`](../src/lib/api/ai/ai.queries.ts) uses `fetch` to `/api/...` endpoints—no private env.

## Notes (optional)

- **Environment naming:** `VITE_OPENAI_API_KEY` is loaded via `$env/static/private` and is **not** a `import.meta.env.VITE_*` public embed. The `VITE_` prefix is historical/misleading; prefer a private-only name (for example `OPENAI_API_KEY`) in a future cleanup to avoid implying client exposure.
- **Implementation verification (2026-05-09):** Repository scan showed `$env/static/private` only in `src/lib/api/ai/ai.model.ts`, `src/lib/openai/index.ts`, `src/lib/server/openai.ts`, and `src/routes/+layout.server.ts`. No `node:` core imports under `src/`. Client AI access goes through HTTP handlers. No evidence of service-role Supabase keys in the repo.

## Enforcement rules

- **Cursor / agent rules:** [`.cursor/rules/serverless-compatibility.mdc`](../.cursor/rules/serverless-compatibility.mdc) cites this ADR (server graphs, public vs private env, portability). [`agents.md`](../agents.md) remains a transitional reference until the **Legacy `agents.md` Distribution** work in [`docs/adr-and-rules-todo.md`](../docs/adr-and-rules-todo.md) completes.
- **Code / architecture:** Block PRs that add `$env/static/private` or OpenAI clients to `.svelte` files, `+page.ts`/`+layout.ts` (client), or shared modules imported from those. Flag Node-only APIs in code paths used by `+server.ts` unless the project explicitly documents a Node-only deployment slice.
- **When to revisit:** New deployment adapter (edge vs Node), introduction of Supabase service role, or a first-class **user-provided AI endpoint** model (likely paired with a future provider/self-host ADR).

## Supersession notes

- **When to supersede:** If WFD moves privileged AI or database access to a different trust boundary (for example a dedicated BFF outside SvelteKit), add a successor ADR and mark this **Superseded**.
- **Stable identifiers:** This file remains `ADR-006-serverless-and-secret-boundary.md`.

---

## Orchestrated development

Orchestration is **not required** for authoring this ADR alone.

### Relevant ADRs for implementation

- [ADR-001: Product operating model](ADR-001-product-operating-model.md)
- [ADR-003: AI suggestion lifecycle](ADR-003-ai-suggestion-lifecycle.md)
- [ADR-004: Account and cloud enhancement model](ADR-004-account-and-cloud-enhancement-model.md)

### Planning artifact

- Omit until a phased plan exists for a specific initiative.

### Builder scope boundary

- N/A for this ADR alone; applies when adding AI routes, env vars, or server-only clients.

### Validator expectations

- Verify new secrets and private env imports stay in server-only graphs.
- Verify new server code avoids Node-only APIs unless explicitly out of scope for serverless targets.

### Test role and evidence

- Build succeeds for client bundle (no accidental private env in client). Integration tests against API routes where applicable.

### Alignment gaps

- Record material drift in [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md).

### Merge / workflow gates

- [x] ADR created for serverless/secret backlog item.
- [ ] Known deviations documented when implementation lags this ADR.
- [ ] Validation evidence when behavior changes touch this boundary.
