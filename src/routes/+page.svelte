<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { recipesApiPostHandler } from '$lib/api';
	import type { RecipeSummary, Viewport } from '$lib/types';
	import ListItemButton from '$lib/ui/ListItemButton.svelte';
	import { AppBar } from '$lib/ui/AppBar/index.js';
	import Button from '$lib/ui/Button/Button.svelte';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { saveSuggestions, suggestionMap } from '$lib/stores/suggestions';
	import { goto } from '$app/navigation';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

	const vp = getContext<Viewport>('viewport');

	let app = $state({
		input: '',
		lastInput: '',
		view: 'idle' as 'idle' | 'detail' | 'suggestions' | 'loading' | 'error',
		suggestions: [] as RecipeSummary[],
		selected: null as RecipeSummary | null,
		error: '',
		saveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
	});

	// Show request status without changing app.view
	let working = $state(false);

	let promptPlaceholder = $state('');

	onMount(async () => {
		promptPlaceholder = getRandomPromptMessage();
	});

	function getRandomPromptMessage() {
		const messages = [
			`How can I help?`,
			`What'll it be tonight?`,
			`What are you in the mood for?`,
			`If you could dine anywhere in the world right now, where would that be?`,
			`Ready for something new?`
		];
		const max = messages.length;
		return messages[Math.floor(Math.random() * max)];
	}

	/**
	 * Handles prompt form, sending input value as URL params
	 * @param e
	 */
	function getSuggestions(e: Event) {
		e.preventDefault();
		if (!app.input.trim()) return;

		working = true;
		const prompt = encodeURIComponent(app.input);
		goto(`/suggestions?prompt=${prompt}`);
	}
</script>

<!-- {#if app.view === 'suggestions'}
	<PageHeader>
		<AppBar.Root>
			<Button href="/" size="xs" icon>
				<BackIcon />
			</Button>
			<AppBar.Text primary="Suggested Recipes" />
		</AppBar.Root>
	</PageHeader>
{/if} -->

<main class="flex items-center h-screen mx-auto max-w-5xl px-4 py-24" style:height={app.view === 'suggestions' ? 'auto' : ''}>
	{#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'idle'}
		<div class="mx-auto max-w-3xl w-full">
			<h1 class="my-4 text-center fluid-heading-06">What's for Dinner?</h1>
			<Prompt>
				<form
					class="flex w-full flex-row gap-2"
					onsubmit={getSuggestions}
				>
					<input
						class="grow p-1"
						type="text"
						name="input"
						bind:value={app.input}
						placeholder={promptPlaceholder}
						disabled={working}
					/>
					<Button type="submit" class="-mr-1" label="Submit request" disabled={working || !app.input.trim()}>
						{working ? 'Thinking...' : 'Get ideas'}
					</Button>
				</form>
			</Prompt>
		</div>
	{:else if app.view === 'error'}
		<div class="error">
			<p class="my-4 font-bold">Ah donkeyspittle! There was a problem.</p>
			<p class="my-4">Refresh the browser and try again.</p>
			<p>{app.error}</p>
		</div>
	{/if}
</main>