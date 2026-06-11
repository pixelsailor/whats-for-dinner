# Plan — recipe-import-dom-flow

## Objective restatement

URL recipe import from the New Recipe dialog validates the URL, server-fetches the page, DOMPurify-sanitizes the document body for AI input (with JSON-LD retained as primary when present), extracts a `Recipe` via `importRecipeFromURL`, and the client persists through existing `persistRecipe` with normal cloud-sync error toasts; all failures surface as Toast messages in the import dialog.

## Risk and phase strategy

- **Manifest tier:** `medium` — AI boundary (ADR-007), server fetch (ADR-017), DOMPurify server runtime (ADR-006), Dexie persistence unchanged (ADR-002).
- **Phase count:** **2** — Phase 1 isolates server sanitize + preparation (testable without AI); Phase 2 wires AI input, client cleanup, integration tests, and docs.
- **Skipped stages:** None (full pipeline: planner → builder → tester → validator).
- **Change budget:** ~8–12 production files; 1 new server dependency (`isomorphic-dompurify`; `jsdom` as transitive/peer per package docs). No ADR amendment — server-fetch pipeline preserved per ADR-017.
- **Preparation strategy (frozen):** **Combine JSON-LD primary + DOMPurify supplemental** — do **not** replace JSON-LD extraction. Replace the current regex `htmlToText` supplemental path with DOMPurify-sanitized `body.innerHTML`; use derived plain `bodyText` (from the parsed DOM) only for `hasRecipeSignal` heuristics and logging. This satisfies the human clarification (sanitized DOM body for AI) without regressing ADR-017 priority-1 JSON-LD.

## Scope boundary

### In scope

- New server-only sanitize module under `src/lib/api/recipe-import/` using **DOMPurify on the server** (`isomorphic-dompurify` + JSDOM-backed DOM).
- Integrate sanitize into `prepareImportContent` / `fetchAndPrepareRecipeImport` pipeline.
- Extend `PreparedImportContent` with explicit **sanitized body content** field; update `importRecipeFromURL` model input and extraction prompt labels accordingly.
- Keep `POST /api/import/url` request body **`{ url: string }`** — client sends URL only; server owns fetch + sanitize.
- Remove client prototype `src/routes/recipes/new/fetchDomBodyContent.ts` (logic relocated server-side).
- Unit tests for sanitize helper and updated prepare tests; integration-style test for route handler input path; test asserting AI service receives sanitized body (mocked provider).
- Update `docs/recipe-import-url/README.md` to document DOMPurify supplemental path.
- Verify existing `+page.svelte` dialog: `canUseAI` gate, `POST /api/import/url`, Toast on all failure paths, `persistRecipe` on success.

### Out of scope

- Client-side fetch of arbitrary recipe URLs.
- ADR-017 amendment or new ADR (server-fetch decision unchanged).
- Headless browser / JS execution on publisher pages.
- `RecipeImportSchema` fork, OCR reuse, paywall bypass.
- Changing `RecipeSchema` required-field policy.
- Injecting user dietary preferences into URL import prompts (ADR-007 / ADR-017: fidelity over preferences).
- Service worker or Cache Storage caching of fetched HTML.
- New UI copy polish beyond mapping server `error` strings to Toast (unless a regression is found).
- E2E Playwright Test suite (not adopted).

## Phases

| Phase | Goal                                              | Done when                                                                                                                        |
| ----- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Server DOMPurify sanitize + preparation pipeline  | Sanitize module exported; `prepareImportContent` uses JSON-LD + sanitized body; types updated; prepare/sanitize unit tests green |
| 2     | AI input, client cleanup, integration tests, docs | `importRecipeFromURL` consumes sanitized body; client prototype removed; route/AI tests green; README updated; lint/check pass   |

### Phase 1 — Server sanitize and preparation

- **Deliverables:**
  - `recipe-import.sanitize.ts` with `sanitizeRecipePageBody(html)` returning `{ sanitizedBodyHtml, bodyText }`.
  - `prepareImportContent` uses JSON-LD for `primaryBlock` and sanitized body for supplemental AI input; `hasRecipeSignal` uses `primaryBlock` + `bodyText`.
  - `PreparedImportContent` type updated (`sanitizedBodyContent` replaces `supplementalText`).
  - `isomorphic-dompurify` added to `package.json` dependencies (server-only import site).
  - Unit tests: `recipe-import.sanitize.test.ts`; update `recipe-import.prepare.test.ts`.
