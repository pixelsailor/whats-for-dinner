# Plan — issue-46-recipe-chat-updates

Source: [pixelsailor/whats-for-dinner#46](https://github.com/pixelsailor/whats-for-dinner/issues/46) — "Restore capability to update recipe from chat response".

## Objective restatement

On the recipe detail page, the Saim chatbot can propose a recipe change from chat; the user confirms it with Apply, it becomes unsaved working state with one-level undo, nothing is persisted until an explicit Save, navigation away from unsaved edits is guarded, and every AI request carries the user's preferences.

## Risk and phase strategy

- **Manifest tier:** `large` (AI provider boundary, schema contracts, local persistence, navigation guards).
- **Phases:** 3 (server contract → client draft model → detail page UI). Each phase is one PR-sized slice and one Builder/Tester pass.
- **Skipped stages:** none.
- **Change budget:** detail page route, the Saim action and AI service, one new pure domain model file, and their tests. No changes to the edit page's behavior, the layout's Ask Saim button, or sync internals.

## Scope boundary

### In scope

- Saim (`askSaimAction` / `askCookingQuestion`) returns an optional recipe proposal with an explicit intent signal.
- Preferences injected into every Saim AI request.
- Detail page (`src/routes/recipes/[...id]/+page.svelte`): Apply/Dismiss card in the chat, working copy and one-level undo toast, Save button when dirty, in-app navigation dialog, `beforeunload` guard while dirty.
- Pure draft-state model for working copy, undo snapshot, proposal, and dirty flag.
- Removing the preferences drift entry in `docs/readme-adr-alignment-gaps.md` once implemented.

### Out of scope

- Edit page Saim behavior (`src/routes/recipes/[...id]/edit/+page.svelte`). Using Saim during editing is a known unintended path; resolving it is a separate issue. The shared action may return the new field to that page, which must ignore it.
- Keyword intent detection (`isModificationRequest`) and the legacy `requestRecipeModifications` / `/api/recipes` revision branches. Do not revive.
- New API endpoints for revisions. Use the existing Saim action.
- Multi-level undo, server-side draft persistence, cross-device draft sync.
- Changes to suggestion lifecycle (ADR-003 artifacts) or recommendations (ADR-009).
- Chat Completions migration of `src/lib/server/openai.ts` (separate debt, ADR-007).

## Phases

| Phase | Goal | Done when |
| ----- | ---- | --------- |
| 1 | AI contract: structured recipe proposal, preferences in Saim requests, response parsing | AC-02, AC-03 (server side), AC-08, AC-09, AC-10 pass in UNIT/INTG |
| 2 | Client draft model: working copy, one-level undo, proposal, dirty flag | AC-01, AC-04 (state), AC-05 pass in UNIT |
| 3 | Detail page UI: chat Apply/Dismiss card, Save, undo toast, guards, a11y | AC-01, AC-03, AC-04, AC-06, AC-07, AC-11, AC-12, AC-13 pass in COMP + OFFL smoke |

### Phase 1 — AI contract and Saim action

- **Deliverables:**
  - Extend `RecipeAssistanceOutputSchema` with `update_intent` and a nullable `recipe` (plain shape for `zodTextFormat`).
  - Add `preferences` to `AskSaimFormSchema`; carry it into `askCookingQuestion`'s developer context on every request.
  - Extend `AskSaimActionResultSchema` with `updateIntent` and nullable `recipe`; validate the recipe with `RecipeSchema.safeParse` in the action after structured output.
  - Stop discarding the recipe in `askSaimAction`.
  - Keep 401 / 403 / 400 / 409 / 502 / 503 / 500 envelopes unchanged.
- **Files touched:** see Component/file map rows 1–5.
- **Dependencies:** Open question 1 (preferences source) must be answered before the form field is wired.

### Phase 2 — Client draft model

- **Deliverables:**
  - Pure model with `createDraft`, `applyProposal`, `undo`, `dismissProposal`, `markSaved`, `isDirty`.
  - Unit tests covering apply → undo → apply sequences, dirty after undo-to-saved returns false, Save clears undo.
- **Files touched:** rows 6–7.
- **Dependencies:** Phase 1 types (`RecipeAssistanceOutputSchema`, `AskSaimActionResultSchema`) for the proposal shape.

### Phase 3 — Detail page UI

- **Deliverables:**
  - Render the Saim answer and, when `updateIntent` is `proposed_update` or `needs_confirmation` with a `recipe`, an inline Apply / Dismiss card in the chat.
  - Apply calls `applyProposal`; undo toast via `svelte-sonner` with an Undo action.
  - Save button in the top-right action group only when `isDirty`; calls the existing `syncService.updateRecipeAndSyncLocal` path, then `markSaved`.
  - `beforeNavigate` dialog with exactly two buttons: "Continue without saving" and "Save changes". No cancel.
  - `<svelte:window onbeforeunload>` set only while dirty.
  - Send the working copy (not the saved version) as `recipe` in the Saim form; send `recipeContextChanged=true` when the working copy differs from the snapshot last sent to Saim.
- **Files touched:** rows 8–9.
- **Dependencies:** Phase 2 model; Open question 2 (where Saim renders on the detail page) must be confirmed first.

## Component/file map

| Path | Action | Purpose |
| ---- | ------ | ------- |
| `src/lib/api/ai/ai.schemas.ts` | modify | `RecipeAssistanceOutputSchema` gains `update_intent` + nullable `recipe`; `AskSaimFormSchema` gains `preferences`; `AskSaimActionResultSchema` gains `updateIntent` + nullable `recipe`. Keep `.strict()` on new/changed objects. |
| `src/lib/api/ai/ai.server.service.ts` | modify | `askCookingQuestion` injects preferences into the developer message on every request (not only on conversation creation); instructions updated to describe `update_intent`. |
| `src/lib/api/ai/ai.model.ts` | modify | Add a parser for the structured assistance output that returns `{ answer, updateIntent, recipe }` with `RecipeSchema.safeParse` on the recipe; replace the answer-only use in the action. |
| `src/lib/api/ai/asksaim.action.ts` | modify | Read `preferences` from form data; return `updateIntent` and validated `recipe`; keep failure envelopes. |
| `src/lib/api/ai/asksaim.action.test.ts` | modify | INTG coverage for AC-08, AC-09, AC-10 at the action boundary. |
| `src/lib/api/ai/ai.server.service.test.ts` | modify | UNIT coverage that preferences appear in the developer context on new and existing conversations. |
| `src/lib/api/recipe/recipe-draft.model.ts` | create | Pure draft-state model (working copy, one-level undo snapshot, proposal, dirty flag). No Dexie or Svelte imports. |
| `src/lib/api/recipe/recipe-draft.model.test.ts` | create | UNIT coverage for AC-01, AC-04 (state), AC-05. |
| `src/routes/recipes/[...id]/+page.svelte` | modify | Chat proposal card, Save button, undo toast, navigation dialog, `beforeunload`, working-copy wiring. |
| `src/routes/recipes/[...id]/+page.server.ts` | modify | Only if the `asksaim` form needs preferences passed through from `load` data. Otherwise no change. |
| `docs/readme-adr-alignment-gaps.md` | modify | Close the preferences drift entry for revision/assistance flows (ADR-007 §4) once Phase 1 lands. |

Files **not** to modify: `src/routes/recipes/[...id]/edit/*`, `src/routes/recipes/[...id]/+layout.svelte` (except if Open question 2 requires a prop change, which must be re-planned first), `src/lib/api/cloud/*`, `src/lib/server/openai.ts`, `src/lib/api/ai/ai.model.ts` legacy `isModificationRequest`.

## Interface contracts

Only what the Builder must implement.

### Structured output (sent to `zodTextFormat`)

```ts
// src/lib/api/ai/ai.schemas.ts
export const RecipeAssistanceOutputSchema = z
  .object({
    answer: z.string().describe('Helpful, conversational cooking advice.'),
    update_intent: z
      .enum(['answer', 'proposed_update', 'needs_confirmation'])
      .describe('answer: no recipe change requested. proposed_update: the user asked for a change. needs_confirmation: a change may be wanted but is uncertain.'),
    recipe: RecipeSchema.nullable().describe('Full updated recipe when update_intent is proposed_update or needs_confirmation; otherwise null.')
  })
  .strict();
```

Rules: all properties required (`nullable`, not `optional`). No `.transform()`, `.pipe()`, or heavy `.refine()` on this schema (ADR-007).

### Saim form (client → action)

```ts
export const AskSaimFormSchema = z
  .object({
    conversationId: z.string().regex(/^conv_[A-Za-z0-9_-]+$/).optional(),
    question: z.string().min(1),
    recipe: z.string().min(1),          // JSON of the WORKING copy, validated as SavedRecipeSchema
    recipeContextChanged: z.boolean(),
    preferences: z.string()             // may be empty; never omitted (ADR-007 §4)
  })
  .strict();
```

### Saim action result (action → client)

```ts
export const AskSaimActionResultSchema = z
  .object({
    answer: z.string().min(1),
    conversationId: z.string().regex(/^conv_[A-Za-z0-9_-]+$/),
    updateIntent: z.enum(['answer', 'proposed_update', 'needs_confirmation']),
    recipe: RecipeSchema.nullable()     // present only when updateIntent is not 'answer'
  })
  .strict();
```

Invariants checked in the action: `recipe` is non-null when `updateIntent` ≠ `answer`; `recipe` is null when `updateIntent` = `answer`. A violation returns `fail(502, …)`.

### Draft model

```ts
// src/lib/api/recipe/recipe-draft.model.ts
export type RecipeDraft = {
  saved: SavedRecipe;          // last persisted version (from data.recipe)
  working: SavedRecipe;        // what the page renders
  undo: SavedRecipe | null;    // exactly one previous working snapshot
  proposal: SavedRecipe | null;// pending Apply/Dismiss card
};

export function createDraft(saved: SavedRecipe): RecipeDraft;
export function proposeChange(draft: RecipeDraft, proposed: SavedRecipe): RecipeDraft;
export function applyProposal(draft: RecipeDraft): RecipeDraft;     // working→undo, proposal→working, proposal=null
export function dismissProposal(draft: RecipeDraft): RecipeDraft;   // proposal=null
export function undoLastApply(draft: RecipeDraft): RecipeDraft;     // undo→working, undo=null
export function markSaved(draft: RecipeDraft): RecipeDraft;         // saved=working, undo=null
export function isDirty(draft: RecipeDraft): boolean;               // working differs from saved (content fields)
```

Merge rule when a proposal arrives: the proposed recipe keeps the working copy's `id`, `created_at`, `updated_at`, and `checkout_history` (user-owned fields the model must not rewrite). Implemented inside `proposeChange`; see Open question 3 for whether any other fields are AI-modifiable.

Undo is one level. Applying a new change replaces `undo`. `markSaved` clears `undo` (undo covers unsaved changes only).

### Preferences source

The preferences string comes from the local preferences store (ADR-002 Dexie-owned). The Builder must use the existing store helper and not fetch preferences from the server or add a new endpoint. See Open question 1.

## ADR references

- **ADR-002 (local data ownership):** Working copy, undo snapshot, and proposal are transient UI state held in page memory and never written to Dexie. Only Save writes `SavedRecipe` through the existing path, which keeps saved recipes as durable user data. Preferences stay Dexie-owned and are read from there.
- **ADR-003 (AI suggestion lifecycle):** Saim conversations and proposals are not suggestion artifacts and are not written to `db.suggestions` or `db.prompt_requests`. No change to the suggestion lifecycle is expected; if review disagrees, add a note to ADR-003 rather than change its lifecycle.
- **ADR-007 (AI provider contract):** Saim uses the Responses API with Zod structured output (`zodTextFormat`). No new Chat Completions call sites. Preferences are included in every Saim request, which closes the §4 drift for conversational assistance. Errors map to 503 `OPENAI_DISABLED` and 502 parse failures, and the client shows an honest message without losing unsaved edits.
- **ADR-008 (schema-led contracts):** New and changed objects in the Saim contract use `.strict()`. Boundary parsing uses `safeParse`. Types come from `z.infer`. The draft model imports `SavedRecipe` from `$lib/api/recipe`, not from `$lib/types.ts`.
- **ADR-014 (semantic HTML and accessibility):** The Apply/Dismiss card uses native `button` elements. The navigation dialog manages focus on open and restores it on close, and Escape is not a cancel path. The undo toast action is keyboard reachable. Status text is announced politely but does not move focus.
- **ADR-016 (frontend data flow):** Saved recipe data stays on the Dexie LiveQuery envelope from `data`. Saim is a form action (mutation-like call), not a TanStack query. Page view state is derived with `$derived` from the draft, not copied with `$effect`.
- **ADR-001 / ADR-004 (offline and anonymous):** Viewing, editing the working copy, and Save to Dexie work offline and logged out. Saim is an enhancement; when unavailable, the UI says why (offline, logged out, missing AI permission, or provider failure) and keeps unsaved edits.

## Validation commands

| Step | Owner | Command or check | Pass criteria |
| ---- | ----- | ---------------- | ------------- |
| Lint / types | Builder / Validator | `pnpm run lint`, `pnpm run check` | Zero new errors in touched paths (MG-05) |
| Server unit + integration | Tester | `pnpm run test:unit -- --run --project server` | AC-02, AC-03, AC-08, AC-09, AC-10, AC-05 (model) covered |
| Client component | Tester | `pnpm run test:unit -- --run --project client` | AC-01, AC-03, AC-04, AC-06, AC-07, AC-11, AC-13 covered |
| Full suite | Tester | `pnpm run test` | All green |
| Svelte autofix | Builder | `svelte-autofixer` on `src/routes/recipes/[...id]/+page.svelte` (Svelte MCP, if available) | No issues left, or noted N/A (A11Y-05) |
| Offline / anonymous smoke | Test / Validator | Named manual steps: (a) open a saved recipe offline, edit, Save, reload, confirm persisted; (b) Saim with offline / logged-out / no-permission shows distinct copy; (c) unsaved edits survive a Saim 503 | AC-12 |
| Manual a11y | Human | Keyboard-only pass: Apply/Dismiss, Save, undo toast action, navigation dialog | AC-13 |

## Risks

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| AI returns an invalid or partial recipe | med | med | `RecipeSchema.safeParse` in the action; 502 on mismatch; client never applies an unvalidated proposal |
| AI changes fields the user did not ask about | med | med | Prompt instructs preserving unchanged fields; merge rule keeps id, timestamps, and `checkout_history`; user confirms via Apply |
| Saim renders somewhere other than the detail page's visible drawer (help drawer is commented out on the detail page) | med | high | Open question 2 must be answered before Phase 3 |
| `beforeunload` prompt annoyance after Save failure | low | low | Clear dirty only after `updateRecipeAndSyncLocal` reports success |
| Edit page receives unexpected `recipe` field | low | low | Edit page ignores unknown fields; AC-11 verifies |
| Preferences not available on detail page when offline | low | med | Read from Dexie store; empty string is valid per ADR-007 |
| Structured-output schema rejected by `zodTextFormat` | low | high | Keep plain shape (nullable not optional, no transforms); unit test with the SDK helper |

## Rollback

- **Code:** Revert the task's commit(s). Phase 1 changes are additive to the Saim contract; reverting restores the answer-only action.
- **Data / Dexie:** No schema or migration change. Working copies and undo snapshots are never persisted, so no data cleanup is needed.
- **Config / env:** None.

## Open questions

- [ ] **OQ-1 (preferences source):** Confirm the preferences store helper the detail page should read (ADR-002 Dexie store). Current code does not pass preferences to Saim (`asksaim` reads only `help_input`, `recipe`, `recipe_context_changed`, `conversation_id`). Builder must not invent the helper name.
- [ ] **OQ-2 (Saim rendering on the detail page):** The detail page's help drawer is commented out and the layout's "Ask Saim" button is shared with the edit page. Confirm which component renders the Saim chat for the detail route before Phase 3 (the Apply card must live there).
- [ ] **OQ-3 (AI-modifiable fields):** Confirm whether the AI may change every content field (title, ingredients, steps, tags, metadata) or a subset. The plan assumes all content fields except `id`, timestamps, and `checkout_history`.
- [ ] **OQ-4 (Apply for proposed updates):** The approved plan requires Apply for both `proposed_update` and `needs_confirmation`. Confirm that a clear request (`proposed_update`) should still require Apply, rather than auto-applying with undo.
- [ ] **OQ-5 (undo after Save):** The plan clears the undo snapshot on Save. Confirm.
- [ ] **OQ-6 (preferences on every request):** The plan injects preferences on every Saim request, not only on conversation creation, so mid-conversation preference changes apply. Confirm.
