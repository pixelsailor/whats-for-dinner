<script lang="ts">
	import { enhance } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import { db } from '$lib/db';
	import { createFullRecipeQuery } from '$lib/queries/recipes.js';
	import type { FullRecipe, PromptContext } from '$lib/types.js';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import BookmarkIcon from '$lib/ui/Icons/BookmarkIcon.svelte';
	import CloseIcon from '$lib/ui/Icons/CloseIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import Recipe from '$lib/ui/Recipe.svelte';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import { v4 as uuid } from 'uuid';

	const vp: any = getContext('viewport');

	let { data, form } = $props();

	let recipe = $derived(createFullRecipeQuery(data.recipeTitle, data.desc));

	let fullRecipe = $derived<FullRecipe>($recipe.data?.data[1]);

	// Responsible for passing the recipe to the FormData
	let recipeJson = $derived(fullRecipe ? JSON.stringify(fullRecipe) : '');

	// Account for sidenav width and adjust accordingly
	let left = $derived.by(() => {
		if (vp.device === 'mobile') return '0';
		return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.5rem + 1px)';
	});

	let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	// True when a request is being processed
	let working = $state(false);

	let promptInput = $state<string>();

	let promptType = $state<PromptContext>();

	let promptRef = $state<HTMLElement>();

	let promptHeight = $derived(promptRef?.clientHeight);

	let conversationMsg = $state<string>();

	let lastFormMessage: string | undefined = undefined;

	let hasUnsavedChanges = $state(false);

	function goBack() {
		window.history.back();
	}

	/**
	 * Save to the User's recipe book
	 */
	async function saveRecipe() {
		working = true;

		try {
			const now = Date.now();
			const clonedRecipe: FullRecipe = JSON.parse(JSON.stringify(fullRecipe));
			const newRecipe = {
				...clonedRecipe,
				id: uuid(),
				created_at: now,
				last_opened: now,
				version: 1,
				is_current: true,
				is_favorite: false,
			};

			const recipeId = await db.recipes.put(newRecipe);
			
			status = 'saved';
			goto(`/recipes/${recipeId}`, { replaceState: true });
		} catch (err) {
			console.error('Save failed', err);
			status = 'error';
			working = false;
			toast.error('Save failed');
		}
	}

	// Handle prompt responses
	$effect(() => {
		if (form && form.error === undefined) {
			if (form.message === lastFormMessage) return;

			const { type, message } = form;
			promptType = type;
			lastFormMessage = message;
			working = false;

			if (type === 'assistance') {
				conversationMsg = message;
			} else {
				try {
					fullRecipe = JSON.parse(message) as FullRecipe;
					hasUnsavedChanges = true;
					toast.success(`"${fullRecipe.title}" updated`);
				} catch (err) {
					console.error(err);
					toast.error('There was a problem parsing the recipe JSON');
				}
			}
		} else if (form && form.error) {
			working = false;
			console.error(form.error);
			toast.error(`${form.error}`);
		}
	});

	beforeNavigate(({ cancel }) => {
		if (hasUnsavedChanges) {
			const shouldLeave = confirm(
				'You have unsaved changes. Are you sure you want to leave this page?'
			);
			if (!shouldLeave) {
				cancel();
			}
		}
	});
</script>

<PageHeader>
	<AppBar.Root>
		{#if $recipe.data}
			<Button onClick={goBack} label="Go back to recipe suggetions" size="sm">
				<BackIcon size="xs" />
				Back to suggestions
			</Button>
		{:else}
			<AppBar.Text primary={'Checking the pantry...'} />
		{/if}
		{#if $recipe.data}
			<AppBar.End>
				<Button onClick={saveRecipe} label="Save recipe">
					<BookmarkIcon size="xs" />
					Save recipe
				</Button>
			</AppBar.End>
		{/if}
	</AppBar.Root>
</PageHeader>
<article
	class="mx-auto max-w-5xl px-4 pt-24"
	style:padding-bottom={`calc(${promptHeight}px + 1.5rem)`}
>
	{#if $recipe.isError}
		<div class="mx-auto grid h-max w-full max-w-3xl place-content-center">
			<h1 class="fluid-heading-05 my-8">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				A recipe matching the provided title could not be found.
			</p>
		</div>
	{:else if $recipe.data && fullRecipe}
		<Recipe recipe={fullRecipe} />
		<Button onClick={saveRecipe} label="Save to My Recipes" disabled={working} size="sm">
			<BookmarkIcon size="xs" />
			Save to My Recipes
		</Button>
		<div class="fixed right-0 bottom-0 px-4" style:left bind:this={promptRef}>
			<Prompt>
				{#if conversationMsg}
					<div
						class="flex flex-row items-start gap-2"
						transition:slide={{ duration: 500, axis: 'y' }}
					>
						<div class="markdown mb-4 self-center text-sm">
							<SvelteMarkdown source={conversationMsg} />
						</div>
						<Button
							onClick={() => (conversationMsg = '')}
							label="Close"
							size="xs"
							icon
							class="-m-2"
						>
							<CloseIcon />
						</Button>
					</div>
				{/if}
				<form
					class="flex w-full flex-row gap-2"
					method="POST"
					use:enhance={() => {
						working = true;
					}}
				>
					<input
						class="grow p-1"
						type="text"
						name="input"
						bind:value={promptInput}
						placeholder="Make changes or ask a recipe related question"
					/>
					<input type="hidden" name="recipe" bind:value={recipeJson} />
					<Button type="submit" label="Submit request" disabled={working || !promptInput?.trim()}
						>{working ? 'Thinking...' : 'Submit'}</Button
					>
				</form>
			</Prompt>
		</div>
	{:else}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{/if}
</article>