- **Files touched:** See Component/file map (Phase 1 rows).
- **Dependencies:** None.
- **Exit commands:** `pnpm run test:unit -- --run --project server src/lib/api/recipe-import/`, `pnpm run check`, `pnpm run lint`.

### Phase 2 — AI wiring, client cleanup, integration tests, docs

- **Deliverables:**
  - `importRecipeFromURL` prompt/input uses `prepared.sanitizedBodyContent` (sanitized HTML body); `sourceUrl` retained for attribution.
  - Route handler logging fields updated (`sanitizedBodyChars` vs old `supplementalChars`).
  - Delete `fetchDomBodyContent.ts`; confirm `+page.svelte` has no client fetch/sanitize imports.
  - Integration-style route test (mocked fetch/prepare/AI) or focused service orchestration test.
  - AI service input-shape test (mock OpenAI; assert input contains sanitized body block, not URL-only).
  - `docs/recipe-import-url/README.md` checklist item for DOMPurify supplemental path.
- **Files touched:** See Component/file map (Phase 2 rows).
- **Dependencies:** Phase 1 complete.
- **Exit commands:** Full `pnpm run test`, `pnpm run check`, `pnpm run lint`.

## Component/file map

| Path                                                       | Action | Phase | Purpose                                                                                                          |
| ---------------------------------------------------------- | ------ | ----- | ---------------------------------------------------------------------------------------------------------------- |
| `package.json`                                             | modify | 1     | Add `isomorphic-dompurify` (and `jsdom` if required as direct dependency per install docs)                       |
| `pnpm-lock.yaml`                                           | modify | 1     | Lockfile update                                                                                                  |
| `src/lib/api/recipe-import/recipe-import.sanitize.ts`      | create | 1     | DOMPurify + JSDOM: parse HTML, sanitize full document, extract `body.innerHTML` and `body.textContent`           |
| `src/lib/api/recipe-import/recipe-import.sanitize.test.ts` | create | 1     | Unit tests: strips script/style, preserves article markup, empty body handling                                   |
| `src/lib/api/recipe-import/recipe-import.prepare.ts`       | modify | 1     | Call sanitize module; drop `htmlToText` as supplemental source; keep JSON-LD extraction; truncate sanitized body |
| `src/lib/api/recipe-import/recipe-import.prepare.test.ts`  | modify | 1     | Fixtures assert `sanitizedBodyContent`; signal tests use body text                                               |
| `src/lib/api/recipe-import/recipe-import.types.ts`         | modify | 1     | Replace `supplementalText` with `sanitizedBodyContent`; update JSDoc                                             |
| `src/lib/api/recipe-import/recipe-import.service.ts`       | modify | 1     | JSDoc only if signature unchanged (orchestration unchanged)                                                      |
| `src/routes/api/import/url/+server.ts`                     | modify | 2     | Log sanitized body char count; pass updated `PreparedImportContent`                                              |
| `src/lib/api/ai/ai.server.service.ts`                      | modify | 2     | Update `importRecipeFromURL` input template to sanitized body section                                            |
| `src/lib/api/ai/ai.server.service.test.ts`                 | create | 2     | Mock provider; verify input includes primary + sanitized body, not URL-only                                      |
| `src/routes/api/import/url/+server.test.ts`                | create | 2     | INTG: mocked prepare + AI; error/success JSON shapes                                                             |
| `src/routes/recipes/new/fetchDomBodyContent.ts`            | delete | 2     | Remove client-side prototype                                                                                     |
| `src/routes/recipes/new/+page.svelte`                      | modify | 2     | Only if WIP imports client fetch — ensure dialog posts `{ url }` only; Toast paths unchanged                     |
| `docs/recipe-import-url/README.md`                         | modify | 2     | Document DOMPurify supplemental + dependency note                                                                |

**Not modified (verify only):** `src/lib/api/ai/ai.schemas.ts` (`ImportUrlPostBodySchema` stays `{ url }`); `recipe-import.fetch.ts`, `recipe-import.url.ts`, `recipe-import.errors.ts` unless sanitize integration requires import-only re-exports.

## Interface contracts

### DOMPurify sanitize (new)

