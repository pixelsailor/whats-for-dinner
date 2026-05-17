<script lang="ts">
  import { Button } from 'bits-ui';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  import { goto } from '$app/navigation';

  import { CATEGORY_TAGS, type Recipe, type SavedRecipe } from '$lib/api/recipe';
  import { db } from '$lib/db.js';
  // import Button from '$lib/ui/Button/Button.svelte';
  import Select from '$lib/ui/Select.svelte';
  import { Textarea, Textinput } from '$lib/ui/forms';
  import type { SelectOption } from '$lib/ui/types.js';
  // import RecipeTime from '$lib/ui/RecipeTime.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import { AppBar } from '$lib/ui/AppBar';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import { CloudService } from '$lib/api/cloud';
  import { deriveAICapability } from '$lib/utils/capabilities';
  import { networkStore } from '$lib/stores/network';
  import { AccountService, type UserPreferences, type UserPreferencesResponse } from '$lib/api/account';

  let availableTags = $state<SelectOption[]>([]);

  let { data } = $props();

  let currentUserId = $state<string | undefined>(undefined);
  let cloudService: CloudService | undefined = $state(undefined);
  let accountService: AccountService | undefined = $state(undefined);

  let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

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

  let network = $derived($networkStore);
  let aiCapability = $derived(
    deriveAICapability({
      session: data.session,
      permissions: data.permissions,
      featureFlags: data.featureFlags,
      online: network.online
    })
  );
  let canUseAI = $derived(aiCapability.canUseAI);
  let aiRestrictionMessage = $derived.by(() => {
    switch (aiCapability.reason) {
      case 'offline':
        return 'You are offline. Reconnect to request full recipes or adjustments.';
      case 'disabled':
        return 'AI recipe details are unavailable in this build.';
      case 'unauthenticated':
        return 'Log in to request full recipes.';
      case 'unauthorized':
        return 'Your account does not include AI recipe requests.';
      default:
        return '';
    }
  });

  /**
   * Get current user permissions (cloud and AI access) from local storage if available.
   * Fallback: if using Supabase, these would be attached to user records in 'profiles'.
   * This mechanism assumes local-first/offline by default.
   */
  // let hasAssistedRecipeAccess = $derived(data.permissions?.aiAssistedRecipe.allowed ?? false);
  let hasCloudStorageAccess = $derived(data.permissions?.cloudSync.allowed ?? false);
  let preferences = $derived<UserPreferencesResponse | null>(data.preferences ?? null);

  /** Whether the user wants to use AI assistance for augmenting user recipes. */
  let useAiAssistance = $derived(preferences?.use_ai_assistance && canUseAI);

  let recipeTitle = $state<string>('');
  let shortDescription = $state<string>('');
  let longDescription = $state<string>('');
  let yields = $state<string>('');
  let prepTimeHours = $state<number>(0);
  let prepTimeMinutes = $state<number>(0);
  let cookTimeHours = $state<number>(0);
  let cookTimeMinutes = $state<number>(0);
  let ingredients = $state<string>('');
  let instructions = $state<string>('');
  let notes = $state<string>('');
  let tags = $state<string[]>([]);

  // Parse the `Slider` component as a string
  // function insertServingValue(): string {
  // 	yield = 'Serves ' + ((servingRange[1] - servingRange[0] === 0) ? `${servingRange[0]}` : servingRange.join(' to '));
  // 	return yield;
  // }

  /**
   * Manage services for cloud and sync operations.
   */
  $effect(() => {
    const userId = data.user?.id;
    if (userId && userId !== currentUserId) {
      cloudService = new CloudService(data.supabase, userId);
      accountService = new AccountService(data.supabase, userId);
      // syncService = new SyncService(cloudService);
      currentUserId = userId;
    } else if (!userId && currentUserId) {
      cloudService = undefined;
      // syncService = undefined;
      currentUserId = undefined;
    }
  });

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

  /**
   * Save the recipe.
   *
   * Checks user preferences and cloud storage access to determine proper API calls.
   * Do not use SyncService for new recipes. Handle sync manually to ensure user id is set as owner_id.
   */
  async function saveRecipe(event: SubmitEvent) {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement, event.submitter as HTMLButtonElement);

    validateForm();
    if (validationErrors.hasErrors) {
      status = 'error';
      toast.error('Please fix the errors in the form');
      return;
    }
    status = 'saving';

    // let candidate: SavedRecipe | undefined = undefined;
    const prepTime = [_convertTimeToMinutes(prepTimeHours.toString(), prepTimeMinutes.toString())];
    const cookTime = [_convertTimeToMinutes(cookTimeHours.toString(), cookTimeMinutes.toString())];

    let recipe: Recipe = {
      title: form.get('title')?.toString() ?? '',
      short_description: form.get('short_description')?.toString() ?? '',
      description: form.get('description')?.toString() ?? '',
      yield: form.get('yields')?.toString() ?? '',
      prep_time: _isEmptyTimeRange(prepTime) ? null : prepTime,
      cook_time: _isEmptyTimeRange(cookTime) ? null : cookTime,
      ingredients: form.get('ingredients')?.toString() ?? '',
      instructions: form.get('instructions')?.toString() ?? '',
      notes: form.get('notes')?.toString() ?? '',
      tags: $state.snapshot(tags)
    };

    if (useAiAssistance) {
      try {
        const response = await fetch('/api/recipes/new', {
          method: 'POST',
          body: JSON.stringify({ recipe, preferences })
        });
        const data = await response.json();
        recipe = data.data;
      } catch (err) {
        console.error('AI assistance failed', err);
        status = 'error';
        toast.error('AI assistance failed. Recipe will be saved as is.');
        return;
      }
    }

    if (hasCloudStorageAccess && cloudService) {
      try {
        const savedRecipe = await cloudService.uploadLocalRecipe(recipe);
        await db.recipes.add(savedRecipe);
        status = 'saved';
        toast.success('Recipe saved');
        goto(`/recipes/${savedRecipe.id}`, { replaceState: true });
      } catch (err) {
        console.error('Cloud save failed; continuing locally', err);
        status = 'error';
        const candidate = _createSavedRecipe(recipe, err instanceof Error ? err.message : 'Unknown sync error');
        await db.recipes.add(candidate);
        toast.error('Recipe saved locally but failed to sync to cloud');
        goto(`/recipes/${candidate.id}`, { replaceState: true });
      }
    } else {
      const candidate = _createSavedRecipe(recipe);
      await db.recipes.add(candidate);
      status = 'saved';
      toast.success('Recipe saved');
      goto(`/recipes/${candidate.id}`, { replaceState: true });
    }
  }

  /**
   * Validate the form fields and set the validation errors.
   */
  function validateForm() {
    let errors: {
      title?: string;
      shortDescription?: string;
      ingredients?: string;
      instructions?: string;
      tags?: string;
    } = {};
    if (!recipeTitle.trim()) errors.title = 'Title is required';
    if (!ingredients.trim()) errors.ingredients = 'Ingredients are required';
    if (!instructions.trim()) errors.instructions = 'Instructions are required';
    if (!useAiAssistance && !shortDescription.trim()) errors.shortDescription = 'Short description is required';
    if (!useAiAssistance && !tags.length) errors.tags = 'Tags are required';

    if (Object.keys(errors).length > 0) {
      validationErrors.hasErrors = true;
      validationErrors.errors = errors;
    } else {
      validationErrors.hasErrors = false;
      validationErrors.errors = undefined;
    }
  }

  function selectAll(event: Event) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  function _convertTimeToMinutes(hours: string, minutes: string): string {
    const hoursInt = parseInt(hours.trim());
    const minutesInt = parseInt(minutes.trim());
    const time = hoursInt * 60 + minutesInt;
    return time.toString();
  }

  /**
   * Create a saved recipe object.
   * @param recipe - The recipe to create a saved recipe for.
   * @param error - The error message to set for the saved recipe.
   * @returns The saved recipe object.
   */
  function _createSavedRecipe(recipe: Recipe, error?: string | null): SavedRecipe {
    const userId = data.user?.id;
    const now = new Date().toISOString();
    const savedRecipe: SavedRecipe = {
      ...recipe,
      synced: false,
      sync_error: error ?? null,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      archived: null,
      deleted_at: null,
      last_opened: now,
      version: 1,
      checkout_history: [],
      is_current: true,
      is_favorite: false,
      owner_id: userId ?? null,
      shared_id: null,
      last_synced_at: null,
      parent_id: null
    };
    return savedRecipe;
  }

  /** Determine if the time fields are blank or zero */
  function _isEmptyTimeRange(range: string[]): boolean {
    if (!range.length) return true;
    return range.every((time) => time === '0');
  }
