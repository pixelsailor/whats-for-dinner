# ADR-017: Recipe URL extraction

## Status

**Accepted**

## Date

2026-05-31

## Scope

- **In scope:** End-to-end contract for importing a recipe from a public HTTP(S) URL: server-side page acquisition, normalization of page content for the model, AI **extraction** (not generation), validation, HTTP API shape, failure modes, logging/privacy, and module boundaries. Applies to [`src/routes/api/import/url/+server.ts`](../src/routes/api/import/url/+server.ts) and server modules under `src/lib/api/recipe-import/` (or equivalent). Shared **extraction prompt and structured-output rules** may be reused later by OCR import ([ADR-012](ADR-012-feature-roadmap-boundaries.md) §C) when raw text is already available.
- **Out of scope:** Client-side fetch of arbitrary recipe URLs (CORS and secret boundary); persisting imported drafts to Dexie or cloud (user promotion follows existing recipe save flows per [ADR-002](ADR-002-local-data-ownership.md)); choosing a specific HTML parser library in this document (implementation detail); headless browser / JavaScript execution on the server; paywall circumvention; legal/licensing review of third-party content.

## Context

[ADR-012](ADR-012-feature-roadmap-boundaries.md) §B defines the **product envelope** for URL recipe import: server fetch, AI extraction, Zod-validated draft, optional AI capability, anonymous-friendly when AI is available. The current implementation calls OpenAI with **only the URL string** in the user message. The model cannot HTTP-fetch that URL; it infers a plausible recipe from the URL slug and training data. Prompt and model changes alone do not fix incorrect ingredients or instructions.

### Decision pressure (required)

URL import is user-visible and must not present **hallucinated** recipes as faithful imports. Without a binding extraction pipeline, every implementation PR will relitigate fetch vs “model browses the URL,” generation vs extraction prompts, and CSR failure handling.

### Supporting context

- **Problem:** Users see correct titles with invented body content; trust in import is broken.
- **Options considered (summary):**
  - **URL-only in the model input** — rejected; no page content reaches the model.
  - **Provider browse / web-search tools** — rejected for v1; behavior is less predictable, harder to timeout and test, and duplicates server fetch responsibility ([ADR-006](ADR-006-serverless-and-secret-boundary.md)).
  - **Client-side fetch of the recipe URL** — rejected; CORS blocks most publisher sites; secrets must not move client-side.
  - **Server fetch + pass normalized text (and prefer embedded structured data) + extraction-only AI** — **chosen**.
- **Must stay true:** AI remains server-only ([ADR-006](ADR-006-serverless-and-secret-boundary.md)); structured output validated at the boundary ([ADR-007](ADR-007-ai-provider-contract.md), [ADR-008](ADR-008-schema-led-domain-contracts.md)); core recipe book works without import when AI is off ([ADR-001](ADR-001-product-operating-model.md)); drafts are not auto-persisted ([ADR-003](ADR-003-ai-suggestion-lifecycle.md) spirit).

## Decision

### 1. Pipeline (mandatory order)

URL import **will** follow this sequence on every request:

1. **Validate URL** — `http`/`https` only; reject missing host, private/link-local targets, and non-http schemes per route policy.
2. **Fetch page** — server-side `fetch` with bounded timeout (default **10 seconds**), size cap, and identifiable `User-Agent`. No headless browser in v1.
3. **Prepare content** — derive `PreparedImportContent` (see §2) from the response body; **fail before AI** when preparation yields no extractable recipe signal.
4. **Extract with AI** — call Responses API with **extraction-only** instructions and `PreparedImportContent` in the **input** (not URL alone). Use `zodTextFormat` with `RecipeSchema` (or a dedicated import schema if field descriptions are split later).
5. **Validate output** — `safeParse` / existing `parseRecipeDetail` at the route boundary; return success only on valid JSON shape.

**We will not** call the extraction model when step 3 fails except for an explicit, documented “unrecoverable parse” path that returns a structured error object—not a fabricated recipe.

### 2. Content preparation

Preparation runs **only on the server** after fetch. Priority:

| Priority | Source                | Notes                                                                                                                                                                                                                                                           |
| -------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **JSON-LD** `Recipe`  | Parse `<script type="application/ld+json">` blocks; accept `@type` `Recipe` or `schema.org/Recipe`, including objects inside `@graph`. Map `recipeIngredient`, `recipeInstructions`, `name`, `description`, `recipeYield`, `prepTime`, `cookTime` when present. |
| 2        | **Visible HTML text** | Strip tags/scripts/styles; retain main article text when heuristics allow; cap length (implementation chooses limit, e.g. 32–80 KiB of text) to stay within model context.                                                                                      |
| 3        | **Failure**           | No recipe signal → stop; return user-visible error (CSR shell, bot block, empty body, non-HTML).                                                                                                                                                                |

