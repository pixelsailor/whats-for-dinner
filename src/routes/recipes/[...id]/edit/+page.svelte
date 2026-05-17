<script lang="ts">
  import { toast } from 'svelte-sonner';

  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import { CloudService, SyncService } from '$lib/api/cloud';
  import { RecipeSchema, type SavedRecipe } from '$lib/api/recipe';
  import { db } from '$lib/db';
  import { getRecipeStore } from '$lib/stores/recipes';

  import { AppBar } from '$lib/ui/AppBar';
  import Button from '$lib/ui/Button/Button.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

  let { data } = $props();

  let pathParam = $derived(page.params.id as string);
  let isShared = $derived(pathParam.startsWith('shared/'));
  let id = $derived(isShared ? pathParam.split('/')[1]! : pathParam);

  let hasCloudStorageAccess = $derived(data.permissions?.cloudSync.allowed ?? false);

  let currentUserId = $state<string | undefined>(undefined);
  let cloudService: CloudService | undefined = $state(undefined);
  let syncService: SyncService | undefined = $state(undefined);

  let recipeStore = $derived.by(() => {
    if (!id) return undefined;
    if (isShared) return undefined;
    return getRecipeStore(id);
  });

  type RecipeStoreValue = {
    data: SavedRecipe | null;
    loading: boolean;
    error: Error | null;
  };

  let recipeStoreValue = $state<RecipeStoreValue>({
    data: null,
    loading: true,
    error: null
  });

  $effect(() => {
    const store = recipeStore;
    if (!store) {
      recipeStoreValue = { data: null, loading: false, error: null };
      return;
    }

    const unsubscribe = store.subscribe((value) => {
      recipeStoreValue = value;
    });

    return () => unsubscribe();
  });

  let recipe = $derived<SavedRecipe | undefined>(recipeStoreValue.data ?? undefined);

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

  /** Form fields — recipe content only */
  let title = $state('');
  let shortDescription = $state('');
  let description = $state('');
  let recipeYield = $state('');
  let prepMin = $state('');
  let prepMax = $state('');
  let cookMin = $state('');
  let cookMax = $state('');
  let ingredients = $state('');
  let instructions = $state('');
  let notes = $state('');
  let tagsText = $state('');

  let seededRouteId = $state<string | null>(null);
  let saving = $state(false);
  let validationMessage = $state('');

  function tupleFromMinuteInputs(a: string, b: string): string[] | null {
    const x = a.trim();
    const y = b.trim();
    if (!x && !y) return null;
    if (x && y) return [x, y];
    return x ? [x] : [y];
  }

  function seedFromRecipe(r: SavedRecipe): void {
    title = r.title;
    shortDescription = r.short_description ?? '';
    description = r.description ?? '';
    recipeYield = r.yield ?? '';
    prepMin = r.prep_time?.[0] ?? '';
    prepMax = r.prep_time?.[1] ?? '';
    cookMin = r.cook_time?.[0] ?? '';
    cookMax = r.cook_time?.[1] ?? '';
    ingredients = r.ingredients ?? '';
    instructions = r.instructions ?? '';
    notes = r.notes ?? '';
    tagsText = r.tags.join(', ');
  }

  $effect(() => {
    const route = id;
    const r = recipe;
    if (!route || !r || r.id !== route) return;
    if (seededRouteId === route) return;
    seededRouteId = route;
    seedFromRecipe(r);
  });

  function buildRecipePayload() {
    const tags = tagsText
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    return {
      title: title.trim(),
      short_description: shortDescription.trim() || null,
      description: description.trim() || null,
      ingredients: ingredients.trim(),
      instructions: instructions.trim(),
      tags,
      yield: recipeYield.trim(),
      prep_time: tupleFromMinuteInputs(prepMin, prepMax),
      cook_time: tupleFromMinuteInputs(cookMin, cookMax),
      notes: notes.trim() || null
    };
  }

  async function saveRecipe(): Promise<void> {
    if (!recipe) return;

    validationMessage = '';
    const payload = buildRecipePayload();
    const parsed = RecipeSchema.safeParse(payload);
    if (!parsed.success) {
      validationMessage = parsed.error.issues.map((i) => i.message).join(' ');
      return;
    }

    saving = true;
    const base = $state.snapshot(recipe);
    const updatedAt = new Date().toISOString();
    const merged: SavedRecipe = { ...base, ...parsed.data, updated_at: updatedAt };

    try {
      if (hasCloudStorageAccess && syncService) {
        if (recipe.synced) {
          const candidate: Partial<SavedRecipe> & { id: string } = {
            ...parsed.data,
            id: recipe.id,
            updated_at: updatedAt
          };
          await syncService.updateRecipeAndSyncLocal(candidate);
        } else {
          await syncService.uploadRecipeAndSyncLocal(merged);
        }
      } else {
        await db.recipes.update(recipe.id, { ...parsed.data, updated_at: updatedAt });
      }
      toast.success('Recipe saved');
      await goto(resolve('/recipes/[...id]', { id: pathParam }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      saving = false;
    }
  }

  function cancelEdit(): void {
    goto(resolve('/recipes/[...id]', { id: pathParam }));
  }
</script>

<PageHeader>
  <AppBar.Root>
    <AppBar.Text primary="Edit recipe" secondary={recipe?.title ?? ''} />
    <AppBar.End>
      {#if saving}
        <div class="grid h-10 w-10 place-content-center">
          <ProgressSpinner size="xs" />
        </div>
      {/if}
    </AppBar.End>
  </AppBar.Root>
</PageHeader>

<article class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
  {#if isShared}
    <div class="mx-auto grid w-full max-w-3xl gap-4">
      <h1 class="fluid-heading-05">Editing unavailable</h1>
      <p class="text-muted-foreground">Shared recipes are not supported for editing yet.</p>
      <Button type="button" cue="outlined" onClick={cancelEdit}>Back to recipe</Button>
    </div>
  {:else if recipeStoreValue.loading}
    <div class="grid min-h-[40vh] place-content-center">
      <ProgressSpinner size="lg" />
    </div>
  {:else if recipeStoreValue.error}
    <div class="mx-auto grid w-full max-w-3xl gap-4">
      <h1 class="fluid-heading-05">Something went wrong</h1>
      <p class="flex flex-wrap items-center gap-2">
        <span class="font-medium">{recipeStoreValue.error.name}</span>
        <span>|</span>
        <span>{recipeStoreValue.error.message}</span>
      </p>
      <Button type="button" cue="outlined" onClick={cancelEdit}>Back</Button>
    </div>
  {:else if recipe}
    <form
      class="flex flex-col gap-8"
      onsubmit={(e) => {
        e.preventDefault();
        void saveRecipe();
      }}
    >
      {#if validationMessage}
        <p
          class="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
          role="alert"
        >
          {validationMessage}
        </p>
      {/if}

      <div class="flex flex-col gap-2">
        <label class="label-large" for="recipe-title">Title</label>
        <input
          id="recipe-title"
          class="border-input bg-background w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          type="text"
          autocomplete="off"
          bind:value={title}
          required
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="label-large" for="recipe-short-description">Short description</label>
        <input
          id="recipe-short-description"
          class="border-input bg-background w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          type="text"
          autocomplete="off"
          bind:value={shortDescription}
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="label-large" for="recipe-description">Description</label>
        <textarea
          id="recipe-description"
          class="border-input bg-background min-h-[120px] w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          rows={4}
          bind:value={description}
        ></textarea>
      </div>

      <div class="flex flex-col gap-2">
        <label class="label-large" for="recipe-yield">Yield</label>
        <input
          id="recipe-yield"
          class="border-input bg-background w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          type="text"
          autocomplete="off"
          bind:value={recipeYield}
          placeholder="e.g. 4 servings"
        />
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <fieldset class="flex flex-col gap-3 rounded-md border border-transparent">
          <legend class="label-large mb-1">Prep time (minutes)</legend>
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex min-w-[6rem] flex-1 flex-col gap-1">
              <label class="text-muted-foreground text-sm" for="prep-min">Min</label>
              <input
                id="prep-min"
                class="border-input bg-background w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                bind:value={prepMin}
              />
            </div>
            <div class="flex min-w-[6rem] flex-1 flex-col gap-1">
              <label class="text-muted-foreground text-sm" for="prep-max">Max (optional)</label>
              <input
                id="prep-max"
                class="border-input bg-background w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                bind:value={prepMax}
              />
            </div>
          </div>
        </fieldset>
        <fieldset class="flex flex-col gap-3 rounded-md border border-transparent">
          <legend class="label-large mb-1">Cook time (minutes)</legend>
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex min-w-[6rem] flex-1 flex-col gap-1">
              <label class="text-muted-foreground text-sm" for="cook-min">Min</label>
              <input
                id="cook-min"
                class="border-input bg-background w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                bind:value={cookMin}
              />
            </div>
            <div class="flex min-w-[6rem] flex-1 flex-col gap-1">
              <label class="text-muted-foreground text-sm" for="cook-max">Max (optional)</label>
              <input
                id="cook-max"
                class="border-input bg-background w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                bind:value={cookMax}
              />
            </div>
          </div>
        </fieldset>
      </div>

      <div class="flex flex-col gap-2">
        <label class="label-large" for="recipe-ingredients">Ingredients</label>
        <p class="text-muted-foreground text-sm">Markdown list (e.g. lines starting with "- ").</p>
        <textarea
          id="recipe-ingredients"
          class="border-input bg-background min-h-[180px] w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          rows={10}
          bind:value={ingredients}
          required
        ></textarea>
      </div>

      <div class="flex flex-col gap-2">
        <label class="label-large" for="recipe-instructions">Instructions</label>
        <p class="text-muted-foreground text-sm">Markdown numbered or bullet steps.</p>
        <textarea
          id="recipe-instructions"
          class="border-input bg-background min-h-[220px] w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          rows={12}
          bind:value={instructions}
          required
        ></textarea>
      </div>

      <div class="flex flex-col gap-2">
        <label class="label-large" for="recipe-notes">Notes</label>
        <textarea
          id="recipe-notes"
          class="border-input bg-background min-h-[100px] w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          rows={4}
          bind:value={notes}
        ></textarea>
      </div>

      <div class="flex flex-col gap-2">
        <label class="label-large" for="recipe-tags">Tags</label>
        <p class="text-muted-foreground text-sm">Comma-separated (lowercase).</p>
        <input
          id="recipe-tags"
          class="border-input bg-background w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          type="text"
          autocomplete="off"
          bind:value={tagsText}
        />
      </div>

      <div class="flex flex-wrap gap-3 pt-2">
        <Button type="submit" cue="filled" primary disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" cue="outlined" disabled={saving} onClick={cancelEdit}>Cancel</Button>
      </div>
    </form>
  {:else}
    <div class="mx-auto grid w-full max-w-3xl gap-4">
      <h1 class="fluid-heading-05">Recipe not found</h1>
      <Button type="button" cue="outlined" onClick={() => goto(resolve('/recipes'))}>All recipes</Button>
    </div>
  {/if}
</article>