```typescript
/** Result of server-side HTML sanitization for recipe import. */
export interface SanitizedPageBody {
  /** DOMPurify-sanitized document body innerHTML for model supplemental input. */
  sanitizedBodyHtml: string;
  /** Plain text from sanitized body (for heuristics only, not sent as primary AI block). */
  bodyText: string;
}

/**
 * Parses HTML in a JSDOM window, sanitizes with DOMPurify, returns body fragments.
 * @param html - Raw fetched page HTML (UTF-8, already size-capped by fetch)
 * @returns Sanitized body HTML and text; empty strings when no body element
 * @remarks Server-only — import only from `recipe-import.prepare` or tests.
 */
export function sanitizeRecipePageBody(html: string): SanitizedPageBody;
```

**Sanitize config (frozen):** Use DOMPurify default safe profile; `RETURN_DOM: true` to read `body`. Do not allow script, event handlers, or `javascript:` URLs. No custom tag allowlist expansion beyond defaults unless a fixture proves recipe sites need it (document in build-log if changed).

**Truncation:** Apply existing caps — sanitized body HTML truncated to `SUPPLEMENTAL_TEXT_MAX_CHARS` (64_000) before assignment to `PreparedImportContent` (constant may be renamed to `SANITIZED_BODY_MAX_CHARS` in prepare module only).

### PreparedImportContent (updated)

```typescript
export interface PreparedImportContent {
  sourceUrl: string;
  /** JSON-LD Recipe JSON string or empty when only HTML body is available. */
  primaryBlock: string;
  /** DOMPurify-sanitized document body innerHTML (supplemental AI input). */
  sanitizedBodyContent: string;
  preparationSource: PreparationSource; // unchanged union
}
```

**Migration note for Builder:** Remove `supplementalText` everywhere; grep repo for references before Phase 2 merge.

### Preparation pipeline (unchanged orchestration)

```typescript
export function prepareImportContent(page: FetchedPage): PreparedImportContent;
export async function fetchAndPrepareRecipeImport(
  urlString: string
): Promise<PreparedImportContent>;
```

**Order (ADR-017):** validate URL → fetch → sanitize body + extract JSON-LD → `hasRecipeSignal` → return or throw `RecipeImportError`.

### AI extraction

```typescript
export async function importRecipeFromURL(
  url: string,
  prepared: PreparedImportContent
): Promise<string>;
```

- **`url`:** Attribution only (`prepared.sourceUrl` may be passed; keep parameter for call-site clarity).
- **Model input sections (frozen labels):**
  - `Source URL: …`
  - `--- PRIMARY SOURCE (JSON-LD Recipe; prefer this) ---` → `prepared.primaryBlock`
  - `--- SUPPLEMENTAL BODY (sanitized HTML) ---` → `prepared.sanitizedBodyContent`
- **No user preferences** in instructions (extraction-only, ADR-017 §3).

### HTTP API (unchanged)

- **Route:** `POST /api/import/url`
- **Body:** `ImportUrlPostBodySchema` — `{ url: string }` (strict)
- **Auth:** `permissions.ai_assistance` required → 403 when missing
- **Success:** `{ success: true, data: Recipe }`
- **Failure:** `{ success: false, data: null, error: string }` with status per `RecipeImportError` / AI errors

### Client dialog (`+page.svelte`)

- **Gate:** `canUseAI` before showing Import from URL; Toast when unavailable.
- **Submit:** `POST /api/import/url` with `{ url: recipeUrl }` only — **no** client HTML body in request.
- **Success:** `persistRecipe(result.data)` → navigate to recipe detail.
- **Failure:** `toast.error(result.error ?? 'Failed to import recipe from URL')`; `dialogStatus = 'error'`.

## ADR references

- **ADR-017:** Pipeline order preserved (validate → fetch → prepare → extract → validate). JSON-LD remains priority-1 `primaryBlock`; supplemental input becomes DOMPurify-sanitized body HTML instead of regex `htmlToText`. Model input must include prepared content, not URL alone. No client fetch. No ADR amendment required.
- **ADR-007:** Extraction uses Responses API + `zodTextFormat(RecipeSchema)`; no preference injection on import; Zod validation at route boundary via `parseRecipeDetail`. No new Chat Completions call sites.
- **ADR-006:** Fetch, sanitize, and AI run server-only. `isomorphic-dompurify` imported only from `recipe-import.*` modules never pulled into client graphs. Avoid Node-only APIs outside JSDOM isolate; compatible with Netlify serverless handlers.
- **ADR-008:** `ImportUrlPostBodySchema` unchanged; `PreparedImportContent` remains in `recipe-import.types.ts`; route validates with existing Zod schemas.
- **ADR-001 / ADR-004:** Import is online-only enhancement; `canUseAI` gating must not block local recipe book. Distinct Toast when AI unavailable vs server error.
- **ADR-002 / ADR-003:** Import draft persisted only after explicit user action via `persistRecipe`; no auto-save on API success without client call.
- **ADR-010:** Do not cache fetched HTML in service worker or Cache Storage.
- **ADR-012 §B:** Feature envelope unchanged — optional AI, server fetch, user-promoted draft.

