# Test matrix — issue-46-recipe-chat-updates

Layer definitions and runners: [`docs/test-matrix-template.md`](../../../docs/test-matrix-template.md). Per-run AC evidence: [`test-report.md`](./test-report.md) (created by Tester).

## Planned coverage (Planner)

| Layer ID | AC IDs | Approach / notes |
| -------- | ------ | ---------------- |
| UNIT | AC-01, AC-02, AC-03, AC-04 (state), AC-05, AC-09, AC-10 | `src/lib/api/recipe/recipe-draft.model.test.ts`: apply → undo → apply sequences; Save clears undo; dirty false after undo back to saved; dismiss leaves working copy unchanged; merge rule keeps `id`, timestamps, `checkout_history`. `src/lib/api/ai/ai.server.service.test.ts`: preferences in developer message on create and on existing conversation (mock OpenAI client); `zodTextFormat` schema builds from the plain shape. |
| COMP | AC-01, AC-03, AC-04, AC-06, AC-07, AC-11, AC-13 | `src/routes/recipes/[...id]/page.svelte.test.ts` or a `__tests__` harness per `docs/test-matrix-template.md`: Apply/Dismiss card rendering; Save visible only when dirty; two-button navigation dialog with no cancel; focus behavior; `beforeunload` registered only while dirty; edit page harness ignores new action fields (AC-11). |
| INTG | AC-08, AC-09, AC-10, AC-11 | `src/lib/api/ai/asksaim.action.test.ts` (extend): mocked `askCookingQuestion` returning each `update_intent`; invariant violation (recipe present with `answer`, or missing with `proposed_update`) → 502; invalid recipe → 502; `OPENAI_DISABLED` → 503; context mismatch → 409; preferences forwarded from form data; unknown form keys rejected by `.strict()`. |
| OFFL | AC-12, AC-08 (manual), AC-07 (manual) | Named manual steps in `test-report.md`: (1) open saved recipe, go offline, edit, Save, reload, confirm persisted in Dexie; (2) Saim with offline / logged out / no AI permission shows distinct copy; (3) edits survive a Saim 503; (4) tab close while dirty triggers browser prompt. Automation not required today. |

### AC → layers (summary)

| AC ID | Layers | Notes |
| ----- | ------ | ----- |
| AC-01 | UNIT, COMP | Model apply; card renders and Apply updates working copy |
| AC-02 | INTG | `answer` intent yields no recipe and no card |
| AC-03 | UNIT, COMP, INTG | Dismiss in model; card shown for `needs_confirmation` |
| AC-04 | UNIT, COMP | `isDirty` model; Save button visibility and `updateRecipeAndSyncLocal` call |
| AC-05 | UNIT, COMP | One-level undo; toast Undo action |
| AC-06 | COMP | Dialog two buttons, no cancel |
| AC-07 | COMP, OFFL | `beforeunload` registration; manual tab close |
| AC-08 | INTG, OFFL | Action failure envelopes; manual 503 preserving edits |
| AC-09 | UNIT, INTG | Developer message content; action forwards preferences |
| AC-10 | UNIT, INTG | Schema strictness; 502 on invalid recipe |
| AC-11 | COMP, INTG | Edit page harness; action result ignored by edit page |
| AC-12 | OFFL | Manual offline/logged-out smoke with distinct copy |
| AC-13 | COMP | Keyboard and focus assertions; manual keyboard pass by Human |
| AC-14 | all | Commands recorded in `test-report.md` |

## Actual coverage (Test)

<!-- Filled by Tester. Status: planned | done | n/a | blocked -->

| Layer ID | AC IDs | Test file(s) / evidence | Status |
| -------- | ------ | ----------------------- | ------ |
| UNIT | | | planned |
| COMP | | | planned |
| INTG | | | planned |
| OFFL | | | planned |

### Gaps vs plan

-

## Residual risk

- Saim rendering location on the detail page (OQ-2) may change which COMP harness is needed.
- Browser-native `beforeunload` prompts cannot be asserted for their text; assert registration only and verify the prompt manually (OFFL step 4).
- Manual keyboard and screen-reader pass (AC-13) is not automatable here.
