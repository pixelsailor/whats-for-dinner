<script lang="ts">
  import type { SubmitFunction } from '@sveltejs/kit';
  import { RadioGroup } from 'bits-ui';
  import { toast } from 'svelte-sonner';
  import { enhance } from '$app/forms';

  import type { ViewState } from '$lib/types';
  // import { AppBar } from '$lib/ui/AppBar';
  import Button from '$lib/ui/button.svelte';
  // import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import Select from '$lib/ui/Select.svelte';
  import type {
    UserPreferences,
    UserPreferencesResponse
  } from '$lib/api/account';
  import Textinput from '$lib/ui/forms/Textinput.svelte';

  const options: Record<
    string,
    { value: string; label: string; disabled?: boolean }[]
  > = {
    diet: [
      { value: 'dairy-free', label: 'Dairy-free' },
      { value: 'diabetic-friendly', label: 'Diabetic-friendly' },
      { value: 'gluten-free', label: 'Gluten-free' },
      { value: 'keto', label: 'Keto' },
      { value: 'low-carb', label: 'Low-carb' },
      { value: 'low-fat', label: 'Low-fat' },
      { value: 'mediterranean', label: 'Mediterranean' },
      { value: 'paleo', label: 'Paleo' },
      { value: 'pescatarian', label: 'Pescatarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'vegetarian', label: 'Vegetarian' }
    ],
    allergies: [
      { value: 'dairy', label: 'Dairy' },
      { value: 'eggs', label: 'Eggs' },
      { value: 'fish', label: 'Fish' },
      { value: 'gluten', label: 'Gluten' },
      { value: 'mustard', label: 'Mustard' },
      { value: 'peanuts', label: 'Peanuts' },
      { value: 'sesame', label: 'Sesame' },
      { value: 'shellfish', label: 'Shellfish' },
      { value: 'soy', label: 'Soy' },
      { value: 'sulfites', label: 'Sulfites' },
      { value: 'tree-nuts', label: 'Tree nuts' }
    ],
    equipment: [
      { value: 'air-fryer', label: 'Air fryer' },
      { value: 'blender', label: 'Blender' },
      { value: 'cast-iron-skillet', label: 'Cast iron skillet' },
      { value: 'food-processor', label: 'Food processor' },
      { value: 'grill', label: 'Grill' },
      {
        value: 'instant-pot-pressure-cooker',
        label: 'Instant Pot / Pressure cooker'
      },
      { value: 'microwave', label: 'Microwave' },
      { value: 'oven', label: 'Oven' },
      { value: 'slow-cooker', label: 'Slow cooker' },
      { value: 'sous-vide', label: 'Sous vide' },
      { value: 'stand-mixer', label: 'Stand mixer' },
      { value: 'stovetop', label: 'Stovetop' },
      { value: 'toaster-oven', label: 'Toaster oven' },
      { value: 'waffle-maker', label: 'Waffle maker' }
    ],
    prepTime: [
      { value: 'under-30-minutes', label: 'Under 30 minutes' },
      { value: '30-60-minutes', label: '30-60 minutes' },
      { value: 'no-time-limit', label: 'No time limit' }
    ],
    skillLevel: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ]
  };

  // DON'T DELETE THIS -- might revert back to string arrays
  // const options = {
  // 	diet: [
  // 		'Dairy-free',
  // 		'Diabetic-friendly',
  // 		'Gluten-free',
  // 		'Keto',
  // 		'Low-carb',
  // 		'Low-fat',
  // 		'Mediterranean',
  // 		'Paleo',
  // 		'Pescatarian',
  // 		'Vegan',
  // 		'Vegetarian'
  // 	],
  // 	allergies: [
  // 		'Dairy',
  // 		'Eggs',
  // 		'Fish',
  // 		'Gluten',
  // 		'Mustard',
  // 		'Peanuts',
  // 		'Sesame',
  // 		'Shellfish',
  // 		'Soy',
  // 		'Sulfites',
  // 		'Tree nuts'
  // 	],
  // 	equipment: [
  // 		'Air fryer',
  // 		'Blender',
  // 		'Cast iron skillet',
  // 		'Food processor',
  // 		'Grill',
  // 		'Instant Pot / Pressure cooker',
  // 		'Microwave',
  // 		'Oven',
  // 		'Slow cooker',
  // 		'Sous vide',
  // 		'Stand mixer',
  // 		'Stovetop',
  // 		'Toaster oven',
  // 		'Waffle maker'
  // 	],
  // 	prepTime: ['under 30 minutes', '30-60 minutes', 'no time limit'],
  // 	skillLevel: ['beginner', 'intermediate', 'advanced']
  // };

  const toTextFromArray = (items: string[]) => items.join(', ');
  const toArrayFromText = (text: string) =>
    text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  let { data } = $props();

  let app = $state({
    status: 'idle' as ViewState,
    error: ''
  });

  let isDirty = $state(false);

  let preferences = $derived<UserPreferencesResponse | null>(
    data.preferences ?? null
  );
  let dislikes = $derived(toTextFromArray(preferences?.dislikes ?? []));

  let diet = $derived(preferences?.diet ?? []);
  let allergies = $derived(preferences?.allergies ?? []);
  let equipment = $derived(preferences?.equipment ?? []);
  // let cuisinePreferences = $derived(preferences?.cuisine_preferences ?? []);
  let preferredPrepTime = $derived(preferences?.preferred_prep_time ?? '');
  let skillLevel = $derived(preferences?.skill_level ?? '');
  let measurementSystem = $state<'metric' | 'imperial'>('metric');
  let useAiAssistance = $derived(preferences?.use_ai_assistance ?? false);

  const submitPreferences: SubmitFunction = (input) => {
    app.status = 'loading';

    return async (response) => {
      const { result } = response;
      app.status = 'idle';
      if (result.type === 'success') {
        toast.success('Preferences saved');
      } else if (result.type === 'failure') {
        app.error =
          (result.data as { error?: string })?.error ??
          'Failed to save preferences';
        toast.error(app.error);
      }
    };
  };

  // const clearPreferenceField = (e: Event, prop: keyof UserPreferences) => {
  // 	e.preventDefault();
  // 	e.stopImmediatePropagation();
  // 	// Since there are other fields in the preferences object, we need to make sure we don't clear them.
  // 	if (prop as keyof UserPreferences) {
  // 		if (prop === 'dislikes' || prop === 'preferred_prep_time' || prop === 'skill_level') {
  // 			dislikes = '';
  // 			return;
  // 		} else if (preferences) {
  // 			preferences[prop] = [];
  // 			return;
  // 		}
  // 	}
  // };

  function _camelCase(str: string) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
