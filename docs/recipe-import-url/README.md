# Recipe import from URL

**Authoritative architecture:** [ADR-017: Recipe URL extraction](../../adrs/ADR-017-recipe-url-extraction.md) (**Accepted**).

**Roadmap envelope:** [ADR-012 §B](../../adrs/ADR-012-feature-roadmap-boundaries.md).

## Implementation checklist

1. [x] `src/lib/api/recipe-import/` — fetch, URL safety, JSON-LD parse, DOMPurify body sanitization, preparation errors.
2. [x] `src/routes/api/import/url/+server.ts` — orchestrate fetch → prepare → AI → validate.
3. [x] `importRecipeFromURL(url, prepared)` — extraction prompt; page content in model input.
4. [x] Tests — `recipe-import.sanitize.test.ts`, `recipe-import.prepare.test.ts`, `recipe-import.url.test.ts`, `ai.server.service.test.ts`, `+server.test.ts`.
5. [x] [GAP-025](../readme-adr-alignment-gaps.md) closed (2026-05-31).

## Content preparation

| Priority | Source              | Notes                                                                                                                                                                                                                                                        |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | JSON-LD `Recipe`    | Parsed from `<script type="application/ld+json">`; becomes `primaryBlock`.                                                                                                                                                                                   |
| 2        | Sanitized HTML body | Server-only [`isomorphic-dompurify`](https://www.npmjs.com/package/isomorphic-dompurify) via `sanitizeRecipePageBody`; `body.innerHTML` becomes `sanitizedBodyContent` for supplemental AI input. Plain `bodyText` drives `hasRecipeSignal` heuristics only. |
| 3        | Failure             | No recipe signal → 422 before OpenAI.                                                                                                                                                                                                                        |

**Dependency note:** `isomorphic-dompurify` (and transitive `jsdom`) are imported only from `src/lib/api/recipe-import/` server modules — not from client bundles.

## API

- `POST /api/import/url` — body `{ "url": "https://…" }`, requires `ai_assistance`.
- Client sends URL only; server owns fetch, sanitize, and AI extraction.
