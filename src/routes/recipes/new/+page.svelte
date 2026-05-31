<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  import { type UserPreferencesResponse } from '$lib/api/account';
  import { CATEGORY_TAGS, type Recipe, type SavedRecipe } from '$lib/api/recipe';
  import { CloudService } from '$lib/api/cloud';
  import { db } from '$lib/db.js';
  import { networkStore } from '$lib/stores/network';
  import { deriveAICapability } from '$lib/utils/capabilities';

  import { AppBar } from '$lib/ui/AppBar';
  import Button from '$lib/ui/button.svelte';
  import Dialog from '$lib/ui/Dialog.svelte';
  import { Textarea, Textinput } from '$lib/ui/forms';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import Select from '$lib/ui/Select.svelte';
  import { TimePicker } from '$lib/ui/time-picker';
  import type { SelectOption } from '$lib/ui/types.js';

  let availableTags = $state<SelectOption[]>([]);

  let { data } = $props();

  let currentUserId = $state<string | undefined>(undefined);
  let cloudService: CloudService | undefined = $state(undefined);
  // let accountService: AccountService | undefined = $state(undefined);

  let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

  let dialogStatus = $state<'idle' | 'importing' | 'error'>('idle');

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
  // let aiRestrictionMessage = $derived.by(() => {
  //   switch (aiCapability.reason) {
  //     case 'offline':
  //       return 'You are offline. Reconnect to request full recipes or adjustments.';
  //     case 'disabled':
  //       return 'AI recipe details are unavailable in this build.';
  //     case 'unauthenticated':
  //       return 'Log in to request full recipes.';
  //     case 'unauthorized':
  //       return 'Your account does not include AI recipe requests.';
  //     default:
  //       return '';
  //   }
  // });

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
  /** The prep time in minutes for the recipe */
  let prepTimeStart = $state<number>(0);
  /** The max prep time in minutes when using a range */
  let prepTimeEnd = $state<number>(0);
  /** The cooking time in minutes for the recipe */
  let cookTimeStart = $state<number>(0);
  /** The max cooking time in minutes when using a range */
  let cookTimeEnd = $state<number>(0);
  let ingredients = $state<string>('');
  let instructions = $state<string>('');
  let notes = $state<string>('');
  let tags = $state<string[]>([]);

  /** Whether to use a range of time for the recipe */
  let usePrepTimeRange = $state<boolean>(false);

  /** Whether to use a range of time for the recipe */
  let useCookTimeRange = $state<boolean>(false);

  let openImportFromURLDialog = $state<boolean>(false);

  let recipeURL = $state<string>('');

  /**
   * Manage services for cloud and sync operations.
   */
  $effect(() => {
    const userId = data.user?.id;
    if (userId && userId !== currentUserId) {
      cloudService = new CloudService(data.supabase, userId);
      // accountService = new AccountService(data.supabase, userId);
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
   * Persist a recipe locally and optionally sync to cloud.
   * @param recipe - Validated recipe payload to save
   * @returns The saved recipe record written to Dexie
   */
  async function persistRecipe(recipe: Recipe): Promise<SavedRecipe> {
    if (hasCloudStorageAccess && cloudService) {
      try {
        const savedRecipe = await cloudService.uploadLocalRecipe(recipe);
        await db.recipes.add(savedRecipe);
        return savedRecipe;
      } catch (err) {
        console.error('Cloud save failed; continuing locally', err);
        const candidate = _createSavedRecipe(recipe, err instanceof Error ? err.message : 'Unknown sync error');
        await db.recipes.add(candidate);
        toast.error('Recipe saved locally but failed to sync to cloud');
        return candidate;
      }
    }

    const candidate = _createSavedRecipe(recipe);
    await db.recipes.add(candidate);
    return candidate;
  }

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

    // Set the prep and cook time arrays
    const prepTime = [prepTimeStart.toString()];
    const cookTime = [cookTimeStart.toString()];
    if (usePrepTimeRange && prepTimeEnd !== 0) {
      prepTime.push(prepTimeEnd.toString());
    }
    if (useCookTimeRange && cookTimeEnd !== 0) {
      cookTime.push(cookTimeEnd.toString());
    }

    let recipe: Recipe = {
      title: form.get('title')?.toString() ?? '',
      short_description: form.get('short_description')?.toString() ?? '',
      description: form.get('description')?.toString() ?? '',
      yield: form.get('yields')?.toString() ?? '',
      prep_time: prepTime,
      cook_time: cookTime,
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

    const savedRecipe = await persistRecipe(recipe);
    status = 'saved';
    toast.success('Recipe saved');
    goto(resolve(`/recipes/${savedRecipe.id}`), { replaceState: true });
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

  async function importRecipeFromURL(event: SubmitEvent) {
    event.preventDefault();

    if (!canUseAI) {
      toast.error('AI recipe import is unavailable right now');
      return;
    }

    const form = new FormData(event.target as HTMLFormElement);
    const url = form.get('recipe_url')?.toString().trim() ?? '';

    if (!url) {
      toast.error('Enter a recipe URL to import');
      return;
    }

    dialogStatus = 'importing';

    const recipeUrl = _validateUrl(url);

    try {
      const response = await fetch('/api/import/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: recipeUrl })
      });

      const result = (await response.json()) as {
        success: boolean;
        data: Recipe | null;
        error?: string;
      };

      if (!response.ok || !result.success || !result.data) {
        dialogStatus = 'error';
        toast.error(result.error ?? 'Failed to import recipe from URL');
        return;
      }

      const savedRecipe = await persistRecipe(result.data);
      openImportFromURLDialog = false;
      recipeURL = '';
      dialogStatus = 'idle';
      toast.success('Recipe imported');
      goto(resolve(`/recipes/${savedRecipe.id}`), { replaceState: true });
    } catch (err) {
      console.error('Import from URL failed', err);
      dialogStatus = 'error';
      toast.error('Failed to import recipe from URL');
    }
  }

  /** Test for http(s):// and append if missing */
  function _validateUrl(url: string): string {
    const URL_RX = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/\S*)?$/;
    return URL_RX.test(url) ? url : `https://${url}`;
  }
</script>

<svelte:head>
  <title>Add a new recipe</title>
</svelte:head>

<PageHeader>
  <AppBar.Root>
    <AppBar.End>
      {#if status === 'saving'}
        <div class="grid h-10 w-10 place-content-center">
          <ProgressSpinner size="xs" />
        </div>
      {/if}
      <Button class="text narrow" onclick={() => (openImportFromURLDialog = true)} disabled={!canUseAI}>
        <span class="hidden md:inline">Import from URL</span>
      </Button>
    </AppBar.End>
  </AppBar.Root>
</PageHeader>
<div class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
  <form method="POST" class="form" onsubmit={saveRecipe}>
    <h1 class="display-small mb-4">Create a new recipe</h1>
    <p class="helper-text italic">
      Required fields are marked with an asterisk (*).
      {#if useAiAssistance}
        <span>The AI will use its best guess for any fields you leave blank.</span>
      {/if}
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
        required={!useAiAssistance}
        error={validationErrors.errors?.shortDescription}
        label="Short description"
        placeholder="Shown in recipe list and search results."
        autocomplete="off"
        helperText={useAiAssistance ? 'Leave blank to generate with AI' : undefined}
      />
      <Textarea
        id="description"
        name="description"
        bind:value={longDescription}
        label="Long-form description"
        placeholder="A longer description with additional commentary or suggested pairings. Included in recipe details."
      >
        {#if useAiAssistance}
          <p class="helper-text">Leave blank to generate with AI</p>
        {/if}
      </Textarea>
      <Textinput
        name="yields"
        bind:value={yields}
        label="Yields"
        helperText="Enter the number of servings or total amount for sauces, dressings or similar"
        placeholder="E.g. 2 servings, 4 cups"
      />

      <!-- Prep time -->
      <div class="flex flex-row items-end gap-4">
        <div class="form-field fit-content">
          <label for="prepTimeStart" class="label-medium">Prep time</label>
          <div class="flex flex-row gap-4">
            <TimePicker bind:value={prepTimeStart} />
            {#if !usePrepTimeRange}
              <Button onclick={() => (usePrepTimeRange = true)}>Use range</Button>
            {/if}
          </div>
        </div>
        {#if usePrepTimeRange}
          <div class="flex items-end justify-center pb-1">TO</div>
          <div class="form-field fit-content">
            <label for="prepTimeEnd" class="label-medium">Prep time</label>
            <TimePicker bind:value={prepTimeEnd} />
          </div>
          <Button onclick={() => (usePrepTimeRange = false)}>Use single time</Button>
        {/if}
      </div>

      <!-- Cook time -->
      <div class="flex flex-col gap-1">
        <div class="flex flex-row items-end gap-4">
          <div class="form-field fit-content">
            <label for="cookTimeStart" class="label-large">Cook time</label>
            <div class="flex flex-row gap-4">
              <TimePicker bind:value={cookTimeStart} />
              {#if !useCookTimeRange}
                <Button onclick={() => (useCookTimeRange = true)}>Use range</Button>
              {/if}
            </div>
          </div>
          {#if useCookTimeRange}
            <div class="flex items-end justify-center pb-1">TO</div>
            <div class="form-field fit-content">
              <label for="cookTimeEnd" class="label-large">Cook time</label>
              <TimePicker bind:value={cookTimeEnd} />
            </div>
            <Button onclick={() => (useCookTimeRange = false)}>Use single time</Button>
          {/if}
        </div>
        {#if useAiAssistance}
          <p class="helper-text">The AI will use its best guess for the times if you leave either of these blank</p>
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
        <p class="helper-text">
          You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a
          > here to make lists and add formatting
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
        <p class="helper-text">
          You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a
          > here to make lists and add formatting
        </p>
      </Textarea>
      <Textarea
        id="notes"
        name="notes"
        bind:value={notes}
        label="Notes"
        placeholder="Enter any additional notes for your recipe"
      >
        <p class="helper-text">
          You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a
          > here to make lists and add formatting
        </p>
      </Textarea>
      <div class="form-field">
        <label for="tags" class="label-large"
          >Tags {#if !useAiAssistance}
            <span class="label-large text-destructive">*</span>{/if}</label
        >
        <Select
          name="tags"
          type="multiple"
          bind:value={tags}
          items={availableTags}
          error={validationErrors.errors?.tags}
        />
        {#if useAiAssistance}
          <p class="helper-text">Leave blank to generate with AI</p>
        {/if}
      </div>
      <div class="border-line my-4 border-t pt-4">
        <Button type="submit" class="primary" disabled={status === 'saving'}>Save</Button>
      </div>
    </div>
  </form>
</div>

<Dialog bind:open={openImportFromURLDialog}>
  {#snippet title()}
    <h2 class="text-lg font-semibold">Import from URL</h2>
  {/snippet}
  {#snippet description()}
    <p>Import a recipe from a URL.</p>
  {/snippet}
  <form onsubmit={importRecipeFromURL}>
    <Textinput
      name="recipe_url"
      bind:value={recipeURL}
      label="URL"
      placeholder="Enter the URL of the recipe to import"
    />
    <div class="flex flex-row-reverse">
      <Button type="submit" class="primary" disabled={dialogStatus === 'importing' || !recipeURL.trim()}>
        {#if dialogStatus === 'importing'}
          <ProgressSpinner size="xs" />
        {:else}
          Import
        {/if}
      </Button>
    </div>
  </form>
</Dialog>
