<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  import { type UserPreferencesResponse } from '$lib/api/account';
  import {
    CATEGORY_TAGS,
    type Recipe,
    type SavedRecipe
  } from '$lib/api/recipe';
  import { CloudService } from '$lib/api/cloud';
  import { db } from '$lib/db.js';
  import { networkStore } from '$lib/stores/network';
  import { deriveAICapability } from '$lib/api/auth/auth.capability';

  import { AppBar } from '$lib/ui/AppBar';
  import Button from '$lib/ui/button.svelte';
  import Dialog from '$lib/ui/Dialog.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import Select from '$lib/ui/Select.svelte';
  import { TimePicker } from '$lib/ui/time-picker';
  import type { SelectOption } from '$lib/ui/types.js';
  import { FormGroup } from '$lib/ui/form-group';
  import TextInput from '$lib/ui/text-input/text-input.svelte';
  import Textarea from '$lib/ui/textarea/textarea.svelte';

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
  let hasCloudStorageAccess = $derived(
    data.permissions?.cloudSync.allowed ?? false
  );
  let preferences = $derived<UserPreferencesResponse | null>(
    data.preferences ?? null
  );

  /** Whether the user wants to use AI assistance for augmenting user recipes. */
  let useAiAssistance = $derived(preferences?.use_ai_assistance && canUseAI);

  let formGroup = new FormGroup({
    title: '',
    short_description: '',
    description: '',
    yields: '',
    // prep_time: [],
    // cook_time: [],
    ingredients: '',
    instructions: '',
    notes: ''
    // tags: [],
  });

  /** The prep time in minutes for the recipe */
  let prepTimeStart = $state<number>(0);
  /** The max prep time in minutes when using a range */
  let prepTimeEnd = $state<number>(0);
  /** The cooking time in minutes for the recipe */
  let cookTimeStart = $state<number>(0);
  /** The max cooking time in minutes when using a range */
  let cookTimeEnd = $state<number>(0);
  let tags = $state<string[]>([]);

  /** Whether to use a range of time for the recipe */
  let usePrepTimeRange = $state<boolean>(false);

  /** Whether to use a range of time for the recipe */
  let useCookTimeRange = $state<boolean>(false);

  let openImportFromURLDialog = $state<boolean>(false);

  let recipeURL = $state<string>('');

  let markdownHelperText = $state<string>(
    'You can use&nbsp;<a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a>&nbsp;here to make lists and add formatting'
  );

  let formValid = $derived.by(() => {
    let requiredFields = [
      'title',
      'short_description',
      'ingredients',
      'instructions'
    ];
    let tagsIsValid = false;
    if (!useAiAssistance) {
      // requiredFields.push('tags');
      tagsIsValid = true;
    } else {
      if (tags.length > 0) {
        tagsIsValid = true;
      }
    }
    return (
      requiredFields.every(
        (field: string) =>
          formGroup.controls[field as keyof typeof formGroup.controls].valid
      ) && tagsIsValid
    );
  });

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
    const localRecipe = _createSavedRecipe(recipe);

    if (hasCloudStorageAccess && cloudService) {
      try {
        const cloudRecipe = await cloudService.uploadLocalRecipe(localRecipe);
        await db.recipes.add(cloudRecipe);
        return cloudRecipe;
      } catch (err) {
        console.error('Cloud save failed; continuing locally', err);
        const candidate: SavedRecipe = {
          ...localRecipe,
          synced: false,
          sync_error:
            err instanceof Error ? err.message : 'Unknown sync error'
        };
        await db.recipes.add(candidate);
        toast.error('Recipe saved locally but failed to sync to cloud');
        return candidate;
      }
    }

    await db.recipes.add(localRecipe);
    return localRecipe;
  }

  /**
   * Save the recipe.
   *
   * Checks user preferences and cloud storage access to determine proper API calls.
   * Do not use SyncService for new recipes. Handle sync manually to ensure user id is set as owner_id.
   */
  async function saveRecipe(event: SubmitEvent) {
    event.preventDefault();
    const form = new FormData(
      event.target as HTMLFormElement,
      event.submitter as HTMLButtonElement
    );

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
      notes: (form.get('notes')?.toString() ?? '').trim() || null,
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
   * Create a saved recipe object.
   * @param recipe - The recipe to create a saved recipe for.
   * @param error - The error message to set for the saved recipe.
   * @returns The saved recipe object.
   */
  function _createSavedRecipe(
    recipe: Recipe,
    error?: string | null
  ): SavedRecipe {
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
    const URL_RX =
      /^(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/\S*)?$/;
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
      {#if canUseAI}
        <Button
          class="text narrow"
          onclick={() => (openImportFromURLDialog = true)}
        >
          <span class="hidden md:inline">Import from URL</span>
        </Button>
      {/if}
    </AppBar.End>
  </AppBar.Root>
</PageHeader>
<div class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
  <form method="POST" class="form" onsubmit={saveRecipe}>
    <h1 class="display-small mb-4">Create a new recipe</h1>
    <p class="helper-text italic">
      Required fields are marked with an asterisk (<span
        class="text-destructive">*</span
      >).
      {#if useAiAssistance}
        <span
          >The AI will use its best guess for any fields you leave blank.</span
        >
      {/if}
    </p>
    <div class="flex flex-col gap-5">
      <TextInput
        name="title"
        control={formGroup.controls.title}
        labelText="Recipe title"
        required
        autocomplete="off"
      />
      <TextInput
        name="short_description"
        control={formGroup.controls.short_description}
        labelText="Short description"
        required={!useAiAssistance}
        autocomplete="off"
        helperText="Shown in recipe list and search results."
      />
      <Textarea
        name="description"
        control={formGroup.controls.description}
        labelText="Long-form description"
        helperText="A longer description with additional commentary or suggested pairings. Included in recipe details."
      ></Textarea>
      <TextInput
        name="yields"
        control={formGroup.controls.yields}
        labelText="Yields"
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
        {#if useAiAssistance}
          <p class="helper-text mt-2 mb-1">
            The AI will use its best guess for the times if you leave either of
            these blank
          </p>
        {/if}
      </div>
      <Textarea
        name="ingredients"
        control={formGroup.controls.ingredients}
        labelText="Ingredients"
        class="min-h-36!"
        required
        placeholder="Enter the ingredients for your recipe"
        helperText={markdownHelperText}
      ></Textarea>
      <Textarea
        name="instructions"
        control={formGroup.controls.instructions}
        labelText="Instructions"
        class="min-h-36!"
        required
        placeholder="Enter the instructions for your recipe"
        helperText={markdownHelperText}
      ></Textarea>
      <Textarea
        name="notes"
        control={formGroup.controls.notes}
        labelText="Notes"
        placeholder="Enter any additional notes for your recipe"
        helperText={markdownHelperText}
      ></Textarea>
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
      </div>
      <div class="border-line my-4 border-t pt-4">
        <Button
          type="submit"
          class="primary"
          disabled={status === 'saving' || !formValid}>Save</Button
        >
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
    <p>Not all websites allow automated recipe extraction.</p>
  {/snippet}
  <form onsubmit={importRecipeFromURL}>
    <TextInput
      name="recipe_url"
      bind:value={recipeURL}
      labelText="Recipe URL"
      placeholder="Enter the URL of the recipe to import"
    />
    <p>{recipeURL}</p>
    <div class="flex justify-between">
      <Button
        type="button"
        class="text narrow"
        onclick={() => (openImportFromURLDialog = false)}>Cancel</Button
      >
      <Button
        type="submit"
        class="primary narrow"
        disabled={dialogStatus === 'importing' || !recipeURL.trim()}
      >
        {#if dialogStatus === 'importing'}
          <ProgressSpinner size="xs" />
        {:else}
          Import
        {/if}
      </Button>
    </div>
  </form>
</Dialog>
