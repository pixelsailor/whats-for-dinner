<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import { CloudService, SyncService } from '$lib/api/cloud';
  import {
    CATEGORY_TAGS,
    RecipeSchema,
    type SavedRecipe
  } from '$lib/api/recipe';
  import type { ZodIssue } from 'zod';
  import { db } from '$lib/db';
  import { getRecipeStore } from '$lib/stores/recipes';

  import { AppBar } from '$lib/ui/AppBar';
  import Button from '$lib/ui/button.svelte';
  import { Textarea, Textinput } from '$lib/ui/forms';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import Select from '$lib/ui/Select.svelte';
  import { TimePicker } from '$lib/ui/time-picker';
  import type { SelectOption } from '$lib/ui/types.js';

  let { data } = $props();

  let availableTags = $state<SelectOption[]>([]);

  let pathParam = $derived(page.params.id as string);
  let isShared = $derived(pathParam.startsWith('shared/'));
  let id = $derived(isShared ? pathParam.split('/')[1]! : pathParam);

  let hasCloudStorageAccess = $derived(
    data.permissions?.cloudSync.allowed ?? false
  );

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

  let recipe = $derived<SavedRecipe | undefined>(
    recipeStoreValue.data ?? undefined
  );

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

  let recipeTitle = $state('');
  let shortDescription = $state('');
  let longDescription = $state('');
  let yields = $state('');
  /** The prep time in minutes for the recipe */
  let prepTimeStart = $state<number>(0);
  /** The max prep time in minutes when using a range */
  let prepTimeEnd = $state<number>(0);
  /** The cooking time in minutes for the recipe */
  let cookTimeStart = $state<number>(0);
  /** The max cooking time in minutes when using a range */
  let cookTimeEnd = $state<number>(0);
  let ingredients = $state('');
  let instructions = $state('');
  let notes = $state('');
  let tags = $state<string[]>([]);

  /** Whether to use a range of time for the recipe */
  let usePrepTimeRange = $state<boolean>(false);

  /** Whether to use a range of time for the recipe */
  let useCookTimeRange = $state<boolean>(false);

  let markdownHelperText = $state<string>(
    'You can use&nbsp;<a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a>&nbsp;here to make lists and add formatting'
  );

  let validationErrors = $state<{
    hasErrors?: boolean;
    errors?: {
      title?: string;
      shortDescription?: string;
      ingredients?: string;
      instructions?: string;
      tags?: string;
    };
  }>({});

  let seededRouteId = $state<string | null>(null);
  let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

  onMount(() => {
    availableTags = Object.entries(CATEGORY_TAGS).map(([key, values]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: key,
      disabled: true,
      items: values.map((tag) => ({
        label: tag,
        value: tag
      }))
    }));
  });

  function parseMinutes(value: string | undefined): number {
    if (!value) return 0;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function seedFromRecipe(r: SavedRecipe): void {
    recipeTitle = r.title;
    shortDescription = r.short_description ?? '';
    longDescription = r.description ?? '';
    yields = r.yield ?? '';
    prepTimeStart = parseMinutes(r.prep_time?.[0]);
    prepTimeEnd = parseMinutes(r.prep_time?.[1]);
    usePrepTimeRange = Boolean(r.prep_time?.[1]);
    cookTimeStart = parseMinutes(r.cook_time?.[0]);
    cookTimeEnd = parseMinutes(r.cook_time?.[1]);
    useCookTimeRange = Boolean(r.cook_time?.[1]);
    ingredients = r.ingredients ?? '';
    instructions = r.instructions ?? '';
    notes = r.notes ?? '';
    tags = [...r.tags];
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
    const prepTime = [prepTimeStart.toString()];
    const cookTime = [cookTimeStart.toString()];
    if (usePrepTimeRange && prepTimeEnd !== 0) {
      prepTime.push(prepTimeEnd.toString());
    }
    if (useCookTimeRange && cookTimeEnd !== 0) {
      cookTime.push(cookTimeEnd.toString());
    }

    return {
      title: recipeTitle.trim(),
      short_description: shortDescription.trim() || null,
      description: longDescription.trim() || '',
      ingredients: ingredients.trim(),
      instructions: instructions.trim(),
      tags: $state.snapshot(tags),
      yield: yields.trim(),
      prep_time: prepTime,
      cook_time: cookTime,
      notes: notes.trim() || ''
    };
  }

  function mapValidationErrors(issues: ZodIssue[]): void {
    const errors: NonNullable<(typeof validationErrors)['errors']> = {};
    for (const issue of issues) {
      const field = issue.path[0];
      if (field === 'title') errors.title = issue.message;
      else if (field === 'short_description')
        errors.shortDescription = issue.message;
      else if (field === 'ingredients') errors.ingredients = issue.message;
      else if (field === 'instructions') errors.instructions = issue.message;
      else if (field === 'tags') errors.tags = issue.message;
    }

    if (Object.keys(errors).length > 0) {
      validationErrors = { hasErrors: true, errors };
    } else {
      validationErrors = {
        hasErrors: true,
        errors: { title: 'Please fix the errors in the form' }
      };
    }
  }

  async function saveRecipe(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!recipe) return;

    validationErrors = {};
    const payload = buildRecipePayload();
    const parsed = RecipeSchema.safeParse(payload);
    if (!parsed.success) {
      status = 'error';
      mapValidationErrors(parsed.error.issues);
      toast.error('Please fix the errors in the form');
      return;
    }

    status = 'saving';
    const base = $state.snapshot(recipe);
    const updatedAt = new Date().toISOString();
    const merged: SavedRecipe = {
      ...base,
      ...parsed.data,
      updated_at: updatedAt
    };

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
        await db.recipes.update(recipe.id, {
          ...parsed.data,
          updated_at: updatedAt
        });
      }
      status = 'saved';
      toast.success('Recipe saved');
      await goto(resolve('/recipes/[...id]', { id: pathParam }));
    } catch (err) {
      status = 'error';
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  function cancelEdit(): void {
    goto(resolve('/recipes/[...id]', { id: pathParam }));
  }
</script>

<svelte:head>
  <title>Edit recipe</title>
</svelte:head>

<PageHeader>
  <AppBar.Root>
    <AppBar.End>
      {#if status === 'saving'}
        <div class="grid h-10 w-10 place-content-center">
          <ProgressSpinner size="xs" />
        </div>
      {/if}
    </AppBar.End>
  </AppBar.Root>
</PageHeader>

<div class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
  {#if isShared}
    <div class="mx-auto grid w-full max-w-3xl gap-4">
      <h1 class="display-small mb-4">Editing unavailable</h1>
      <p class="helper-text">
        Shared recipes are not supported for editing yet.
      </p>
      <Button type="button" onclick={cancelEdit}>Back to recipe</Button>
    </div>
  {:else if recipeStoreValue.loading}
    <div class="grid min-h-[40vh] place-content-center">
      <ProgressSpinner size="lg" />
    </div>
  {:else if recipeStoreValue.error}
    <div class="mx-auto grid w-full max-w-3xl gap-4">
      <h1 class="display-small mb-4">Something went wrong</h1>
      <p class="helper-text flex flex-wrap items-center gap-2">
        <span class="font-medium">{recipeStoreValue.error.name}</span>
        <span>|</span>
        <span>{recipeStoreValue.error.message}</span>
      </p>
      <Button type="button" onclick={cancelEdit}>Back</Button>
    </div>
  {:else if recipe}
    <form method="POST" class="form" onsubmit={saveRecipe}>
      <h1 class="display-small mb-4">Edit recipe</h1>
      <p class="helper-text italic">
        Required fields are marked with an asterisk (<span
          class="text-destructive">*</span
        >).
      </p>
      <div class="flex flex-col gap-5">
        <Textinput
          name="title"
          bind:value={recipeTitle}
          label="Recipe title"
          required
          autocomplete="off"
          error={validationErrors.errors?.title}
        />
        <Textinput
          name="short_description"
          bind:value={shortDescription}
          error={validationErrors.errors?.shortDescription}
          label="Short description"
          autocomplete="off"
          helperText="Shown in recipe list and search results."
        />
        <Textarea
          id="description"
          name="description"
          bind:value={longDescription}
          label="Long-form description"
          helperText="A longer description with additional commentary or suggested pairings. Included in recipe details."
        ></Textarea>
        <Textinput
          name="yields"
          bind:value={yields}
          label="Yields"
          helperText="Enter the number of servings or total amount for sauces, dressings or similar"
          placeholder="E.g. 2 servings, 4 cups"
        />

        <!-- Prep time -->
        <div class="flex flex-row items-end gap-4">
          <div class="form-field nohints fit-content">
            <label for="prepTimeStart" class="label-large">Prep time</label>
            <div class="flex flex-row gap-4">
              <TimePicker bind:value={prepTimeStart} />
              {#if !usePrepTimeRange}
                <Button onclick={() => (usePrepTimeRange = true)}
                  >Use range</Button
                >
              {/if}
            </div>
          </div>
          {#if usePrepTimeRange}
            <div class="flex items-end justify-center pb-1">TO</div>
            <div class="form-field nohints fit-content">
              <label for="prepTimeEnd" class="label-large">Prep time</label>
              <TimePicker bind:value={prepTimeEnd} />
            </div>
            <Button onclick={() => (usePrepTimeRange = false)}
              >Use single time</Button
            >
          {/if}
        </div>

        <!-- Cook time -->
        <div class="flex flex-col gap-1">
          <div class="flex flex-row items-end gap-4">
            <div class="form-field nohints fit-content">
              <label for="cookTimeStart" class="label-large">Cook time</label>
              <div class="flex flex-row gap-4">
                <TimePicker bind:value={cookTimeStart} />
                {#if !useCookTimeRange}
                  <Button onclick={() => (useCookTimeRange = true)}
                    >Use range</Button
                  >
                {/if}
              </div>
            </div>
            {#if useCookTimeRange}
              <div class="flex items-end justify-center pb-1">TO</div>
              <div class="form-field nohints fit-content">
                <label for="cookTimeEnd" class="label-large">Cook time</label>
                <TimePicker bind:value={cookTimeEnd} />
              </div>
              <Button onclick={() => (useCookTimeRange = false)}
                >Use single time</Button
              >
            {/if}
          </div>
        </div>
        <Textarea
          id="ingredients"
          name="ingredients"
          label="Ingredients"
          bind:value={ingredients}
          required
          error={validationErrors.errors?.ingredients}
          placeholder="Enter the ingredients for your recipe"
          helperText={markdownHelperText}
        ></Textarea>
        <Textarea
          id="instructions"
          name="instructions"
          label="Instructions"
          bind:value={instructions}
          required
          error={validationErrors.errors?.instructions}
          placeholder="Enter the instructions for your recipe"
          helperText={markdownHelperText}
        ></Textarea>
        <Textarea
          id="notes"
          name="notes"
          bind:value={notes}
          label="Notes"
          placeholder="Enter any additional notes for your recipe"
          helperText={markdownHelperText}
        ></Textarea>
        <div class="form-field">
          <label for="tags" class="label-large"
            >Tags <span class="label-large text-destructive">*</span></label
          >
          <Select
            name="tags"
            type="multiple"
            bind:value={tags}
            items={availableTags}
            error={validationErrors.errors?.tags}
          />
        </div>
        <div class="border-line my-4 flex flex-wrap gap-3 border-t pt-4">
          <Button type="submit" class="primary" disabled={status === 'saving'}
            >Save</Button
          >
          <Button
            type="button"
            disabled={status === 'saving'}
            onclick={cancelEdit}>Cancel</Button
          >
        </div>
      </div>
    </form>
  {:else}
    <div class="mx-auto grid w-full max-w-3xl gap-4">
      <h1 class="display-small mb-4">Recipe not found</h1>
      <Button type="button" onclick={() => goto(resolve('/recipes'))}
        >All recipes</Button
      >
    </div>
  {/if}
</div>
