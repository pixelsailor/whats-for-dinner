<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { db } from '$lib/db';
	import { recipes } from '$lib/stores/recipes';
	import Button from '$lib/ui/Button/Button.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { slide } from 'svelte/transition';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import { AppBar } from '$lib/ui/AppBar';
	import PageHeader from '$lib/ui/PageHeader.svelte';

	function goBack() {
		window.history.back();
	}

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

<PageHeader>
	<AppBar.Root>
		<Button title="Back" onClick={goBack} label="Go back" size="xs" icon>
			<BackIcon />
		</Button>
		<AppBar.Text primary="My Recipes" />
		<AppBar.End>
			<Button href="/recipes/new" size="xs">
				Add a recipe
			</Button>
			<Button title="Trash bin" href="/recipes/trash" size="xs" icon>
				<TrashIcon />
			</Button>
		</AppBar.End>
	</AppBar.Root>
</PageHeader>

<main class="mx-auto min-h-screen max-w-5xl px-4">
	{#if $recipes.loading}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if $recipes.error}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
			<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				<span class="fluid-heading-03">{$recipes.error.name}</span><span>|</span><span
					>{$recipes.error?.message}</span
				>
			</p>
		</div>
	{:else if $recipes.data}
		<div class="py-24">
			<h1 class="fluid-heading-05 mb-8">My Recipes</h1>
			<List size="three-line">
				{#each $recipes.data as recipe}
					<hr class="border-gray-200 dark:border-gray-800" />
					<div transition:slide={{ duration: 300, axis: 'y' }}>
						<ListItem.Root>
							<ListItem.Link href="/recipes/{recipe.id}">
								<ListItem.Text primary={recipe.title} secondary={recipe.short_description} />
							</ListItem.Link>
							<ListItem.SecondaryAction>
								<Button
									title="Delete recipe"
									onClick={() => deleteRecipe(recipe.id, recipe.title)}
									label="Delete recipe"
									size="xs"
									icon
								>
									<TrashIcon />
								</Button>
							</ListItem.SecondaryAction>
						</ListItem.Root>
					</div>
				{/each}
			</List>
		</div>
	{/if}
</main>
