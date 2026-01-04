<script lang="ts">
	import { Button } from 'bits-ui';
	import { db } from '$lib/db';
	import { deletedRecipes } from '$lib/stores/recipes';
	import IconButton from '$lib/ui/IconButton.svelte';
	import RevertIcon from '$lib/ui/Icons/RevertIcon.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { AppBar } from '$lib/ui/AppBar';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { slide } from 'svelte/transition';
	import { toast } from 'svelte-sonner';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';

	const restoreRecipe = async (id: string) => {
		try {
			await db.recipes.update(id, { deleted_at: undefined });
			console.log(`${id} deleted`);
		} catch (err) {
			console.error(err);
			toast.error('There was a problem trying to restore the recipe.');
		}
	};

	const deleteRecipe = async(id: string) => {
		try {
			await db.recipes.delete(id);
		} catch (err) {
			console.error(err);
		}
	}

	const deleteAll = async () => {
		const all = $deletedRecipes.data?.map((recipe) => recipe.id);
		if (!all?.length) return;
		
		try {
			await db.recipes.bulkDelete(all)
		} catch (err) {
			console.error(err);
		}
	}
</script>

<PageHeader>
	<AppBar.Root>
		<AppBar.Text primary="Trash Bin" />
		<AppBar.End>
			{#if $deletedRecipes.data && $deletedRecipes.data.length}
				<Button.Root onclick={deleteAll} class="button text narrow danger" title="Permanently delete all recipes">
					<TrashIcon size="xs" />
					<span>Empty trash</span>
				</Button.Root>
			{/if}
		</AppBar.End>
	</AppBar.Root>
</PageHeader>

<div class="mx-auto max-w-5xl px-4 lg:px-8 py-8">
	{#if $deletedRecipes.loading}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if $deletedRecipes.error}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
			<h1 class="display-medium">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				<span class="fluid-heading-03">{$deletedRecipes.error.name}</span><span>|</span><span
					>{$deletedRecipes.error?.message}</span
				>
			</p>
		</div>
	{:else if $deletedRecipes.data}
		<h1 class="display-small mb-3">Trash Bin</h1>
		<p class="body-large mb-8 italic">Deleted recipes are kept for 30 days, after which they are permanently deleted.</p>
		{#if $deletedRecipes.data.length > 0}
			<div class="list">
				{#each $deletedRecipes.data as recipe}
					<hr />
					<div class="listitem">
						<span class="listitem__content">
							<span class="title-medium">{recipe.title}</span>
							<span class="body-medium text-foreground-alt dark:text-foreground-alt">{recipe.short_description}</span>
						</span>
						<span class="listitem__end">
							<Button.Root title="Delete permanently" onclick={() => deleteRecipe(recipe.id)} class="button icon text danger">
								<TrashIcon size="xs" />
							</Button.Root>
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<p class="body-medium">Your trash is empty.</p>
		{/if}
	{/if}
</div>
