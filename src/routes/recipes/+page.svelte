<script lang="ts">
	import { Toolbar } from 'bits-ui';
	import { toast, Toaster } from 'svelte-sonner';

	import { db } from '$lib/db';
	import { savedRecipes } from '$lib/stores/recipes';
  import Button from '$lib/ui/Button/Button.svelte'
	import { List, ListItem } from '$lib/ui/List';
	import IconButton from '$lib/ui/IconButton.svelte';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { slide } from 'svelte/transition';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import { AppBar } from '$lib/ui/AppBar';

	async function deleteRecipe(id: string, title: string) {
		// if (confirm('Delete this recipe?')) {
    const deletedAt = Date.now();

		try {
			await db.recipes.update(id, { archived: deletedAt });

			toast.success(`"${title}" deleted`, {
				action: {
					label: 'Undo',
					onClick: async () => {
						await db.recipes.update(id, { archived: undefined });
						toast.success(`"${title}" restored`);
					}
				},
        duration: 5000
			});
		} catch (err) {
			toast.error('Failed to delete recipe');
			console.error(err);
		}
		// }
	}
</script>

<AppBar.Root>
  <Button title="Back" href="/" size="xs" icon>
    <BackIcon />
  </Button>
  <AppBar.Text primary="My Recipe Book" />
  <AppBar.End>
    <Button title="Trash bin" href="/recipes/trash" size="xs" icon>
      <TrashIcon />
    </Button>
  </AppBar.End>
</AppBar.Root>
<main>
	{#if $savedRecipes.length === 0}
		<p>You haven't saved any recipes yet.</p>
	{:else if $savedRecipes.length > 0}
		<List size="three-line">
			{#each $savedRecipes as recipe}
        <hr class="border-gray-200">
				<ListItem.Root>
					<ListItem.Link href="/recipes/{recipe.id}">
						<ListItem.Text primary={recipe.title} secondary={recipe.short_description} />
					</ListItem.Link>
					<ListItem.SecondaryAction>
						<IconButton title="Delete recipe" onClick={() => deleteRecipe(recipe.id, recipe.title)} size="xs">
							<TrashIcon />
						</IconButton>
					</ListItem.SecondaryAction>
				</ListItem.Root>
			{/each}
		</List>
	{:else}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{/if}
</main>
<footer></footer>