**SSR vs CSR:** Preparation uses the **first HTTP response body only**. Single-page apps that render recipe content only after client JavaScript **will often fail** import unless JSON-LD or SSR HTML already contains the recipe. The API **will** surface distinct copy for “page loaded but no recipe found” vs generic provider errors.

**We will not** assume the OpenAI model can “wait for” or execute JavaScript on the page.

### 3. AI extraction contract

- **Role:** Copy/normalize content from `PreparedImportContent` into `RecipeSchema` fields. **Not** author a new recipe from the dish name or URL.
- **Input shape:** Include `sourceUrl`, `primaryBlock` (JSON-LD text or structured summary when found), and `supplementalText` (stripped HTML excerpt) in clearly delimited sections. The URL alone is **insufficient**.
- **Instructions:** Forbid invention, substitution, and “typical” fill-ins for missing steps. Prefer null/empty only where the output schema allows; where `RecipeSchema` requires non-empty strings, preparation must supply enough source text or the route fails before AI.
- **Preferences:** **Do not** inject user dietary/preferences into URL import ([ADR-007](ADR-007-ai-provider-contract.md) generation paths only); fidelity to the publisher wins.
- **Formatting:** Markdown field rules may reuse shared formatting guidance, but extraction instructions **take precedence** over generation-oriented schema `.describe()` text when they conflict.
- **Model:** Responses API + `zodTextFormat` per [ADR-007](ADR-007-ai-provider-contract.md); model id is an implementation choice documented in PRs, not fixed in this ADR.

### 4. HTTP API and permissions

- **Route:** `POST` [`src/routes/api/import/url/+server.ts`](../src/routes/api/import/url/+server.ts).
- **Body:** `{ url: string }` (existing `ImportUrlPostBodySchema`).
- **Auth:** Requires `ai_assistance` permission (existing behavior).
- **Success:** `{ success: true, data: Recipe }` after Zod validation.
- **Failure:** Stable `error` string; distinguish where practical: invalid URL, fetch failed, unsupported page (no recipe), AI disabled, parse/validation failure. Do not return 200 with a guessed recipe.

### 5. Module layout

Server logic **will** live outside the generic AI service where possible:

| Module                                 | Responsibility                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/lib/api/recipe-import/`           | Fetch, URL safety checks, JSON-LD parse, HTML-to-text, `PreparedImportContent`, preparation errors |
| `src/lib/api/ai/ai.server.service.ts`  | `importRecipeFromURL(url, prepared)` — provider call + extraction prompt only                      |
| `src/routes/api/import/url/+server.ts` | Orchestration, permission gate, HTTP mapping                                                       |

**We will not** re-export recipe-import server helpers from client-safe barrels.

### 6. Privacy, logging, and operations

- **Logs:** Use stable feature id `recipe-import-url` ([ADR-012](ADR-012-feature-roadmap-boundaries.md)); log status codes, byte length, preparation outcome, and provider errors—not full URLs in production info logs if avoidable, and **never** log full page bodies or extracted recipe text at default log levels.
- **Caching:** Do not store fetched HTML or drafts in Cache Storage ([ADR-010](ADR-010-offline-cache-and-service-worker.md)).
- **Cost:** One fetch + one structured Responses call per import attempt; no unbounded retries in v1.

### Explicit exclusions (required)

- **We are not** using provider web-browse or URL-fetch tools as the primary import mechanism in v1.
- **We are not** running headless Chrome/Puppeteer/Playwright on the server for import.
- **We are not** scraping behind authentication or bypassing paywalls.
- **We are not** auto-saving imports to Dexie or Supabase; the client promotes the draft explicitly.
- **We are not** changing `RecipeSchema` required-field policy in this ADR; if extraction cannot satisfy required fields, fail closed or add a follow-up import-specific schema ADR.

## Consequences

### Positive

- Implementers have a testable pipeline: fetch → prepare → extract → validate.
- Explains CSR/JSON-LD behavior to support and reviewers.
- Aligns code with [ADR-012](ADR-012-feature-roadmap-boundaries.md) §B and fixes the URL-only anti-pattern.
- OCR server path can reuse preparation + extraction later with a different acquisition step.

### Negative

- Many popular sites with CSR-only bodies will fail until JSON-LD exists in initial HTML or users paste manually.
- Server fetch may be blocked by bot protection; success rate varies by publisher.
- Larger prompts (page excerpts) increase token cost vs URL-only calls.

### Risks and mitigations

| Risk                                              | Mitigation                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Model still hallucinates when source text is thin | Fail preparation when content is below threshold; extraction prompt forbids invention; review golden URLs in tests |
| SSRF via user-supplied URL                        | Allowlist `http`/`https`; block private IPs/hostnames in implementation; cap response size                         |
| Token overflow                                    | Truncate supplemental text; prefer compact JSON-LD block as primary                                                |
| Schema `.describe()` encourages generation        | Tighten import prompt; optional `RecipeImportSchema` fork in a follow-up PR                                        |
| Publisher ToS / robots                            | Document as user-provided URL; no aggressive crawling (single page, one request)                                   |

## Operational impact

- **Performance:** Adds one outbound HTTP request per import (bounded timeout) before AI latency.
- **Cost:** Higher input tokens than URL-only; acceptable for faithful extraction.
- **Debugging:** Log preparation stage (`json_ld` \| `html_text` \| `none`) without logging body; reproduce with saved fixtures in tests only.
- **Deployment:** No new infrastructure; remains compatible with serverless handlers per [ADR-006](ADR-006-serverless-and-secret-boundary.md).

## Examples

- **AllRecipes-style site:** Initial HTML contains JSON-LD `Recipe` → preparation sets `primaryBlock` → model maps ingredients/instructions with minimal paraphrase → route returns validated draft.
- **CSR blog:** HTML is an empty `#app` shell, no JSON-LD → preparation fails → `422` or `502` with message that the site requires browser rendering; no OpenAI call.
- **Current drift (pre-implementation):** `importRecipeFromURL` receives only `The URL is: …` → must be brought into compliance with this ADR ([GAP-025](../docs/readme-adr-alignment-gaps.md)).

