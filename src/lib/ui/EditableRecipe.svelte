<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	// import { marked } from 'marked';
	import type { FullRecipe } from '$lib/types';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';

	interface EditState {
		field: keyof FullRecipe | null;
		originalValue: any;
	}

// let { recipe = $bindable() }: Props = $props();
	let { recipe, locked = true }: { recipe: FullRecipe; locked?: boolean } = $props();

	// State
	let editState = $state<EditState>({ field: null, originalValue: '' });
	let textareaRef: HTMLTextAreaElement | null = $state(null);

	let recipeTime = $derived.by(() => {
		if (recipe?.time) {
			return new Map(Object.entries(recipe.time));
		}
		return undefined;
	});

	const dispatch = createEventDispatcher<{
		commit: { field: keyof FullRecipe; oldValue: string; newValue: string };
		cancel: { field: keyof FullRecipe; value: string };
	}>();

	$effect(() => {
		if (locked && editState.field) {
			cancelEdit();
		}
	});

	// Helper functions
	function startEdit(field: keyof FullRecipe) {
	if (locked) return;

		// Skip editing non-string values for now
		if (typeof field !== 'string') return;

		if (editState.field) return; // Already editing something

		editState.field = field;
		editState.originalValue = recipe[field] as string;

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
		// force string value
		const newValue = recipe[field] as string;

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

	function handleKeydown(event: KeyboardEvent, field: keyof FullRecipe) {
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

	function handleEditableClick(field: keyof FullRecipe) {
		if (locked) return;
		startEdit(field);
	}

	function handleEditableKeydown(event: KeyboardEvent, field: keyof FullRecipe) {
	if (locked) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			startEdit(field);
		}
}

	// function renderMarkdown(content: string): string {
	//   return marked(content, { breaks: true });
	// }

	// function parseTagsForDisplay(tags: string): string[] {
	// 	return tags
	// 		.split(',')
	// 		.map((tag) => tag.trim())
	// 		.filter((tag) => tag.length > 0);
	// }
</script>

<article class="recipe-container">
	<div class="flex flex-col gap-2">
		<!-- Title -->
		<header class="recipe-header">
			{#if editState.field === 'title'}
				<div class="edit-container">
					<input
						type="text"
						class="fluid-heading-05 title-input"
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
					<h1 class="recipe-title fluid-heading-05 hover:bg-gray-100 hover:dark:bg-gray-900/40">
						{recipe.title || 'Click to add title'}
					</h1>
				</div>
			{/if}
		</header>
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
					{recipe.description || 'Click to add description'}
				</div>
			{/if}
		</section>
		<p class="px-2">{recipe.yield}</p>
		{#if recipeTime}
			<ul class="px-2">
				{#each recipeTime as time (time[0])}
					<li class="my-1"><span class="heading">{time[0]} time:</span> <span>{time[1]}</span></li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Ingredients -->
	<section class="recipe-ingredients-section">
		<h2 class="fluid-heading-03 px-2">Ingredients</h2>
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
		<h2 class="fluid-heading-03 px-2">Instructions</h2>
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
					<div class="instructionns__content markdown">
						<SvelteMarkdown source={recipe.instructions} />
					</div>
				{:else}
					<p class="placeholder">Click to add instructions</p>
				{/if}
			</div>
		{/if}
	</section>

	<section class="recipe-notes-section">
		<h2 class="fluid-heading-03 px-2">Notes:</h2>
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
					<div class="instructionns__content markdown">
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
				<span class="tag label lowercase px-2 py-1 border rounded bg-gray-100 border-gray-200 dark:bg-gray-700 dark:border-gray-600 whitespace-nowrap">{tag}</span>
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
</article>

<style>
	.recipe-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.editable,
	.editable-wrapper {
		cursor: pointer;
		padding: 0.5rem;
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
