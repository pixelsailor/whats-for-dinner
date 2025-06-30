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
	import type { SavedRecipe, ViewState } from '$lib/types';
	import Button from '$lib/ui/Button/Button.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { AppBar } from '$lib/ui/AppBar';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import IconButton from '$lib/ui/IconButton.svelte';
	import CloseIcon from '$lib/ui/Icons/CloseIcon.svelte';

	const vp: any = getContext('viewport');

	const id = $derived(page.params.id);

	let { form } = $props();

	let promptInput = $state<string>();
	
	let promptType = $state<'conversation'|'recipe'>();

	let conversationMsg = $state<string>();

	let app = $state({
		view: 'loading' as ViewState,
		error: ''
	});

	let recipe = $state<SavedRecipe>();

	// Responsible for passing the recipe to the FormData
	let recipeJson = $derived(recipe ? JSON.stringify(recipe) : '');

	let recipeTime = $derived.by(() => {
		if (recipe?.time) {
			return new Map(Object.entries(recipe.time));
		}
		return undefined;
	});

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

	$effect(() => {
		if (form && form.error === undefined) {
			if (form.message === lastFormMessage) return;

			const { type, message } = form;
			promptType = type;
			lastFormMessage = message;
			waiting = false;

			if (type === 'conversation') {
				conversationMsg = message;
			} else {
				// clone the snapshot to avoid "DataCloneError" in `saveModifiedRecipe()`
				const original = structuredClone($state.snapshot(recipe)) as SavedRecipe;

				try {
					recipe = JSON.parse(message) as SavedRecipe;
					toast.success(`"${recipe.title}" has unsaved changes`, {
						duration: Number.POSITIVE_INFINITY,
						action: {
							label: 'Save changes',
							onClick: () =>
								saveModifiedRecipe(original, structuredClone($state.snapshot(recipe!)))
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
		<Button title="Back" href="/recipes" size="xs" icon>
			<BackIcon />
		</Button>
		<AppBar.Text primary={recipe?.title || ''} />
		<AppBar.End>
			<Button title="Trash bin" href="/recipes/trash" size="xs" icon>
				<TrashIcon />
			</Button>
		</AppBar.End>
	</AppBar.Root>
</PageHeader>
<article class="mx-auto max-w-5xl px-4 pt-24" style:padding-bottom={`calc(${promptHeight}px + 1.5rem)`}>
	{#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'idle' && recipe}
		<ul class="inline-flex gap-2 mb-4">
			{#each recipe.tags as tag}
				<li>
					<span class="tag label px-1 border rounded bg-gray-200 dark:bg-gray-600">{tag}</span>
				</li>
			{/each}
		</ul>
		<h1 class="fluid-heading-05">{recipe.title}</h1>
		<p class="my-4 italic">{recipe.description}</p>
		<p class="my-4">{recipe.yield}</p>
		{#if recipeTime}
			<ul class="my-2">
				{#each recipeTime as time}
					<li class="my-1"><span class="heading">{time[0]} time:</span> <span>{time[1]}</span></li>
				{/each}
			</ul>
		{:else}
			<p><span class="heading">Time:</span> {recipe.estimated_time}</p>
		{/if}
		<div class="ingredients my-8">
			<h2 class="fluid-heading-03 my-2">Ingredients:</h2>
			<div class="ingredients__content markdown">
				<SvelteMarkdown source={recipe.ingredients} />
			</div>
		</div>
		<div class="instructions my-8">
			<h2 class="fluid-heading-03 my-2">Preparation:</h2>
			<div class="instructions__content markdown">
				<SvelteMarkdown source={recipe.instructions} />
			</div>
		</div>
		{#if recipe.notes?.length}
			<div class="notes my-8">
				<h2 class="fluid-heading-03 my-2">Notes:</h2>
				<div class="notes__content markdown">
					<SvelteMarkdown source={recipe.notes} />
				</div>
			</div>
		{/if}
		<div class="fixed right-0 bottom-0 px-4" style:left bind:this={promptRef}>
			<Prompt>
				{#if conversationMsg}
					<div class="flex flex-row gap-2 items-start" transition:slide={{ duration: 500, axis: 'y' }}>
						<div class="conversation text-sm mb-4 self-center">
							<SvelteMarkdown source={conversationMsg} />
						</div>
						<Button onClick={() => conversationMsg = ''} label="Close" size='xs' icon class="-m-2">
							<CloseIcon />
						</Button>
					</div>
				{/if}
				<form
					class="flex flex-row gap-2 w-full"
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
					<Button type="submit" label="Submit request" disabled={waiting || !promptInput?.trim()}>{waiting ? 'Thinking...' : 'Submit'}</Button>
				</form>
			</Prompt>
		</div>
	{:else}
		<h1>Ah, donkeyspittle!</h1>
		<p>A recipe matching the provided ID could not be found.</p>
	{/if}
</article>

<style>
	:global(.conversation) {
		& {
			p, ul, li {
				margin: .5rem 0;
			}
		}
	}
	.conversation :global {
		p, ul {
			margin: .5rem 0;
		}
		li {
			margin: .25rem 0;
		}
	}
</style>