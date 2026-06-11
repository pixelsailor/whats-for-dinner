import Dexie, { type Table } from 'dexie';
import type { SavedRecipe, Suggestion } from './api/recipe';

/**
 * Tracks prompt requests to prevent duplicate OpenAI API calls.
 * Links prompts to their resulting suggestion IDs.
 */
export type PromptRequest = {
  /** Unique timestamp ID (Date.now()) for this request */
  request_id: number;
  /** The sanitized prompt string */
  prompt: string;
  /** ISO datetime when this request was created */
  created_at: string;
  /** Array of suggestion ids returned by this request */
  suggestion_ids: string[];
};

/**
 * Local Dexie/IndexedDB Database
 *
 * Master database records for the What's For Dinner application.
 *
 * Stores all recipes (except archived recipes) regardless of user authentication status.
 *
 * By virtue of `ai_assistance` permission requirements, `suggestions` may only be stored for authenticated users.
 */
class MealDexie extends Dexie {
  recipes!: Table<SavedRecipe, string>;
  suggestions!: Table<Suggestion, string>;
  prompt_requests!: Table<PromptRequest, number>;

  constructor() {
    super('meal_assistant');

    // Version 1: Original schema
    this.version(1).stores({
      recipes:
        'id, title, created_at, deleted_at, last_opened, owner_id, shared_id, synced, last_synced_at',
      suggestions: 'id, sid, created_at, last_opened'
    });

    // Version 2: Add prompt_requests table for request deduplication
    this.version(2).stores({
      recipes:
        'id, title, created_at, deleted_at, last_opened, owner_id, shared_id, synced, last_synced_at',
      suggestions: 'id, sid, created_at, last_opened',
      prompt_requests: 'request_id, prompt, created_at'
    });

    // Version 3: Remove sid index, add recipe_id index, reset prompt_requests (sid-based mapping)
    this.version(3)
      .stores({
        recipes:
          'id, title, created_at, deleted_at, last_opened, owner_id, shared_id, synced, last_synced_at',
        suggestions: 'id, created_at, last_opened, recipe_id',
        prompt_requests: 'request_id, prompt, created_at'
      })
      .upgrade(async (tx) => {
        // Old prompt_requests entries store suggestion sids, which are no longer valid.
        await tx.table('prompt_requests').clear();

        const suggestions = await tx.table('suggestions').toArray();
        for (const suggestion of suggestions as Array<
          Record<string, unknown>
        >) {
          const id = suggestion.id;
          if (typeof id !== 'string' || id.length === 0) {
            suggestion.id = crypto.randomUUID();
          }
          if (!('recipe_id' in suggestion)) {
            suggestion.recipe_id = null;
          }
          // Strip legacy sid field if present
          if ('sid' in suggestion) {
            delete suggestion.sid;
          }
          await tx.table('suggestions').put(suggestion);
        }
      });
  }
}

export const db = new MealDexie();