## Validation commands

| Step                    | Owner               | Command or check                                                                        | Pass criteria / AC                                     |
| ----------------------- | ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Lint / types            | Builder / Validator | `pnpm run lint`, `pnpm run check`                                                       | No new errors in touched paths (MG-05)                 |
| Recipe-import unit      | Tester              | `pnpm run test:unit -- --run --project server src/lib/api/recipe-import/`               | AC-03, AC-04, AC-05                                    |
| AI service unit         | Tester              | `pnpm run test:unit -- --run --project server src/lib/api/ai/ai.server.service.test.ts` | AC-06                                                  |
| Route integration       | Tester              | `pnpm run test:unit -- --run --project server src/routes/api/import/url/`               | AC-07                                                  |
| Full suite              | Tester              | `pnpm run test`                                                                         | No regressions                                         |
| AI boundary             | Validator           | Checklist **AI-01**, **AI-02**, **AI-05**                                               | No client DOMPurify fetch; URL-only model input absent |
| Capability / offline    | Validator           | Checklist **OFF-01**, **NET-01**, **NET-04**                                            | Import gated; core recipe book unaffected              |
| Schema                  | Validator           | Checklist **SCH-01**                                                                    | Zod at route boundary preserved                        |
| Manual smoke (optional) | Human               | Import JSON-LD recipe URL while online with AI enabled                                  | AC-01, AC-02                                           |

## Risks

| Risk                                                                        | Likelihood | Impact | Mitigation                                                                             |
| --------------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------- |
| `isomorphic-dompurify` / JSDOM bundle size or cold-start latency on Netlify | med        | med    | Server-only import; single sanitize per request; monitor build; keep HTML size cap     |
| JSDOM parse failures on malformed HTML                                      | low        | med    | Try/catch → empty body → existing `hasRecipeSignal` failure path with user-visible 422 |
| Sanitized HTML tokens exceed model context vs plain text                    | med        | med    | Truncate to 64 KiB; JSON-LD primary stays compact; log char counts not bodies          |
| `htmlToText` removal breaks edge-case signal detection                      | low        | med    | Use `bodyText` from DOM for heuristics; retain fixtures from prepare tests             |
| WIP uncommitted diff conflicts with plan                                    | med        | low    | Builder rebases on plan file map; discard client `fetchDomBodyContent`                 |
| DOMPurify strips recipe microdata needed when JSON-LD absent                | low        | med    | JSON-LD path unchanged; supplemental is fallback; golden HTML fixture in tests         |

## Rollback

- **Code:** Revert the implementation commit(s); restore `supplementalText` + `htmlToText` path and delete sanitize module if needed.
- **Dependencies:** Remove `isomorphic-dompurify` (and direct `jsdom` if added) from `package.json` and regenerate lockfile.
- **Data / Dexie:** No migration — imported recipes already saved remain in Dexie; rollback does not delete user data.
- **Config / env:** None.

## Open questions

- [ ] **`isomorphic-dompurify` vs manual `dompurify` + `jsdom`:** Plan freezes **`isomorphic-dompurify`** as the server entrypoint unless Netlify build proves incompatibility — if so, Builder documents deviation in `build-log.md` and uses `dompurify` + `jsdom` directly with the same `sanitizeRecipePageBody` contract.
- [ ] **Rename `SUPPLEMENTAL_TEXT_MAX_CHARS`:** Optional constant rename for clarity — Builder may rename to `SANITIZED_BODY_MAX_CHARS` in prepare module only; not blocking.
- [ ] **Manual golden URL list:** Human may supply 1–2 production recipe URLs for post-merge manual smoke; not required for automated test pass.
