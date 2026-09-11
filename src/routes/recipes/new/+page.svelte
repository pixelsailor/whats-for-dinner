<script lang="ts">
  import type { ActionResult } from '@sveltejs/kit';
  import DOMPurify from 'isomorphic-dompurify';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  import { type UserPreferencesResponse } from '$lib/api/account';
  import { deriveAICapability } from '$lib/api/auth/auth.capability';
  import { CloudService } from '$lib/api/cloud';
  import {
    CATEGORY_TAGS,
    type Recipe,
    type SavedRecipe
  } from '$lib/api/recipe';
  import { db } from '$lib/db.js';
  import { networkStore } from '$lib/stores/network';

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

  /**
   * Get current user permissions (cloud and AI access) from local storage if available.
   * Fallback: if using Supabase, these would be attached to user records in 'profiles'.
   * This mechanism assumes local-first/offline by default.
   */
  let hasCloudWriteAccess = $derived(
    data.permissions?.cloudWrite.allowed ?? false
  );
  let preferences = $derived<UserPreferencesResponse | null>(
    data.preferences ?? null
  );

  /** Whether the user wants to use AI assistance for augmenting user recipes. */
  let useAiAssistance = $derived(preferences?.use_ai_assistance && canUseAI);

  let recipeSource = $state<'text' | 'form' | 'url'>('form');

  let formGroup = new FormGroup({
    title: '',
    short_description: '',
    description: '',
    yield: '',
    ingredients: '',
    instructions: '',
    notes: ''
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

  let textRecipeSource = $state<string>('');

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

  async function saveRecipeFromForm(input: {
    formData: FormData;
    cancel: () => void;
  }) {
    let { formData, cancel } = input;

    let recipe = {} as Recipe;
    const multiValueKeys = new Set(['prep_time', 'cook_time', 'tags']);

    /**
     * Sanitize scalar fields in place. Do not `FormData#set` multi-value keys —
     * that replaces every entry for the name and drops all but the last value.
     */
    formData.forEach((value, key) => {
      if (typeof value !== 'string' || multiValueKeys.has(key)) return;
      const cleanValue = DOMPurify.sanitize(value.toString().trim());
      formData.set(key, cleanValue);
      (recipe as unknown as Record<string, string>)[key] = cleanValue;
    });

    const sanitizeAll = (key: string): string[] =>
      formData
        .getAll(key)
        .filter((value): value is string => typeof value === 'string')
        .map((value) => DOMPurify.sanitize(value.trim()));

    recipe.prep_time = sanitizeAll('prep_time');
    recipe.cook_time = sanitizeAll('cook_time');
    // Prefer bound select state so all chosen tags are kept even if FormData is incomplete
    recipe.tags =
      tags.length > 0
        ? tags.map((tag) => DOMPurify.sanitize(tag.trim())).filter(Boolean)
        : sanitizeAll('tags');

    /**
     * Without AI, cancel the server action and persist locally in this submit
     * handler. `use:enhance` returns early after `cancel()` and never invokes
     * a returned callback — so local save must happen here.
     */
    if (!useAiAssistance) {
      cancel();
      status = 'saving';
      try {
        const savedRecipe = await _persistRecipe(recipe);
        status = 'saved';
        toast.success('Recipe saved');
        goto(resolve(`/recipes/${savedRecipe.id}`), { replaceState: true });
      } catch (err) {
        console.error('Local recipe save failed', err);
        status = 'error';
        toast.error('Failed to save recipe');
      }
      return;
    }

    status = 'saving';

    return async ({ result }: { result: ActionResult<SavedRecipe> }) => {
      if (result.type === 'success' && result.data) {
        recipe = result.data;
      } else if (result.type === 'error' || result.type === 'failure') {
        status = 'error';
        toast.error('AI assistance failed. Recipe will be saved as is.');
      }

      try {
        const savedRecipe = await _persistRecipe(recipe);
        status = 'saved';
        toast.success('Recipe saved');
        goto(resolve(`/recipes/${savedRecipe.id}`), { replaceState: true });
      } catch (err) {
        console.error('Recipe save failed', err);
        status = 'error';
        toast.error('Failed to save recipe');
      }
    };
  }

  /** Use AI to parse fetched page content into a recipe */
  async function importRecipeFromURL(input: {
    formData: FormData;
    cancel: () => void;
  }) {
    let { formData, cancel } = input;

    if (!canUseAI) {
      toast.error('AI recipe import is unavailable right now');
      cancel();
      return;
    }

    const trimmedUrl = formData.get('recipe_url')?.toString().trim() ?? '';

    if (!trimmedUrl) {
      toast.error('Enter a recipe URL to import');
      cancel();
      return;
    }

    dialogStatus = 'importing';

    return async ({ result }: { result: ActionResult<Recipe> }) => {
      if (result.type === 'success' && result.data) {
        const savedRecipe = await _persistRecipe(result.data);
        openImportFromURLDialog = false;
        recipeURL = '';
        dialogStatus = 'idle';
        toast.success('Recipe imported');
        goto(resolve(`/recipes/${savedRecipe.id}`), { replaceState: true });
      } else if (result.type === 'error') {
        dialogStatus = 'error';
        toast.error(result.error || 'Failed to import recipe from URL');
      }
    };
  }

  /**
   * Saves a recipe using a single `textarea` input as the recipe source and passes it to the server for AI parsing.
   * May be used without AI assistance if markdown formatting is used.
   * @param input
   * @returns A function that can be used to save the recipe.
   * @todo Add validation for markdown formatting.
   */
  async function saveRecipeFromText(input: {
    formData: FormData;
    cancel: () => void;
  }) {
    let { formData, cancel } = input;

    if (!textRecipeSource.trim()) return;

    if (!canUseAI) {
      toast.error('AI recipe import is unavailable right now');
      cancel();
      return;
    }

    const trimmedRecipeBlock =
      formData.get('recipe_block')?.toString().trim() ?? '';

    if (!trimmedRecipeBlock) {
      toast.error('Enter a recipe to import');
      cancel();
      return;
    }

    status = 'saving';

    return async ({ result }: { result: ActionResult<Recipe> }) => {
      if (result.type === 'success' && result.data) {
        const savedRecipe = await _persistRecipe(result.data);
        status = 'saved';
        toast.success('Recipe saved');
        goto(resolve(`/recipes/${savedRecipe.id}`), { replaceState: true });
      } else if (result.type === 'error') {
        status = 'error';
        toast.error(result.error || 'Failed to save recipe from text');
      }
    };
  }

  /**
   * Persist a recipe locally and optionally sync to cloud.
   * @param recipe - Validated recipe payload to save
   * @returns The saved recipe record written to Dexie
   */
  async function _persistRecipe(recipe: Recipe): Promise<SavedRecipe> {
    const localRecipe = _createSavedRecipe(recipe);

    if (hasCloudWriteAccess && cloudService) {
      try {
        const cloudRecipe = await cloudService.uploadLocalRecipe(localRecipe);
        await db.recipes.add(cloudRecipe);
        return cloudRecipe;
      } catch (err) {
        console.error('Cloud save failed; continuing locally', err);
        const candidate: SavedRecipe = {
          ...localRecipe,
          synced: false,
          sync_error: err instanceof Error ? err.message : 'Unknown sync error'
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
          class={['text narrow', recipeSource === 'text' ? 'hidden!' : '']}
          onclick={() => (recipeSource = 'text')}
          disabled={status === 'saving'}
        >
          <span class="hidden md:inline">Add recipe as text</span>
        </Button>
        <Button
          class={['text narrow', recipeSource !== 'text' ? 'hidden!' : '']}
          onclick={() => (recipeSource = 'form')}
          disabled={status === 'saving'}
        >
          <span class="hidden md:inline">Return to form</span>
        </Button>
        <Button
          class="text narrow"
          onclick={() => (openImportFromURLDialog = true)}
          disabled={status === 'saving'}
        >
          <span class="hidden md:inline">Import from URL</span>
        </Button>
      {/if}
    </AppBar.End>
  </AppBar.Root>
</PageHeader>
<div class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
  <h1 class="display-small mb-8">Create a new recipe</h1>
  {#if recipeSource === 'text'}
    <form method="POST" action="?/viatext" use:enhance={saveRecipeFromText}>
      <Textarea
        name="recipe_block"
        class="min-h-[60dvh]!"
        bind:value={textRecipeSource}
        labelText="Recipe text"
        placeholder="Add your recipe here. This can be just about anything -- from simple text, to formatted text with markdown, to a recipe copied and pasted from a website."
        helperText={markdownHelperText}
        disabled={status === 'saving'}
      ></Textarea>
      <hr class="border-line my-8" />
      <Button
        type="submit"
        class="primary narrow"
        disabled={status === 'saving'}
      >
        Save recipe
      </Button>
    </form>
  {:else}
    <form
      method="POST"
      class="form"
      action="?/viaform"
      use:enhance={saveRecipeFromForm}
    >
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
          name="yield"
          control={formGroup.controls.yield}
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
              The AI will use its best guess for the times if you leave either
              of these blank
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
      <input type="hidden" name="prep_time" value={prepTimeStart.toString()} />
      <input type="hidden" name="prep_time" value={prepTimeEnd.toString()} />
      <input type="hidden" name="cook_time" value={cookTimeStart.toString()} />
      <input type="hidden" name="cook_time" value={cookTimeEnd.toString()} />
    </form>
  {/if}
</div>

<Dialog bind:open={openImportFromURLDialog}>
  {#snippet title()}
    <h2 class="text-lg font-semibold">Import from URL</h2>
  {/snippet}
  {#snippet description()}
    <p>Import a recipe from a URL.</p>
    <p>Not all websites allow automated recipe extraction.</p>
  {/snippet}
  <form method="POST" action="?/viaurl" use:enhance={importRecipeFromURL}>
    <TextInput
      name="recipe_url"
      bind:value={recipeURL}
      labelText="Recipe URL"
      placeholder="Enter the URL of the recipe to import"
    />
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
