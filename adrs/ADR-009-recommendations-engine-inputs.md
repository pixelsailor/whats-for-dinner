# ADR-009: Recommendations engine (local inputs and boundaries)

## Status

**Accepted**

## Date

2026-05-09

## Scope

- **In scope:** Which **local** data may feed **deterministic** recipe recommendations (no model inference), how that differs from **AI-assisted suggestions**, where recommendation logic should run, and which inputs the product expects over time (including alignment with README and [ADR-002](ADR-002-local-data-ownership.md)).
- **Out of scope:** OpenAI prompt contracts, suggestion caching, and promotion to saved recipes ([ADR-003](ADR-003-ai-suggestion-lifecycle.md), [ADR-007](ADR-007-ai-provider-contract.md)); sync and conflict behavior ([ADR-005](ADR-005-sync-and-conflict-resolution.md)); Dexie table design beyond which entities are authoritative for reads ([ADR-002](ADR-002-local-data-ownership.md), [ADR-008](ADR-008-schema-led-domain-contracts.md)).

## Context

The README positions WFD as having a **recommendations** experience distinct from **AI suggestions**: **recommendations** surface recipes from the user’s **saved collection** and **usage history**; **suggestions** are **new** AI-generated ideas subject to a different lifecycle ([ADR-003](ADR-003-ai-suggestion-lifecycle.md)). Without an explicit ADR, implementers may conflate the two surfaces—for example by piping **user preferences** into recommendation ranking when that signal already shaped what became **saved** recipes.

### Decision pressure (required)

The root README previously used the phrase “preferences shape **recommendations**”; that wording was a **semantic error**. **Preferences shape AI suggestions** (and other AI recipe prompts per [ADR-007](ADR-007-ai-provider-contract.md)), not deterministic recommendations over the library. [ADR-002](ADR-002-local-data-ownership.md) still classifies **preferences** as durable local data for the product (including AI); that does **not** mean preferences are inputs to the **recommendations engine**. Implementers need a single record of **what counts as recommendation input**, **where algorithms may run**, and **what is explicitly not** the recommendations engine (so AI work stays server-bounded and suggestions stay transient).

### Supporting context

- **Problem:** Ambiguity between “recommendations” (local, deterministic) and “suggestions” (AI-generated, transient-local cache).
- **Options considered:** (1) **Server-side ranking** using opaque models — rejected for core recommendations; contradicts offline-first and keeps usage history on the wrong side of the network. (2) **AI-only discovery** — rejected; README requires meaningful value without OpenAI. (3) **Client-side, Dexie-backed heuristics** over saved recipes and usage fields — **chosen** for the product’s recommendations experience.
- **Must stay true:** [ADR-001](ADR-001-product-operating-model.md) capability matrix (recipe book and recommendations work without auth/network/Supabase/OpenAI); schema-led shapes for persisted recipes ([ADR-008](ADR-008-schema-led-domain-contracts.md)); no secrets in client components ([ADR-006](ADR-006-serverless-and-secret-boundary.md)).

## Decision

We define the **recommendations engine** as **client-side logic** that ranks, groups, or samples **saved recipes** read from **Dexie** (via `liveQuery` stores or equivalent), using **only** data already available locally.

### Authoritative inputs (non-exhaustive but normative)

The engine **may** use any of the following when present on **`SavedRecipe`** (or future documented extensions validated by Zod):

| Input | Role |
| --- | --- |
| **`checkout_history`** | Usage signal: recency and frequency of “made” / checkouts; supports “popular lately,” rotation, and rediscovery. |
| **`tags`** | Course/meal alignment (e.g. breakfast vs dinner) and user organization; may be combined with **time-of-day meal context** for contextual filtering. |
| **`is_favorite`** | Explicit positive signal for surfacing preferred recipes. |
| **`created_at` / `updated_at`** | Recency of addition or change for “new to you” style buckets. |
| **`last_opened`** | Engagement signal distinct from checkout (e.g. viewed but not necessarily cooked); optional for heuristics that intentionally differ from `checkout_history`. |

### User preferences are **not** recommendation inputs

The recommendations engine **must not** read **user preference** documents (diet, allergies, dislikes, equipment, cuisine, prep time, skill level, etc.) to filter or re-rank saved recipes.

