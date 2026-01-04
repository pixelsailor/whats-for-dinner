<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	// import { marked } from 'marked';
	import type { Recipe } from '$lib/api/recipe';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';

	interface EditState {
		field: keyof Recipe | null;
		originalValue: any;
	}

	let { recipe, locked = true }: { recipe: Recipe; locked?: boolean } = $props();

	// State
	let editState = $state<EditState>({ field: null, originalValue: '' });
	let textareaRef: HTMLTextAreaElement | null = $state(null);

	// Inferred total time
	let totalTime = $derived.by<string>(() => {
		const minDuration = parseInt(recipe.prep_time?.[0] ?? '0') + parseInt(recipe.cook_time?.[0] ?? '0');
		const maxDuration = parseInt(recipe.prep_time?.[1] ?? '0') + parseInt(recipe.cook_time?.[1] ?? '0');

		if (maxDuration > 0) {
      return humanizeTime([minDuration.toString(), maxDuration.toString()]);
		} else {
			return humanizeTime([minDuration.toString()]);
		}
	});

	const dispatch = createEventDispatcher<{
		commit: { field: keyof Recipe; oldValue: string; newValue: string };
		cancel: { field: keyof Recipe; value: string };
	}>();

	$effect(() => {
		if (locked && editState.field) {
			cancelEdit();
		}
	});
	
	// Helper functions
	function startEdit(field: keyof Recipe) {
		if (locked) return;

		if (editState.field) return; // Already editing something

		editState.field = field;
		editState.originalValue = recipe[field];

		// Focus textarea after DOM update for markdown fields
		if (field === 'ingredients' || field === 'instructions') {
			setTimeout(() => {
				if (textareaRef) {
					textareaRef.focus();
					// Auto-resize textarea
					adjustTextareaHeight(textareaRef);
				}
			}, 0);
		}
	}

	function commitEdit() {
		if (!editState.field) return;

		const field = editState.field;
		const oldValue = editState.originalValue;
		const newValue = recipe[field];

		editState.field = null;
		editState.originalValue = '';

		dispatch('commit', { field, oldValue, newValue });
	}

	function cancelEdit() {
		if (!editState.field) return;

		const field = editState.field;
		recipe[field] = editState.originalValue;

		dispatch('cancel', { field, value: editState.originalValue });

		editState.field = null;
		editState.originalValue = '';
	}

	function handleKeydown(event: KeyboardEvent, field: keyof Recipe) {
	if (locked) return;

		if (
			event.key === 'Enter' &&
			!event.shiftKey &&
			field !== 'ingredients' &&
			field !== 'instructions'
		) {
			event.preventDefault();
			commitEdit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	}

	function handleTextareaKeydown(event: KeyboardEvent) {
	if (locked) return;

		if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
		// For textareas, allow Enter but use Ctrl+Enter or buttons to commit
		if (event.key === 'Enter' && event.ctrlKey) {
			event.preventDefault();
			commitEdit();
		}
	}

	function handleBlur(event: FocusEvent) {
	if (locked) return;

		// Check if focus moved to commit/cancel buttons
		const relatedTarget = event.relatedTarget as HTMLElement;
		if (
			relatedTarget &&
			(relatedTarget.classList.contains('commit-btn') ||
				relatedTarget.classList.contains('cancel-btn'))
		) {
			return; // Don't commit yet, let button handle it
		}
		commitEdit();
	}

	function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
		textarea.style.height = 'auto';
		textarea.style.height = textarea.scrollHeight + 'px';
	}

	function handleTextareaInput(event: Event) {
	if (locked) return;

		const textarea = event.target as HTMLTextAreaElement;
		adjustTextareaHeight(textarea);
	}

	function handleEditableClick(field: keyof Recipe) {
		if (locked) return;
		startEdit(field);
	}

	function handleEditableKeydown(event: KeyboardEvent, field: keyof Recipe) {
	if (locked) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			startEdit(field);
		}
	}

	/** Replace underscores with spaces and capitalize the first letter */
	// function humanizeColumn(column: string): string {
	// 	return column.charAt(0).toUpperCase() + column.slice(1).replace('_', ' ');
	// }

	// function renderMarkdown(content: string): string {
	//   return marked(content, { breaks: true });
	// }

	// function parseTagsForDisplay(tags: string): string[] {
	// 	return tags
	// 		.split(',')
	// 		.map((tag) => tag.trim())
	// 		.filter((tag) => tag.length > 0);
	// }

	function selectAll(event: Event) {
		const input = event.target as HTMLInputElement;
		input.select();
	}

	/**
   * Determines how to interpret a time range returning either a hyphen or 'to' separator
   * @param time - The time range to interpret
   */
	 function humanizeTime(time: string[]): string {
    if (!time || time.length === 0) return '';
    if (time.length === 1) {
      return humanizeDuration(parseInt(time[0]));
    } else {
      if (parseInt(time[1]) < 60) {
        return humanizeDuration(parseInt(time[0]), false) + '-' + humanizeDuration(parseInt(time[1]));
      } else {
        return humanizeDuration(parseInt(time[0])) + ' to ' + humanizeDuration(parseInt(time[1]));
      }
    }
  }

	/** Renders a duration in the format of "X hours Y minutes" or "Y minutes" */
	function humanizeDuration(duration: number, showUnits = true): string {
		const hours = Math.floor(duration / 60);
		const minutes = duration % 60;
		if (hours > 0) {
			return `${hours} ${hours === 1 ? 'hours' : 'hour'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
		} else {
      if (showUnits) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
      } else {
        return minutes.toString();
      }
		}
	}
</script>

<div class="recipe-container">
	<div class="flex flex-col gap-2">
		<!-- Title -->
		<header class="recipe-header">
			{#if editState.field === 'title'}
				<div class="edit-container">
					<input
						type="text"
						class="display-small title-input"
						bind:value={recipe.title}
						onkeydown={(e) => handleKeydown(e, 'title')}
						onblur={handleBlur}
					/>
					<div class="button-group">
						<button class="commit-btn" onclick={commitEdit}>✓</button>
						<button class="cancel-btn" onclick={cancelEdit}>✕</button>
					</div>
				</div>
			{:else}
				<div
					role="button"
					tabindex={locked ? -1 : 0}
					aria-disabled={locked}
					class={`editable-wrapper ${locked ? 'editable--locked' : ''}`}
					onclick={() => handleEditableClick('title')}
					onkeydown={(event) => handleEditableKeydown(event, 'title')}
				>
					<h1 class="recipe-title display-small hover:bg-gray-100 hover:dark:bg-gray-900/40">
						{recipe.title || 'Click to add title'}
					</h1>
				</div>
			{/if}
		</header>
		{#if !locked}
			<section class="recipe-short-description-section">
				<h2 class="fluid-heading-02 px-2">Short description</h2>
				{#if editState.field === 'short_description'}
					<div class="edit-container">
						<textarea class="short-description-textarea" bind:value={recipe.short_description} onblur={handleBlur} oninput={handleTextareaInput} placeholder="Enter short description..."></textarea>
						<div class="button-group">
							<button class="commit-btn" onclick={commitEdit}>✓</button>
							<button class="cancel-btn" onclick={cancelEdit}>✕</button>
						</div>
					</div>
				{:else}
					<div class="recipe-short-description editable hover:bg-gray-100 hover:dark:bg-gray-900/40" role="button" tabindex={locked ? -1 : 0} aria-disabled={locked} onclick={() => handleEditableClick('short_description')} onkeydown={(event) => handleEditableKeydown(event, 'short_description')}>
						{recipe.short_description || 'Click to add short description'}
					</div>
				{/if}
			</section>
		{/if}
		<!-- Description -->
		<section class="recipe-description-section">
			{#if editState.field === 'description'}
				<div class="edit-container">
					<textarea
						class="description-textarea italic"
						bind:value={recipe.description}
						bind:this={textareaRef}
						onkeydown={handleTextareaKeydown}
						onblur={handleBlur}
						oninput={handleTextareaInput}
						placeholder="Enter recipe description..."
					></textarea>
					<div class="button-group">
						<button class="commit-btn" onclick={commitEdit}>✓</button>
						<button class="cancel-btn" onclick={cancelEdit}>✕</button>
					</div>
				</div>
			{:else}
				<div
					class={`recipe-description editable italic hover:bg-gray-100 hover:dark:bg-gray-900/40 ${locked ? 'editable--locked' : ''}`}
					role="button"
					tabindex={locked ? -1 : 0}
					aria-disabled={locked}
					onclick={() => handleEditableClick('description')}
					onkeydown={(event) => handleEditableKeydown(event, 'description')}
				>
					{recipe.description}
				</div>
			{/if}
		</section>
		<p class="px-2 py-4 body-large">{recipe.yield}</p>
		<div class="grid grid-cols-[5rem_minmax(0,1fr)] gap-1 align-baseline mx-2">
			<span class="label-large">Prep time:</span>
			<span class="body-medium">{humanizeTime(recipe.prep_time)}</span>
			<span class="label-large">Cook time:</span>
			<span class="body-medium">{humanizeTime(recipe.cook_time)}</span>
			<span class="label-large">Total time:</span><span class="body-medium">{totalTime}</span>
		</div>
	</div>

	<!-- Ingredients -->
	<section class="recipe-ingredients-section">
		<h2 class="title-large px-2">Ingredients</h2>
		{#if editState.field === 'ingredients'}
			<div class="edit-container">
				<textarea
					class="ingredients-textarea"
					bind:value={recipe.ingredients}
					bind:this={textareaRef}
					onkeydown={handleTextareaKeydown}
					onblur={handleBlur}
					oninput={handleTextareaInput}
					placeholder="Enter ingredients in markdown format..."
				></textarea>
				<div class="button-group">
					<button class="commit-btn" onclick={commitEdit}>✓</button>
					<button class="cancel-btn" onclick={cancelEdit}>✕</button>
				</div>
				<small class="hint">
					Tip: Use markdown format (e.g., - 2 cups flour). Ctrl+Enter to save.
				</small>
			</div>
		{:else}
			<div
				class={`recipe-ingredients editable hover:bg-gray-100 hover:dark:bg-gray-900/40 ${locked ? 'editable--locked' : ''}`}
				role="button"
				tabindex={locked ? -1 : 0}
				aria-disabled={locked}
				onclick={() => handleEditableClick('ingredients')}
				onkeydown={(event) => handleEditableKeydown(event, 'ingredients')}
			>
				{#if recipe.ingredients}
					<div class="ingredients__content markdown">
						<SvelteMarkdown source={recipe.ingredients} />
					</div>
				{:else}
					<p class="placeholder">Click to add ingredients</p>
				{/if}
			</div>
		{/if}
	</section>

	<!-- Instructions -->
	<section class="recipe-instructions-section">
		<h2 class="title-large px-2">Instructions</h2>
		{#if editState.field === 'instructions'}
			<div class="edit-container">
				<textarea
					class="instructions-textarea"
					bind:value={recipe.instructions}
					bind:this={textareaRef}
					onkeydown={handleTextareaKeydown}
					onblur={handleBlur}
					oninput={handleTextareaInput}
					placeholder="Enter step-by-step instructions in markdown format..."
				></textarea>
				<div class="button-group">
					<button class="commit-btn" onclick={commitEdit}>✓</button>
					<button class="cancel-btn" onclick={cancelEdit}>✕</button>
				</div>
				<small class="hint"
					>Tip: Use numbered lists (1., 2., 3.) or bullets (-). Ctrl+Enter to save.</small
				>
			</div>
		{:else}
			<div
				class={`recipe-instructions editable hover:bg-gray-100 hover:dark:bg-gray-900/40 ${locked ? 'editable--locked' : ''}`}
				role="button"
				tabindex={locked ? -1 : 0}
				aria-disabled={locked}
				onclick={() => handleEditableClick('instructions')}
				onkeydown={(event) => handleEditableKeydown(event, 'instructions')}
			>
				{#if recipe.instructions}
					<div class="instructions__content markdown">
						<SvelteMarkdown source={recipe.instructions} />
					</div>
				{:else}
					<p class="placeholder">Click to add instructions</p>
				{/if}
			</div>
		{/if}
	</section>

	<section class="recipe-notes-section">
		<h2 class="title-large px-2">Notes:</h2>
		{#if editState.field === 'notes'}
			<div class="edit-container">
				<textarea
					class="notes-textarea"
					bind:value={recipe.notes}
					bind:this={textareaRef}
					onkeydown={handleTextareaKeydown}
					onblur={handleBlur}
					oninput={handleTextareaInput}
					placeholder="Enter notes in markdown format..."
				></textarea>
				<div class="button-group">
					<button class="commit-btn" onclick={commitEdit}>✓</button>
					<button class="cancel-btn" onclick={cancelEdit}>✕</button>
				</div>
			</div>
		{:else}
			<div
				class={`recipe-notes editable hover:bg-gray-100 hover:dark:bg-gray-900/40 ${locked ? 'editable--locked' : ''}`}
				role="button"
				tabindex={locked ? -1 : 0}
				aria-disabled={locked}
				onclick={() => handleEditableClick('notes')}
				onkeydown={(event) => handleEditableKeydown(event, 'notes')}
			>
				{#if recipe.notes}
					<div class="notes__content markdown">
						<SvelteMarkdown source={recipe.notes} />
					</div>
				{:else}
					<p class="placeholder">Click to add notes</p>
				{/if}
			</div>
		{/if}
	</section>

	<ul class="inline-flex flex-wrap gap-2 px-2 mb-4 h-12 items-center">
		{#each recipe.tags as tag, index (tag + index)}
			<li>
				<span class="tag label-medium lowercase">{tag}</span>
			</li>
		{/each}
	</ul>

	<!-- Tags -->
	<!-- <section class="recipe-tags-section">
    <h3>Tags</h3>
    {#if editState.field === 'tags'}
      <div class="edit-container">
        <input 
          type="text" 
          class="tags-input"
          bind:value={recipe.tags}
          onkeydown={(e) => handleKeydown(e, 'tags')}
          onblur={handleBlur}
          placeholder="Enter tags separated by commas..."
          autofocus
        />
        <div class="button-group">
          <button class="commit-btn" onclick={commitEdit}>✓</button>
          <button class="cancel-btn" onclick={cancelEdit}>✕</button>
        </div>
        <small class="hint">Separate tags with commas</small>
      </div>
    {:else}
      <div class="recipe-tags editable" onclick={() => startEdit('tags')}>
        {#if recipe.tags}
          <div class="tags-list">
            {#each parseTagsForDisplay(recipe.tags) as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        {:else}
          <p class="placeholder">Click to add tags</p>
        {/if}
      </div>
    {/if}
  </section> -->
</div>

<style>
	.recipe-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.editable,
	.editable-wrapper {
		cursor: pointer;
		padding: 0 0.5rem;
		border-radius: 4px;
		transition: background-color 0.2s ease;
		min-height: 1.5em;
		border: 2px solid transparent;
	}

	.editable--locked {
		cursor: default;
	}


	.placeholder {
		/* color: #6c757d; */
		font-style: italic;
		margin: 0;
	}

	.edit-container {
		position: relative;
	}

	.title-input,
	.tags-input {
		width: 100%;
		/* font-size: inherit;
    font-weight: inherit;
    font-family: inherit; */
		padding: 0.5rem;
		border: 2px solid #007bff;
		border-radius: 4px;
		outline: none;
	}

	.title-input {
		/* font-size: 2.5rem;
    font-weight: 700; */
	}

	.description-textarea,
	.short-description-textarea,
	.ingredients-textarea,
	.instructions-textarea,
	.notes-textarea {
		width: 100%;
		min-height: 100px;
		padding: 0.5rem;
		/* font-family: inherit;
    font-size: 1rem;
    line-height: 1.5; */
		border: 2px solid #007bff;
		border-radius: 4px;
		outline: none;
		resize: none;
		overflow: hidden;
	}

	.short-description-textarea {
		min-height: 2rem;
	}

	/* .tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	} */

	/* .tag {
		background-color: #e3f2fd;
		color: #1976d2;
		padding: 0.25rem 0.75rem;
		border-radius: 16px;
		font-size: 0.875rem;
		font-weight: 500;
	} */

	.button-group {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.commit-btn,
	.cancel-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.commit-btn {
		background-color: #28a745;
		color: white;
	}

	.commit-btn:hover {
		background-color: #218838;
	}

	.cancel-btn {
		background-color: #dc3545;
		color: white;
	}

	.cancel-btn:hover {
		background-color: #c82333;
	}

	.hint {
		display: block;
		color: #6c757d;
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	/* Markdown content styling */
	/* .recipe-ingredients :global(ul),
	.recipe-instructions :global(ol),
	.recipe-instructions :global(ul) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.recipe-ingredients :global(li),
	.recipe-instructions :global(li) {
		margin-bottom: 0.25rem;
	}

	.recipe-instructions :global(ol) {
		counter-reset: step-counter;
	}

	.recipe-instructions :global(ol li) {
		margin-bottom: 0.75rem;
		line-height: 1.6;
	} */

	/* Responsive design */
	/* @media (max-width: 768px) {
		.recipe-container {
			padding: 1rem;
		}

		.recipe-title {
			font-size: 2rem;
		}

		.title-input {
			font-size: 2rem;
		}
	} */
</style>
