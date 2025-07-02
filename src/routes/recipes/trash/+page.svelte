<script lang="ts">
	import { db } from '$lib/db';
  import { archivedRecipes } from '$lib/stores/recipes';
	import IconButton from '$lib/ui/IconButton.svelte';
	import RevertIcon from '$lib/ui/Icons/RevertIcon.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { slide } from 'svelte/transition';
	import { toast } from 'svelte-sonner';

	  let alert = $state({
    type: '' as 'info' | 'warn' | 'danger' | 'success' | 'error',
    message: ''
  });

	async function restoreRecipe(id: string) {
    try {
      await db.recipes.update(id, { archived: undefined });
    } catch (err) {
			console.error(err);
			toast.error('There was a problem trying to restore the recipe.')
    }
	}
</script>

<PageHeader>
	<AppBar.Root>
		<Button title="Back" href="/recipes" label="Go back" size="xs" icon>
			<BackIcon size="xs"/>
		</Button>
	</AppBar.Root>
</PageHeader>

<main class="mx-auto max-w-5xl px-4 min-h-screen">
	{#if $archivedRecipes.loading}
		<div class="mx-auto w-full max-w-3xl h-screen grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if $archivedRecipes.error}
		<div class="mx-auto w-full max-w-3xl h-screen grid place-content-center gap-6">
			<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3"><span class="fluid-heading-03">{$archivedRecipes.error.name}</span><span>|</span><span>{$archivedRecipes.error?.message}</span></p>
		</div>
	{:else if $archivedRecipes.data}
		<div class="py-24">
			<h1 class="fluid-heading-05 mb-8">Trash</h1>
			{#if $archivedRecipes.data.length > 0}
				<List>
					{#each $archivedRecipes.data as recipe}
						<hr class="border-gray-200">
						<div transition:slide={{ duration: 300, axis: 'y' }}>
							<ListItem.Root>
								<ListItem.Text primary={recipe.title} />
								<ListItem.SecondaryAction>
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