</script>

<!-- <PageHeader>
  <AppBar.Root />
</PageHeader> -->

<div class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
  {#if data.loadError}
    <p class="body-large text-destructive mb-4" role="alert">
      {data.loadError}
    </p>
  {/if}
  <form
    class="form"
    method="POST"
    use:enhance={submitPreferences}
    oninput={() => (isDirty = true)}
  >
    <h1 class="display-small mb-4">AI Recipe Preferences</h1>
    <p class="body-large">
      Set your recipe preferences here. These choices will affect every
      suggested recipe. If you want to modify recipes only occasionally, rather
      than setting a preference, just be specific when asking for ideas. You can
      modify recipes however you like when asking.
    </p>

    <hr />

    <div class="form-field">
      <label for="diet" class="label-large">Dietary considerations</label>
      <Select
        type="multiple"
        items={options.diet}
        name="diet"
        bind:value={diet}
        placeholder="Select diet restrictions"
        onValueChange={() => {
          isDirty = true;
        }}
      />
    </div>

    <div class="form-field">
      <label for="allergies" class="label-large">Allergies</label>
      <Select
        type="multiple"
        items={options.allergies}
        name="allergies"
        bind:value={allergies}
        placeholder="Select common allergies"
        onValueChange={() => {
          isDirty = true;
        }}
      />
    </div>

    <div class="form-field">
      <label class="label-large" for="equipment"
        >Kitchen equipment to avoid</label
      >
      <Select
        type="multiple"
        items={options.equipment}
        name="equipment"
        bind:value={equipment}
        placeholder="Select kitchen equipment"
        onValueChange={() => {
          isDirty = true;
        }}
      />
      <div class="helper-text-container">
        <p class="helper-text">
          If you don't have something, include it here. The AI will make an
          attempt to avoid recipes that use these items.
        </p>
      </div>
    </div>

    <Textinput
      label="Ingredients to avoid"
      helperText="List anything you don't like that you want excluded or substituted."
      name="dislikes"
      placeholder="e.g. olives, capers"
      bind:value={dislikes}
    />

    <div class="my-3 grid grid-cols-1 gap-8 md:grid-cols-2">
      <div class="form-field">
        <label for="preferred_prep_time" class="label-large"
          >Preferred prep time</label
        >
        <Select
          type="single"
          name="preferred_prep_time"
          items={options.prepTime}
          placeholder="Select preferred cooking time"
          bind:value={preferredPrepTime}
          onValueChange={() => {
            isDirty = true;
          }}
        />
      </div>

      <div class="form-field">
        <label for="skill_level" class="label-large">Skill level</label>
        <Select
          type="single"
          name="skill_level"
          items={options.skillLevel}
          bind:value={skillLevel}
          placeholder="How comfortable are you in the kitchen?"
          onValueChange={() => {
            isDirty = true;
          }}
        />
      </div>

      <div>
        <p class="label-large mb-1">Measurement system</p>
        <RadioGroup.Root
          name="measurement_system"
          bind:value={measurementSystem}
        >
          <RadioGroup.Item value="metric">Metric</RadioGroup.Item>
          <RadioGroup.Item value="imperial">Imperial</RadioGroup.Item>
        </RadioGroup.Root>
      </div>

      <div>
        <p class="label-large mb-1">Use AI assistance</p>
        <input
          type="checkbox"
          name="use_ai_assistance"
          id="useAiAssistance"
          bind:checked={useAiAssistance}
        />
      </div>
    </div>

    {#if app.error}
      <p class="text-sm text-red-600 dark:text-red-400">{app.error}</p>
    {/if}

    <p class="helper-text text-foreground-alt">
      Select the cuisines you prefer. The AI will make an attempt to suggest
      recipes in these cuisines.
    </p>
    <hr />

    <div>
      <Button
        type="submit"
        class="primary"
        disabled={app.status === 'loading' || !isDirty}
      >
        {#if app.status === 'loading'}
          <ProgressSpinner size="sm" />
          Saving…
        {:else}
          Save preferences
        {/if}
      </Button>
    </div>
  </form>

  <div class="my-18 grid gap-6">
    <h1 class="display-small">Ideas to implement</h1>
    <ul class="body-medium">
      <li>Set old recipes to auto-archive after X days</li>
      <li>Set number of suggestions to keep in history</li>
      <li>Set time delay for automatically marking recipes as "opened"</li>
      <li>User defined recommendations order</li>
    </ul>
  </div>
</div>