## Compliance

- **Not applicable** (no regulatory framework). Respects WFD offline-first and optional-AI product model ([ADR-001](ADR-001-product-operating-model.md)).

## Enforcement rules

- **Cursor / agent rules:** Implementation PRs for URL import must cite **ADR-017** and [ADR-012](ADR-012-feature-roadmap-boundaries.md) §B; update [`.cursor/rules/ai-integration-boundary.mdc`](../.cursor/rules/ai-integration-boundary.mdc) if it lists import behavior.
- **Code / architecture:** Any change to `importRecipeFromURL` or `/api/import/url` must preserve the pipeline in §1; reject PRs that pass URL-only input to the model without preparation.
- **When to revisit:** Headless render support, dedicated `RecipeImportSchema`, or provider tool-based fetch requires a new ADR or explicit scope extension here.

## Supersession notes

- **Stable identifier:** ADR-017.
- **Related:** [ADR-012](ADR-012-feature-roadmap-boundaries.md) §B remains the roadmap envelope; this ADR is the **authoritative extraction design** for URL import.
- **Does not supersede** [ADR-007](ADR-007-ai-provider-contract.md); specializes it for extraction.

---

## Orchestrated development

Orchestration is **recommended** for the implementation tranche (fetch + prepare + wire AI input).

### Relevant ADRs for implementation

- **ADR-012:** Feature envelope, capability flags, anonymous/offline behavior.
- **ADR-007:** Responses + Zod, no client provider, extraction vs generation.
- **ADR-006:** Server-only fetch and AI; Netlify-compatible handlers.
- **ADR-008:** Zod at route boundary; module under `src/lib/api/recipe-import/`.
- **ADR-003:** Draft is transient until user saves.
- **ADR-001 / ADR-004:** Import hidden when AI unavailable; must not block local recipe book.

### Planning artifact

- Plan: `.cursor/orchestrations/recipe-url-extraction/plan.md` (to be created when work starts) or issue link.

### Builder scope boundary (phase 1)

- In scope: `recipe-import` fetch/prepare modules; route orchestration; `importRecipeFromURL(url, prepared)`; tests with fixture HTML/JSON-LD.
- Out of scope: OCR reuse, `RecipeImportSchema` split, headless browser, client UI copy polish beyond error mapping.

### Validator expectations

- Verify pipeline order; no URL-only model input; preparation failure does not return invented recipes; permissions and ADR-006 boundary preserved.

### Tester role and evidence

- Unit tests: JSON-LD extraction, HTML strip, URL validation, truncation, preparation failure.
- Integration-style: route returns error on empty fixture; golden file with JSON-LD returns stable fields.
- Manual: one SSR recipe site and one known CSR site to confirm failure messaging.

### Alignment gaps

- **GAP-025:** Current URL-only AI input — remediate per implementation checklist in [`docs/recipe-import-url/README.md`](../docs/recipe-import-url/README.md).

### Merge / workflow gates

- [x] ADR **Accepted** (2026-05-31).
- [x] GAP-025 closed when pipeline ships (2026-05-31).
- [ ] Validation checklist rows for AI boundary and offline degradation reviewed.
