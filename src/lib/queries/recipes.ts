import type { PromptContext } from '$lib/types';
import { sanitizePromptInput } from '$lib/utils';
import { createQuery } from '@tanstack/svelte-query';

async function query(action: PromptContext, prompt: string, recipe?: string) {
	const body: Record<string, unknown> = { action, prompt };
	if (recipe !== undefined) body.recipe = recipe;

	const response = await fetch('/api/recipes', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

	return response.json();
}

// Tanstack Query functions for caching. It's expected that URI prompts have been encoded

// `createAssistanceQuery` and `createRevisionQuery` should not be cached. Keeping them so that
// api calls can maintain a consistent usage format but these are not necessary and could hinder
// sending requests to openai

export function createAssistanceQuery(prompt: string, recipe: string) {
	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	return createQuery({
		queryKey: ['assistance', sanitizedPrompt],
		queryFn: () => query('assistance', sanitizedPrompt, recipe),
		enabled: !!sanitizedPrompt && sanitizedPrompt.length > 0,
		// staleTime: Infinity
	});
}

// Using "recipe" on this one so that the POST response doesn't need a unique argument
export function createFullRecipeQuery(prompt: string, recipe: string) {
	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	const sanitizedDesc = sanitizePromptInput(decodeURIComponent(recipe));
	return createQuery({
		queryKey: ['detail', sanitizedPrompt],
		queryFn: () => query('detail', sanitizedPrompt, sanitizedDesc),
		enabled: !!sanitizedPrompt && sanitizedPrompt.length > 0,
		staleTime: Infinity
	});
}

export function createRevisionQuery(prompt: string, recipe: string) {
	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	return createQuery({
		queryKey: ['revision', sanitizedPrompt],
		queryFn: () => query('revision', sanitizedPrompt, recipe),
		enabled: !!sanitizedPrompt && sanitizedPrompt.length > 0,
		// staleTime: Infinity
	});
}

export function createSuggestionsQuery(prompt: string | null) {
	if (!prompt) return null;

	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	return createQuery({
		queryKey: ['summaries', sanitizedPrompt],
		queryFn: () => query('summaries', sanitizedPrompt),
		enabled: !!sanitizedPrompt && sanitizedPrompt.length > 0,
		staleTime: Infinity
	});
}
