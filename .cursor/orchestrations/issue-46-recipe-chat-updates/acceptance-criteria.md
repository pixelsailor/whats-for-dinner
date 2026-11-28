# Acceptance Criteria — issue-46-recipe-chat-updates

Source: [pixelsailor/whats-for-dinner#46](https://github.com/pixelsailor/whats-for-dinner/issues/46). Each criterion is verifiable by Tester or Validator. Map to layers in `test-matrix.md` and commands in `plan.md`.

## Functional

- [ ] AC-01: When Saim returns `update_intent` = `proposed_update` with a recipe, the detail page shows an inline Apply / Dismiss card in the chat. Clicking Apply replaces the page's working copy with the proposed recipe. The Dexie `recipes` row is unchanged until Save.
- [ ] AC-02: When Saim returns `update_intent` = `answer` (general question), the answer is shown and the working copy is unchanged. No Apply card appears.
- [ ] AC-03: When Saim returns `needs_confirmation` with a recipe, the Apply / Dismiss card is shown. Dismiss discards the proposal and leaves the working copy unchanged. Apply applies it as in AC-01.
- [ ] AC-04: The Save button appears in the top-right action group only when the working copy differs from the saved recipe. Save persists through the existing `syncService.updateRecipeAndSyncLocal` path, then the button hides and the dirty flag clears.
- [ ] AC-05: Undo restores the working copy to the snapshot before the most recent Apply. The undo offer is a `svelte-sonner` toast with an Undo action. A second Apply replaces the undo snapshot, so only one level is available. Save clears the undo snapshot.
- [ ] AC-06: Navigating in-app away from the detail page while the working copy is dirty shows a dialog with exactly two actions: "Continue without saving" and "Save changes". There is no cancel action. "Save changes" saves and then navigates. "Continue without saving" discards the working copy and navigates.
- [ ] AC-07: While dirty, closing the tab, reloading, or leaving through the address bar triggers the browser's native `beforeunload` prompt. When not dirty, no prompt appears.
- [ ] AC-08: Saim failures keep unsaved edits intact. A 503 (`OPENAI_DISABLED`), a 502 (parse failure), and a 409 (conversation/context mismatch) each show an error message in the chat, and the working copy, undo snapshot, and dirty flag are unchanged.
- [ ] AC-09: Every Saim request includes the user's preferences in the developer context (empty string when none are set). Tests verify this for both new and existing conversations.
- [ ] AC-10: Saim form input, the Saim action result, and the structured AI output are validated at the boundary. Object schemas touched by this change use `.strict()`. An invalid recipe in AI output yields a 502 and never reaches the page as a proposal.
- [ ] AC-11: The edit page's Saim behavior is unchanged. It ignores the new `updateIntent` and `recipe` fields in the action result and does not regress.

## Offline, connectivity, and capability

- [ ] AC-12: Viewing, editing the working copy, and Save work offline and when logged out, using Dexie only. When Saim is unavailable (offline, logged out, missing AI permission, or provider failure), the UI shows a specific reason for that state rather than a generic error, and the rest of the page remains usable.

## Accessibility

- [ ] AC-13: The Apply, Dismiss, Save, and undo toast action are native buttons reachable and operable by keyboard. The navigation dialog moves focus into the dialog on open, restores focus on close, and Escape does not act as "Continue without saving" or "Save changes". The proposal card has an accessible name that identifies it as a recipe update.

## Test evidence

- [ ] AC-14: Automated tests named in `test-report.md` cover AC-01 through AC-11 and AC-13, or list each uncovered criterion with a reason. AC-12 is covered by a documented offline/anonymous smoke step. `pnpm run check` and `pnpm run lint` pass for touched paths.

## Out of scope (do not expand)

- Edit page Saim behavior and the Saim-during-editing path (separate issue).
- Keyword intent detection and the legacy `requestRecipeModifications` / `/api/recipes` revision branches.
- New revision endpoints.
- Multi-level undo or persisted drafts.
- Changes to ADR-003 suggestion artifacts or ADR-009 recommendations.
