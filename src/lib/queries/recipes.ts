import { sanitizePromptInput } from '$lib/utils';
import { createQuery } from '@tanstack/svelte-query';

export type promptContext = 'assistance' | 'detail' | 'revision' | 'summaries';

async function query(action: promptContext, prompt: string, recipe?: string) {
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

export function createAssistanceQuery(prompt: string, recipe: string) {
	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	return createQuery({
		queryKey: ['assistance', sanitizedPrompt],
		queryFn: () => query('assistance', sanitizedPrompt, recipe),
		enabled: !!sanitizedPrompt && sanitizedPrompt.length > 0,
		staleTime: Infinity
	});
}

export function createFullRecipeQuery(prompt: string) {
	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	return createQuery({
		queryKey: ['detail', sanitizedPrompt],
		queryFn: () => query('detail', sanitizedPrompt),
		enabled: !!sanitizedPrompt && sanitizedPrompt.length > 0,
		staleTime: Infinity
	});
}

export function createRevisionQuery(prompt: string, recipe: string) {
	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	return createQuery({
		queryKey: ['revision', sanitizedPrompt, recipe],
		queryFn: () => query('revision', sanitizedPrompt),
		enabled: !!sanitizedPrompt && sanitizedPrompt.length > 0,
		staleTime: Infinity
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
