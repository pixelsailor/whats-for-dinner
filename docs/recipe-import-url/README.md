# Recipe import from URL

**Authoritative architecture:** [ADR-017: Recipe URL extraction](../../adrs/ADR-017-recipe-url-extraction.md) (**Accepted**).

**Roadmap envelope:** [ADR-012 §B](../../adrs/ADR-012-feature-roadmap-boundaries.md).

## Implementation checklist (phase 1)

1. [x] `src/lib/api/recipe-import/` — fetch, URL safety, JSON-LD parse, HTML-to-text, preparation errors.
2. [x] `src/routes/api/import/url/+server.ts` — orchestrate fetch → prepare → AI → validate.
3. [x] `importRecipeFromURL(url, prepared)` — extraction prompt; page content in model input.
4. [x] Tests — `recipe-import.prepare.test.ts`, `recipe-import.url.test.ts`.
5. [x] [GAP-025](../readme-adr-alignment-gaps.md) closed (2026-05-31).

## API

- `POST /api/import/url` — body `{ "url": "https://…" }`, requires `ai_assistance`.
