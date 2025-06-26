<script lang="ts">
	import { Toolbar } from 'bits-ui';

	import { db } from '$lib/db';
	import { savedRecipes } from '$lib/stores/recipes';
  import { List, ListItem } from '$lib/ui/List';
	import IconButton from '$lib/ui/IconButton.svelte';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';

  async function deleteRecipe(id: string) {
    if (confirm('Delete this recipe?')) {
      await db.recipes.delete(id);
    }
  }
</script>

<header>
	<Toolbar.Root>
		<Toolbar.Link href="/">
			<span>Back</span>
		</Toolbar.Link>
	</Toolbar.Root>
</header>
<main>
	<h1 class="m-4 text-2xl font-bold">My Recipe Book</h1>

	{#if $savedRecipes.length > 0}
		<List size="three-line">
			{#each $savedRecipes as recipe}
        <ListItem.Root>
          <ListItem.Link href="/recipes/{recipe.id}">
            <ListItem.Text primary={recipe.title} secondary={recipe.short_description} />
          </ListItem.Link>
          <ListItem.SecondaryAction>
            <IconButton onClick={() => deleteRecipe(recipe.id)} size="xs">
              <TrashIcon />
            </IconButton>
          </ListItem.SecondaryAction>
        </ListItem.Root>
			{/each}
		</List>
	{:else}
		<p>You haven't saved any recipes yet.</p>
	{/if}
</main>
<footer></footer>
