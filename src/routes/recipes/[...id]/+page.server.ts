/**
 * @fileoverview Form actions for the recipe detail page, including Saim cooking assistance.
 * @module routes/recipes/[...id]/page.server
 */

import { askSaimAction } from '$lib/api/ai/asksaim.action';

import type { Actions } from './$types';

export const actions = {
  asksaim: askSaimAction
} satisfies Actions;
