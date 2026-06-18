/**
 * @fileoverview Form actions for the recipe edit page, including Saim cooking assistance.
 * @module routes/recipes/[...id]/edit/page.server
 */

import { askSaimAction } from '$lib/api/ai/asksaim.action';

import type { Actions } from './$types';

export const actions = {
  asksaim: askSaimAction
} satisfies Actions;
