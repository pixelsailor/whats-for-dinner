/**
 * @fileoverview Resolves public recipe share tokens through the browser-safe Supabase client.
 * @module routes/api/share/[token]/server
 */

import { error, json } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const { token } = params;

	// Step 1: Find the recipe_id from the share token
	const { data: link, error: linkErr } = await supabase.from('shared_links').select('recipe_id').eq('token', token).maybeSingle();

	if (linkErr || !link) {
		throw error(404, 'Link not found');
	}

	// Step 2: Fetch the recipe details
	const { data: recipe, error: recipeErr } = await supabase
		.from('recipes')
		.select('*')
		.eq('id', link.recipe_id)
		// .eq('is_public', true) // ensures only public recipes are returned
		.maybeSingle();

	if (recipeErr || !recipe) {
		throw error(404, 'Recipe not found or not public');
	}

	return json(recipe);
};
