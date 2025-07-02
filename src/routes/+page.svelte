<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { recipesApiPostHandler } from '$lib/api';
	import type { RecipeSummary, Viewport } from '$lib/types';
	import ListItemButton from '$lib/ui/ListItemButton.svelte';
	import { AppBar } from '$lib/ui/AppBar/index.js';
	import Button from '$lib/ui/Button/Button.svelte';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { saveSuggestions, suggestionMap } from '$lib/stores/suggestions';
	import { goto } from '$app/navigation';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

	const vp = getContext<Viewport>('viewport');

	let left = $derived.by(() => {
		if (vp.device === 'mobile') return '0';
		return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.5rem + 1px)';
	});

	let app = $state({
		input: '',
		lastInput: '',
		view: 'idle' as 'idle' | 'detail' | 'suggestions' | 'loading' | 'error',
		suggestions: [] as RecipeSummary[],
		selected: null as RecipeSummary | null,
		error: '',
		saveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
	});

	// Show request status without changing app.view
	let waiting = $state(false);

	let promptPlaceholder = $state('');

	onMount(async () => {
		promptPlaceholder = getRandomPromptMessage();
	});

	function getRandomPromptMessage() {
		const messages = [
			`How can I help?`,
			`What'll it be tonight?`,
			`What are you in the mood for?`,
			`If you could dine anywhere in the world right now, where would that be?`,
			`Ready for something new?`
		];
		const max = messages.length;
		return messages[Math.floor(Math.random() * max)];
	}

	function selectRecipe(recipe: RecipeSummary) {
		suggestionMap.update((map) => new Map(map).set(recipe.title, recipe));
		goto(`/recipes/new?title=${encodeURIComponent(recipe.title)}`);
	}

	// Reusable function to fetch suggestions (can use API or direct server call)
	async function fetchSuggestions(input: string): Promise<RecipeSummary[] | null> {
		waiting = true;
		try {
			// Option 1: Use the API handler (preferred for SSR compatibility)
			const res = await recipesApiPostHandler<RecipeSummary[]>('suggestions', input);
			
			if (res.success) {
				await saveSuggestions(res.data);
				return res.data;
			} else {
				// alert.type = 'error';
				// alert.message = (typeof res.error === 'string') ? (res.error) : res.error.message || 'Unknown error';
				return null;
			}
		} catch (err) {
			// alert.type = 'error';
			// alert.message = 'Failed to fetch suggestions';
			return null;
		} finally {
			waiting = false;
		}
	}

	// Programmatic function to get suggestions
	async function getSuggestions(getMore: boolean = false) {
		if (!app.input.trim() && !getMore) return;
		const suggestions = await fetchSuggestions(getMore ? app.lastInput : app.input.trim());
		if (suggestions) {
			app.suggestions = [...app.suggestions, ...suggestions];
			app.view = 'suggestions';
			app.lastInput = app.input;
		}
	}
</script>

{#if app.view === 'suggestions'}
	<PageHeader>
		<AppBar.Root>
			<Button href="/" size="xs" icon>
				<BackIcon />
			</Button>
			<AppBar.Text primary="Suggested Recipes" />
		</AppBar.Root>
	</PageHeader>
{/if}

<main class="flex items-center h-screen mx-auto max-w-5xl px-4 py-24" style:height={app.view === 'suggestions' ? 'auto' : ''}>
	{#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'idle'}
		<div class="mx-auto max-w-3xl w-full">
			<h1 class="my-4 text-center fluid-heading-06">What's for Dinner?</h1>
			<Prompt>
				<form
					class="flex w-full flex-row gap-2"
					method="POST"
					use:enhance={({ formElement, formData, action, cancel, submitter }) => {
						waiting = true;
						return async ({ result, update }) => {
							waiting = false;
							if (result?.type === 'success' && Array.isArray(result.data)) {
								app.suggestions = result.data;
								app.view = 'suggestions';
								app.lastInput = app.input;
								saveSuggestions(result.data);
							} else if (result?.type === 'failure') {
								app.error = (result.data?.error as string) || 'Unknown error';
								app.view = 'error';
							}
							await update();
						};
					}}
				>
					<input
						class="grow p-1"
						type="text"
						name="input"
						bind:value={app.input}
						placeholder={promptPlaceholder}
					/>
					<Button type="submit" class="-mr-1" label="Submit request" disabled={waiting || !app.input.trim()}>
						{waiting ? 'Thinking...' : 'Get ideas'}
					</Button>
				</form>
				<!-- Uncomment to use programmatic suggestions -->
				<!-- <button onclick={getSuggestions}>Show me some more ideas</button> -->
			</Prompt>
		</div>
	{:else if app.view === 'suggestions' && app.suggestions}
		<div class="response">
			<h2 class="my-4 fluid-heading-05">Here are some ideas for, <span class="italic">"{app.lastInput}"</span>:</h2>
			<ul class="my-4">
				{#each app.suggestions as suggestion}
					<ListItemButton size="three-line" onClick={() => selectRecipe(suggestion)}>
						<p class="font-bold">{suggestion.title}</p>
						<p class="text-sm">{suggestion.short_description}</p>
					</ListItemButton>
				{/each}
			</ul>
			<Button onClick={() => getSuggestions(true)} label="Get more suggestions">
				Show me some more ideas
			</Button>
		</div>
	{:else if app.view === 'error'}
		<div class="error">
			<p class="my-4 font-bold">Ah donkeyspittle! There was a problem.</p>
			<p class="my-4">Refresh the browser and try again.</p>
			<p>{app.error}</p>
		</div>
	{/if}
</main>