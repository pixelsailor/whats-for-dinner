<script lang="ts">
  import { Button } from 'bits-ui';
  import { toast } from 'svelte-sonner';

  import { CloudService, SyncService } from '$lib/api/cloud';
  import { db } from '$lib/db';

  import { deletedRecipesStore } from '$lib/stores/recipes';
  import { AppBar } from '$lib/ui/AppBar';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import RevertIcon from '$lib/ui/icons/RevertIcon.svelte';
  import TrashIcon from '$lib/ui/icons/TrashIcon.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import type { ViewState } from '$lib/types';

  let { data } = $props();

  let currentUserId = $state<string | undefined>(undefined);
  let cloudService: CloudService | undefined = $state(undefined);
  let syncService: SyncService | undefined = $state(undefined);

  let hasCloudStorageAccess = $derived(
    data.permissions?.cloudSync.allowed ?? false
  );

  let app = $state({
    status: 'loading' as ViewState,
    error: ''
  });

  /**
   * Manage services for cloud and sync operations.
   */
  $effect(() => {
    const userId = data.user?.id;
    if (userId && userId !== currentUserId) {
      cloudService = new CloudService(data.supabase, userId);
      syncService = new SyncService(cloudService);
      currentUserId = userId;
    } else if (!userId && currentUserId) {
      cloudService = undefined;
      syncService = undefined;
      currentUserId = undefined;
    }
  });

  /** Update app.status based on the deleted recipes data. */
  $effect(() => {
    if ($deletedRecipesStore.data) {
      app.status = 'idle';
    } else {
      app.status = 'loading';
    }
  });

  /**
   * Restore a recipe from the trash.
   * @param id - The id of the recipe to restore.
   */
  const restoreRecipe = async (id: string) => {
    if (!id) return;
    app.status = 'loading';
    if (hasCloudStorageAccess && syncService) {
      const response = await syncService.updateRecipeAndSyncLocal({
        id,
        deleted_at: undefined
      });
      if (!response.success) {
        toast.error(
          'The recipe was restored locally but failed to sync to the server.'
        );
        return;
      }
    } else {
      await db.recipes.update(id, { deleted_at: undefined });
    }
    app.status = 'idle';
  };

  /**
   * Permanently delete a recipe from the database and cloud.
   * @param id - The id of the recipe to delete.
   */
  const deleteRecipe = async (id: string) => {
    if (!id) return;
    app.status = 'loading';
    if (hasCloudStorageAccess && syncService) {
      const response = await syncService.deleteRecipeAndSyncLocal(id);
      if (!response.success) {
        toast.error(
          'The server encountered a problem trying to delete the recipe.'
        );
        await db.recipes.update(id, {
          synced: false,
          sync_error: response.error?.message
        });
        app.status = 'error';
        return;
      }
    } else {
      await db.recipes.delete(id);
    }
    app.status = 'idle';
  };

  const deleteAll = async () => {
    const all = $deletedRecipesStore.data?.map((recipe) => recipe.id);
    if (!all?.length) return;
    app.status = 'loading';
    if (hasCloudStorageAccess && syncService) {
      const response = await syncService.deleteDeletedRecipesAndSyncLocal(all);
      if (!response.success) {
        toast.error(
          'The server encountered a problem trying to delete the recipes.'
        );
        app.status = 'error';
        return;
      }
    } else {
      await db.recipes.bulkDelete(all);
    }
    app.status = 'idle';
  };
</script>

<PageHeader>
  <AppBar.Root>
    <!-- <AppBar.Text primary="Trash Bin" /> -->
    <AppBar.End>
      {#if app.status === 'loading'}
        <div class="grid h-10 w-10 place-content-center">
          <ProgressSpinner size="xs" />
        </div>
      {/if}
      {#if $deletedRecipesStore.data && $deletedRecipesStore.data.length}
        <Button.Root
          onclick={deleteAll}
          class="button text narrow danger"
          title="Permanently delete all recipes"
        >
          <TrashIcon size="xs" />
          <span>Empty trash</span>
        </Button.Root>
      {/if}
    </AppBar.End>
  </AppBar.Root>
</PageHeader>

<div class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
  {#if $deletedRecipesStore.loading}
    <div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
      <ProgressSpinner size="lg" />
    </div>
  {:else if $deletedRecipesStore.error}
    <div
      class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6"
    >
      <h1 class="display-medium">Ah donkey-spittle! There was a problem.</h1>
      <p class="flex items-center gap-3">
        <span class="fluid-heading-03">{$deletedRecipesStore.error.name}</span
        ><span>|</span><span>{$deletedRecipesStore.error?.message}</span>
      </p>
    </div>
  {:else if $deletedRecipesStore.data}
    <h1 class="display-small mb-3">Trash Bin</h1>
    <p class="body-large mb-8 italic">
      Deleted recipes are kept for 30 days, after which they are permanently
      deleted.
    </p>
    {#if $deletedRecipesStore.data.length > 0}
      <div class="list">
        {#each $deletedRecipesStore.data as recipe (recipe.id)}
          <hr />
          <div class="listitem">
            <span class="listitem__content">
              <span class="title-medium">{recipe.title}</span>
              <span
                class="body-medium text-foreground-alt dark:text-foreground-alt"
                >{recipe.short_description}</span
              >
            </span>
            <span class="listitem__end">
              <Button.Root
                title="Restore recipe"
                onclick={() => restoreRecipe(recipe.id)}
                class="button icon text"
              >
                <RevertIcon size="xs" />
              </Button.Root>
              <Button.Root
                title="Delete permanently"
                onclick={() => deleteRecipe(recipe.id)}
                class="button icon text danger"
              >
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
