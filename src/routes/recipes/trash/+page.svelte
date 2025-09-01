<script lang="ts">
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
	import Button from '$lib/ui/Button/Button.svelte';
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
				<Button onClick={deleteAll} size="xs">
					<TrashIcon size="xs" />
					<span class="ml-2 hidden md:inline">Empty Trash</span>
				</Button>
			{/if}
		</AppBar.End>
	</AppBar.Root>
</PageHeader>

<main class="mx-auto min-h-screen max-w-5xl px-4">
	{#if $deletedRecipes.loading}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if $deletedRecipes.error}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
			<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				<span class="fluid-heading-03">{$deletedRecipes.error.name}</span><span>|</span><span
					>{$deletedRecipes.error?.message}</span
				>
			</p>
		</div>
	{:else if $deletedRecipes.data}
		<div class="py-24">
			<h1 class="fluid-heading-04 mb-8">Trash</h1>
			{#if $deletedRecipes.data.length > 0}
				<List>
					{#each $deletedRecipes.data as recipe}
						<hr class="border-gray-200" />
						<div transition:slide={{ duration: 300, axis: 'y' }}>
							<ListItem.Root>
								<ListItem.Text primary={recipe.title} />
								<ListItem.SecondaryAction>
									<Button title="Delete permanently" onClick={() => deleteRecipe(recipe.id)} size="xs" icon>
										<TrashIcon size="xs" />
									</Button>
									<IconButton title="Restore" onClick={() => restoreRecipe(recipe.id)} size="xs">
										<RevertIcon />
									</IconButton>
								</ListItem.SecondaryAction>
							</ListItem.Root>
						</div>
					{/each}
				</List>
			{:else}
				<p>Your trash bin is empty.</p>
			{/if}
		</div>
	{/if}
</main>