**Rationale:** **Saved recipes** are already an outcome of the user’s constraints and taste: they were added manually or **promoted from AI suggestions** that were generated under [ADR-007](ADR-007-ai-provider-contract.md) with preferences in the prompt. Applying the same preference object again on top of the saved set adds **no intended product signal** and blurs the boundary between **surfacing what you keep** (recommendations) and **proposing what you might add** (suggestions).

**Terminology (normative):**

| Term | Meaning |
| --- | --- |
| **Recommendations** | Deterministic (plus tie-breaking shuffle) surfacing of **`SavedRecipe`** rows using **recipe-local** fields and usage history only. |
| **Suggestions** | AI-generated recipe ideas; preferences and dietary constraints belong **here**, not in recommendation ranking. |

**Meal context** derived from the client clock (e.g. hour → breakfast/lunch/dinner) is an **optional overlay** matched against **recipe `tags`**. It is **not** the same as the **UserPreferences** object used for AI.

### Explicit separation from AI-assisted suggestions

- **Recommendations engine:** Deterministic (or pseudo-random **shuffle among ties** only), **no** calls to OpenAI or other remote models, **no** dependency on Supabase for ranking.
- **AI suggestions:** New recipe ideas and structured outputs governed by [ADR-003](ADR-003-ai-suggestion-lifecycle.md) and [ADR-007](ADR-007-ai-provider-contract.md); may **not** be labeled as “from your collection” unless the user has saved them as recipes.

### Data flow

- **Reads:** `db.recipes` only, through the same local-first patterns as other Dexie stores ([ADR-002](ADR-002-local-data-ownership.md)). Preference rows or account preference payloads are **out of scope** for this engine ([ADR-007](ADR-007-ai-provider-contract.md) for AI consumption).
- **Writes:** The recommendations engine **does not** mutate recipe rows; checkout and favorite updates happen in recipe flows elsewhere.

### Explicit exclusions (required)

- **We are not** requiring a single global scoring function; multiple surfaces (home widgets, full recommendations page) may use different buckets as long as they respect the input boundaries above.
- **We are not** defining cloud-backed “trending” or social recommendation feeds in this ADR.
- **We are not** mandating machine-learning models in the browser for v1.
- **We are not** using TanStack Query or network fetches as **sources of truth** for which saved recipes exist; those are optional for **other** features, not for listing the local collection for recommendations.
- **We are not** applying **UserPreferences** (or equivalent) as filters when computing recommendations; that belongs to **suggestions** and other AI flows.

## Consequences

### Positive

- Clear boundary for reviewers: local heuristics vs AI vs sync; **recommendations** vs **suggestions** terminology stays precise.
- Saved-library UX stays honest: recommendations reflect **what you saved and how you use it**, not a second pass of global dietary rules.
- Keeps recommendations usable **offline** and **anonymous**.

### Negative

- Heuristics require maintenance (thresholds, overlap between buckets, tag hygiene).
- Empty buckets when meal-context filtering is on remain a UX concern (tags vs clock), unrelated to UserPreferences.

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Duplicate or divergent logic in multiple files | Prefer shared helpers under `src/lib/` (e.g. a small `recommendations` module) as the surface grows; document entry points in store/page READMEs. |
| Tags or `checkout_history` missing or inconsistent | Defensive defaults (treat missing history as “never made” only when explicitly intended); validate persisted shapes at boundaries per ADR-008. |

## Operational impact

- **Performance / cost:** Work is in-memory over the user’s recipe set; keep algorithms O(n) or O(n log n) on typical collection sizes.
- **Debugging:** Reproduce with IndexedDB inspection and a fixed clock/meal context where relevant.
- **Developer workflow:** Changing bucket definitions or inputs should update this ADR if **invariants** change.

## Examples (optional)

- A **recommendations route** that shows sections such as favorites, recently added, popular in the last month, and “not made recently,” each sampled with shuffle for variety.
- A **compact home list** that picks a small subset based on `last_opened` and meal tags, with a fallback when tags do not match.

## Compliance

- **Not applicable** beyond alignment with WCAG for whichever UI presents recommendations (accessibility is not unique to this ADR).

