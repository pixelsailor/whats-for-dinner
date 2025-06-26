<script lang="ts">
	import { Toolbar } from 'bits-ui';
	import { db } from '$lib/db';
  import { archivedRecipes } from '$lib/stores/recipes';
	import IconButton from '$lib/ui/IconButton.svelte';
	import RevertIcon from '$lib/ui/Icons/RevertIcon.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';

	  let alert = $state({
    type: '' as 'info' | 'warn' | 'danger' | 'success' | 'error',
    message: ''
  });

	async function restoreRecipe(id: string) {
    try {
      await db.recipes.update(id, { archived: false });
    } catch (err) {
			console.error(err);
			alert.type = 'error';
			alert.message = 'There was a problem trying to restore the recipe.'
    }
	}
</script>

<header>
	<Toolbar.Root>
		<Toolbar.Link href="/recipes">
			<BackIcon size="xs"/>
		</Toolbar.Link>
	</Toolbar.Root>
</header>
<main>
	<h1 class="m-4 text-2xl font-bold">Trash</h1>

	{#if $archivedRecipes.length > 0}
		<List>
			{#each $archivedRecipes as recipe}
        <ListItem.Root>
          <ListItem.Text primary={recipe.title} />
          <ListItem.SecondaryAction>
            <IconButton onClick={() => restoreRecipe(recipe.id)} size="xs">
              <RevertIcon />
            </IconButton>
          </ListItem.SecondaryAction>
        </ListItem.Root>
			{/each}
		</List>
	{:else}
		<p>Your trash bin is empty.</p>
	{/if}
</main>
<footer></footer>
