<script lang="ts">
	import { Toolbar } from 'bits-ui';
	import { toast, Toaster } from 'svelte-sonner';

	import { db } from '$lib/db';
	import { savedRecipes } from '$lib/stores/recipes';
	import { List, ListItem } from '$lib/ui/List';
	import IconButton from '$lib/ui/IconButton.svelte';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { slide } from 'svelte/transition';

	async function deleteRecipe(id: string, title: string) {
		// if (confirm('Delete this recipe?')) {
		try {
			await db.recipes.update(id, { archived: true });

			toast.success(`"${title}" deleted`, {
				action: {
					label: 'Undo',
					onClick: async () => {
						await db.recipes.update(id, { archived: false });
						toast.success(`"${title}" restored`);
					}
				}
			});
		} catch (err) {
			toast.error('Failed to delete recipe');
			console.error(err);
		}
		// }
	}
</script>

<header>
	<Toolbar.Root>
		<Toolbar.Link href="/">
			<span>Back</span>
		</Toolbar.Link>
		<Toolbar.Link href="/recipes/trash">
			<span>Trash bin</span>
		</Toolbar.Link>
	</Toolbar.Root>
</header>
<main>
	<h1 class="m-4 text-2xl font-bold">My Recipe Book</h1>
	{#if $savedRecipes.length === 0}
		<p>You haven't saved any recipes yet.</p>
	{:else if $savedRecipes.length > 0}
		<List size="three-line">
			{#each $savedRecipes as recipe}
				<ListItem.Root>
					<ListItem.Link href="/recipes/{recipe.id}">
						<ListItem.Text primary={recipe.title} secondary={recipe.short_description} />
					</ListItem.Link>
					<ListItem.SecondaryAction>
						<IconButton onClick={() => deleteRecipe(recipe.id, recipe.title)} size="xs">
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