## Notes (optional)

- The backlog item referred to this topic as “Recommendations engine inputs”; this ADR names both **inputs** and **separation from AI** so the decision is reviewable as one coherent boundary.
- **2026-05-09 clarification:** Root README formerly said preferences shape “recommendations”; corrected to **suggestions**. This ADR explicitly excludes **UserPreferences** from recommendation ranking—saved recipes are already preference-shaped at save time.

## Enforcement rules

- **Cursor / agent rules:** Future “local data and Dexie ownership” and “offline-first” rules should treat recommendations as **Dexie-read, client-computed** unless an ADR explicitly adds a server component.
- **Code / architecture:** New recommendation features should read **`SavedRecipe`** data from **local** stores only; **do not** fold **UserPreferences** into recommendation ranking; **do not** add OpenAI calls to “recommendations” without a new ADR revisiting this boundary.
- **When to revisit:** If we introduce collaborative filters, server-side ranking, or ML-based recommendations, supersede or narrow this ADR accordingly.

## Supersession notes

- **Stable identifier:** ADR-009.
- **If superseded:** Link the successor and state whether server-side or model-based recommendation is now in scope.

---

## Orchestrated development

orchestration not required for documenting this decision; follow Plan–Build–Validate–Test when implementing **major** changes to recommendation inputs or moving logic across layers.

### Relevant ADRs for implementation

- [ADR-001](ADR-001-product-operating-model.md) — offline / anonymous capability baseline.
- [ADR-002](ADR-002-local-data-ownership.md) — Dexie as home for recipes and preference inputs.
- [ADR-003](ADR-003-ai-suggestion-lifecycle.md) — AI artifacts vs saved recipes.
- [ADR-007](ADR-007-ai-provider-contract.md) — preferences in **AI** prompts and **suggestions**; explicitly **not** inputs to deterministic recommendations over saved recipes.
- [ADR-008](ADR-008-schema-led-domain-contracts.md) — Zod and types for `SavedRecipe` fields used as inputs.

### Alignment gaps (current implementation vs this ADR)

The following gaps were identified when comparing this ADR to the codebase; they are also recorded in [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md) as **GAP-008**.

| Topic | ADR expectation | Observed |
| --- | --- | --- |
| **Single source of recommendation logic** | Prefer shared, testable helpers; avoid incompatible duplicates. | `src/lib/stores/recommendations.ts` exports `recommendedRecipes` but **nothing imports it**; the **route** `src/routes/recommendations/+page.svelte` implements separate categorization. |
| **Consistent recipe sets** | Use the same filters as other recipe surfaces (`is_current`, soft delete) when reading the collection. | `loadRecommendations()` uses `db.recipes.toArray()` without the `is_current` / `deleted_at` filtering applied in `unsortedRecipesStore`. |
| **Schema-aligned types in stores** | Sorting and date math should match `SavedRecipe` field types (ISO datetimes). | `recommendedRecipes` sorts with `b.created_at - a.created_at` and passes `last_opened` into numeric `dayDiff`; `svelte-check` reports type errors on those lines (strings vs arithmetic). |
| **Bucket semantics** | “Not made in 2 months” vs “6 months” should be defined (e.g. based on **last** checkout, mutually exclusive tiers). | Current filters use **any** checkout older than a threshold, so recipes can appear in multiple “stale” buckets and **old** checkouts dominate even if the user cooked recently. |
| **Non-mutation of shared arrays** | Avoid mutating store-backed arrays in place when deriving views. | `categorizeRecipes` calls `recipes.sort(...)` on the **live** recipe list for “most popular all time,” which mutates the derived array in place. |

### Planning artifact

- Omit until a scoped refactor plan exists.

### Builder scope boundary

- Omit.

### Validator expectations

- Verify new work against the **inputs table** and **AI separation** above; record any intentional deviation in [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md).

### Test role and evidence

- When adding shared recommendation helpers, prefer **unit tests** for bucketing edge cases (empty history, single checkout, non-current rows excluded).

### Merge / workflow gates

- [x] ADR created for durable recommendation/input boundary.
- [x] Known deviations documented as alignment gaps.
- [ ] Validation checklist for recommendation behavior (optional until orchestration template exists).
