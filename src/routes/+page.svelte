<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { v4 as uuid } from 'uuid';
	import { enhance } from '$app/forms';
	import { recipesApiPostHandler } from '$lib/api';
	import { db } from '$lib/db.js';
	import type { FullRecipe, RecipeSummary } from '$lib/types';
	import ListItemButton from '$lib/ui/ListItemButton.svelte';
	import { AppBar } from '$lib/ui/AppBar/index.js';
	import Button from '$lib/ui/Button/Button.svelte';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';
	import Recipe from '$lib/ui/Recipe.svelte';

	const vp = getContext<any>('viewport');

	let { data, form } = $props();

	let layout = $derived(vp.layout);

	let app = $state({
		input: '',
		lastInput: '',
		view: 'idle' as 'idle' | 'detail' | 'suggestions' | 'loading' | 'error',
		suggestions: [] as RecipeSummary[],
		selected: null as RecipeSummary | null,
		fullRecipes: new Map<string, FullRecipe>(),
		error: '',
		saveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error'
	});

	let loading = $state(false);
	let fullRecipe = $derived(app.selected ? app.fullRecipes.get(app.selected.title) : undefined);

  let recipeTime = $derived.by(() => {
		if (fullRecipe?.time) {
			return new Map(Object.entries(fullRecipe.time));
		}
		return undefined;
	});

	let alert = $state({
		type: '' as 'info' | 'warn' | 'danger' | 'success' | 'error',
		message: ''
	});

	let recipebookTitles = $state<string[]>([]);

	let isSavedRecipe = $derived(
		app.selected ? recipebookTitles.includes(app.selected.title) : false
	);

	let promptPlaceholder = $state('');

	function selectRecipe(recipe: RecipeSummary) {
		app.selected = recipe;

		// Already fetched? Use cache
		if (app.fullRecipes.has(recipe.title)) {
			app.view = 'detail';
			return;
		}

		app.view = 'loading';

		recipesApiPostHandler<FullRecipe>('detail', recipe).then((res) => {
			if (res.success) {
				app.fullRecipes.set(recipe.title, res.data);
				app.view = 'detail';
			} else {
				app.error = typeof res.error !== 'string' ? res.error.message : res.error;
				app.view = 'error';
			}
		});
	}

	/**
	 * Save to the User's recipe book
	 * @param title - Title of the recipe
	 */
	async function saveRecipe(title: string) {
		const recipe = fullRecipe || app.fullRecipes.get(title);
		if (!recipe) return;

		app.saveStatus = 'saving';

		try {
			if (!recipebookTitles.includes(title)) {
				const now = Date.now();
				await db.recipes.put({
					...recipe,
					short_description: app.selected?.short_description || recipe.description,
					id: uuid(),
					created_at: now,
					last_opened: now,
					version: 1,
					is_current: true
				});
				recipebookTitles.push(recipe.title);
				app.saveStatus = 'saved';
			} else {
				app.saveStatus = 'idle';
				alert.type = 'warn';
				alert.message = 'Recipe already saved';
			}
		} catch (err) {
			console.error('Save failed', err);
			app.saveStatus = 'error';
			alert.type = 'error';
			alert.message = 'Failed to save recipe';
		}
	}

	function backToSuggestions() {
		app.view = 'suggestions';
		app.selected = null;
	}

	function toggleMenu() {
		vp.nav = vp.nav === 'expanded' ? 'collapsed' : 'expanded';
	}

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

	// Create a list of titles to reference to avoid adding duplicates
	onMount(async () => {
		const all = await db.recipes.toArray();
		recipebookTitles = all.map((recipe) => recipe.title);

		promptPlaceholder = getRandomPromptMessage();
	});
</script>

<AppBar.Root>
	{#if app.view === 'suggestions'}
		<Button href="/" size="xs" icon>
			<BackIcon />
		</Button>
	{:else if app.view === 'detail'}
		<Button onClick={backToSuggestions} label="Back to suggestions" size="xs" icon>
			<BackIcon />
		</Button>
	{/if}
</AppBar.Root>
<main class="mx-auto max-w-5xl px-4 py-24">
	{#if app.view === 'idle'}
		<div class="mx-auto max-w-3xl">
			<h1 class="my-4 text-center fluid-heading-06">What's for Dinner?</h1>
			<Prompt>
				<form
					class="flex w-full flex-row gap-2"
					method="POST"
					use:enhance={({ formElement, formData, action, cancel, submitter }) => {
						loading = true;
						return async ({ result, update }) => {
							// console.log('form result', result);
							loading = false;
							app.lastInput = app.input;
							app.view = 'suggestions';
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
					<Button type="submit" label="Submit request" disabled={loading || !app.input.trim()}
						>{loading ? 'Thinking...' : 'Get ideas'}</Button
					>
				</form>
			</Prompt>
		</div>
	{:else if app.view === 'loading'}
		<p>Loading...</p>
	{:else if app.view === 'suggestions' && form}
		<div class="response">
			<h2 class="my-4">Here are some ideas:</h2>
			<ul class="my-4">
				{#each form.data as suggestion}
					<ListItemButton size="three-line" onClick={() => selectRecipe(suggestion)}>
						<p class="font-bold">{suggestion.title}</p>
						<p class="text-sm">{suggestion.short_description}</p>
					</ListItemButton>
				{/each}
			</ul>
			<!-- <button onclick={() => getSuggestions(true)}>Give me more ideas</button> -->
		</div>
	{:else if app.view === 'detail'}
		<div>
			<button onclick={backToSuggestions}>Back to suggestions</button>
		</div>

		<h1 class="my-2 text-lg font-bold">{app.selected?.title}</h1>
		{#if fullRecipe}
			<Recipe recipe={fullRecipe} />
			<div class="my-8">
				<button
					class={[
						'mt-4 rounded px-4 py-2 text-white',
						{ 'bg-green-600': app.saveStatus === 'saved' },
						{ 'bg-gray-600': app.saveStatus === 'saving' },
						{ 'bg-blue-600': app.saveStatus === 'idle' }
					]}
					disabled={app.saveStatus === 'saving' || isSavedRecipe}
					onclick={() => saveRecipe(fullRecipe.title)}
				>
					{#if app.saveStatus === 'saving'}
						Saving...
					{:else if app.saveStatus === 'saved' || isSavedRecipe}
						Saved
					{:else}
						Add to my recipe book
					{/if}
				</button>
			</div>
		{:else}
			<p>Loading recipe...</p>
		{/if}
	{:else if app.view === 'error'}
		<div class="error">
			<p class="my-4 font-bold">Ah donkeyspittle! There was a problem.</p>
			<p>{app.error}</p>
			<button onclick={backToSuggestions}>Back to suggestions</button>
		</div>
	{/if}

	{#if form?.error}
		<div class="error">
			<h2>Error:</h2>
			<p>{form.error}</p>
		</div>
	{/if}
</main>