</script>

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
  <h1 class="display-small mb-4">Create a new recipe</h1>
  <form method="POST" onsubmit={saveRecipe}>
    <div class="flex flex-col gap-5">
      <Textinput name="title" bind:value={recipeTitle} label="Recipe title" required error={validationErrors.errors?.title} />
      <Textinput
        name="short_description"
        bind:value={shortDescription}
        required={!useAiAssistance}
        error={validationErrors.errors?.shortDescription}
        label="Short description"
        placeholder="Shown in recipe list and search results."
        helperText="Leave blank to generate with AI"
      />
      <Textarea
        id="description"
        name="description"
        bind:value={longDescription}
        label="Long-form description"
        placeholder="A longer description with additional commentary or suggested pairings. Included in recipe details."
      >
        <p class="label-small">Leave blank to generate with AI</p>
      </Textarea>
      <Textinput name="yields" bind:value={yields} label="Yields" placeholder="Enter the number of servings or total amount for sauces, dressings or similar" />
      <div class="flex flex-col gap-1">
        <div class="flex flex-row gap-16">
          <div class="form-field">
            <label for="prepTime" class="label-medium">Prep time</label>
            <div class="textinput flow-row flex items-center gap-1">
              <input
                type="number"
                id="prepHours"
                name="prep_time_hours"
                bind:value={prepTimeHours}
                class="w-16"
                min="0"
                max="23"
                onfocus={(event) => selectAll(event)}
              />
              <span>:</span>
              <input
                type="number"
                id="prepMinutes"
                name="prep_time_minutes"
                bind:value={prepTimeMinutes}
                class="w-16"
                min="0"
                max="59"
                onfocus={(event) => selectAll(event)}
              />
            </div>
          </div>
          <div class="form-field">
            <label for="cookTime" class="label-medium">Cook time</label>
            <div class="textinput flow-row flex items-center gap-1">
              <input
                type="number"
                id="cookHours"
                name="cook_time_hours"
                bind:value={cookTimeHours}
                class="w-16"
                min="0"
                max="23"
                onfocus={(event) => selectAll(event)}
              />
              <span>:</span>
              <input
                type="number"
                id="cookMinutes"
                name="cook_time_minutes"
                bind:value={cookTimeMinutes}
                class="w-16"
                min="0"
                max="59"
                onfocus={(event) => selectAll(event)}
              />
            </div>
          </div>
        </div>
        {#if useAiAssistance}
          <p class="label-small">The AI will use its best guess for the times if you leave either of these blank</p>
        {/if}
      </div>
      <Textarea
        id="ingredients"
        name="ingredients"
        label="Ingredients"
        bind:value={ingredients}
        required
        error={validationErrors.errors?.ingredients}
        placeholder="Enter the ingredients for your recipe"
      >
        <p class="label-small">
          You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a> here to make lists and add formatting
        </p>
      </Textarea>
      <Textarea
        id="instructions"
        name="instructions"
        label="Instructions"
        bind:value={instructions}
        required
        error={validationErrors.errors?.instructions}
        placeholder="Enter the instructions for your recipe"
      >
        <p class="label-small">
          You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a> here to make lists and add formatting
        </p>
      </Textarea>
      <Textarea id="notes" name="notes" bind:value={notes} label="Notes" placeholder="Enter any additional notes for your recipe">
        <p class="label-small">
          You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a> here to make lists and add formatting
        </p>
      </Textarea>
      <div class="form-field">
        <label for="tags" class="label-medium"
          >Tags {#if !useAiAssistance}
            <span class="label-large text-destructive">*</span>{/if}</label
        >
        <Select name="tags" type="multiple" bind:value={tags} items={availableTags} error={validationErrors.errors?.tags} />
        {#if useAiAssistance}
          <p class="label-small">Leave blank to generate with AI</p>
        {/if}
      </div>
      <div class="border-line my-4 border-t pt-4">
        <Button.Root type="submit" class="button primary" disabled={status === 'saving'}>Save</Button.Root>
      </div>
    </div>
  </form>
</div>
