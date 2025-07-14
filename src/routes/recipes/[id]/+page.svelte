<script lang="ts">
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';
	import { toast } from 'svelte-sonner';
	import { v4 as uuid } from 'uuid';

	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { db } from '$lib/db';
	import { getSavedRecipe } from '$lib/stores/recipes';
	import type { PromptContext, SavedRecipe, ViewState } from '$lib/types';
	import Button from '$lib/ui/Button/Button.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { AppBar } from '$lib/ui/AppBar';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import CloseIcon from '$lib/ui/Icons/CloseIcon.svelte';
	import Recipe from '$lib/ui/Recipe.svelte';

	const vp: any = getContext('viewport');

	let { form } = $props();

	let id = $derived(page.params.id);

	let promptInput = $state<string>();

	let promptType = $state<PromptContext>();

	let conversationMsg = $state<string>();

	let app = $state({
		view: 'loading' as ViewState,
		error: ''
	});

	let recipe = $state<SavedRecipe>();

	// Responsible for passing the recipe to the FormData
	let recipeJson = $derived(recipe ? JSON.stringify(recipe) : '');

	// Waiting for a response to an OpenAI request
	let waiting = $state(false);

	let left = $derived.by(() => {
		if (vp.device === 'mobile') return '0';
		return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.5rem + 1px)';
	});

	let promptRef = $state<HTMLElement>();

	let promptHeight = $derived(promptRef?.clientHeight);

	let lastFormMessage: string | undefined = undefined;

	$effect(() => {
		getSavedRecipe(id)
			.then((response) => {
				if (!response) {
					app.view = 'error';
					app.error = 'A recipe matching the provided ID could not be found.';
					return;
				}
				recipe = response;
				app.view = 'idle';
				db.recipes.update(id, { last_opened: Date.now() });
			})
			.catch((err) => {
				app.error = err.message;
				app.view = 'error';
			});
	});

	// React to user prompts
	$effect(() => {
		if (form && form.error === undefined) {
			if (form.message === lastFormMessage) return;

			const { type, message } = form;
			promptType = type;
			lastFormMessage = message;
			waiting = false;

			if (type === 'assistance') {
				conversationMsg = message;
			} else {
				// clone the snapshot to avoid "DataCloneError" in `saveModifiedRecipe()`
				const original = structuredClone($state.snapshot(recipe)) as SavedRecipe;

				try {
					recipe = JSON.parse(message) as SavedRecipe;
					toast.dismiss();
					toast.success(`"${recipe.title}" has unsaved changes`, {
						duration: Number.POSITIVE_INFINITY,
						action: {
							label: 'Save changes',
							onClick: () => saveModifiedRecipe(original, structuredClone($state.snapshot(recipe!)))
						}
					});
				} catch (err) {
					console.error(err);
					toast.error('There was a problem parsing the recipe JSON');
				}
			}
		} else if (form && form.error) {
			waiting = false;
			console.error(form.error);
			toast.error(`${form.error}`);
		}
	});

	async function saveModifiedRecipe(original: SavedRecipe, updated: SavedRecipe) {
		await db.recipes.update(original.id, { is_current: false });

		const version = original.version + 1;
		const now = Date.now();
		const newRecipe: SavedRecipe = {
			...updated,
			id: uuid(),
			version,
			parent_id: original.parent_id ?? original.id,
			archived: 0,
			is_current: true,
			created_at: now,
			last_opened: now
		};

		await db.recipes.put(newRecipe);
		return newRecipe;
	}
</script>

<PageHeader>
	<AppBar.Root>
		<AppBar.Text primary={recipe?.title || ''} />
	</AppBar.Root>
</PageHeader>

<article
	class="mx-auto max-w-5xl px-4 pt-24"
	style:padding-bottom={`calc(${promptHeight}px + 1.5rem)`}
>
	{#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'idle' && recipe}
		<Recipe {recipe} />
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
						waiting = true;
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
					<Button type="submit" label="Submit request" disabled={waiting || !promptInput?.trim()}
						>{waiting ? 'Thinking...' : 'Submit'}</Button
					>
				</form>
			</Prompt>
		</div>
	{:else}
		<div class="mx-auto grid h-max w-full max-w-3xl place-content-center">
			<h1 class="fluid-heading-05 my-8">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">A recipe matching the provided ID could not be found.</p>
		</div>
	{/if}
</article>
