<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { RecipeSummary, Viewport } from '$lib/types';
	import Button from '$lib/ui/Button/Button.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import { goto } from '$app/navigation';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { getGreeting } from '$lib/greetings';

	const vp = getContext<Viewport>('viewport');

	let app = $state({
		input: '',
		lastInput: '',
		view: 'idle' as 'idle' | 'detail' | 'suggestions' | 'loading' | 'error',
		suggestions: [] as RecipeSummary[],
		selected: null as RecipeSummary | null,
		error: '',
		saveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error'
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

	/** Handles prompt form, sending input value as URL params */
	function getSuggestions(e: Event) {
		e.preventDefault();
		if (!app.input.trim()) return;

		working = true;
		const prompt = encodeURIComponent(app.input);
		goto(`/suggestions?prompt=${prompt}`);
	}
</script>

<main
	class="mx-auto flex h-screen max-w-5xl items-center px-4 py-24"
	style:height={app.view === 'suggestions' ? 'auto' : ''}
>
	{#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'idle'}
		<div class="mx-auto w-full max-w-3xl">
			<h1 class="fluid-heading-06 my-4 text-center">{getGreeting()}</h1>
			<Prompt style="margin-bottom: 0">
				<form class="flex w-full flex-row gap-2" onsubmit={getSuggestions}>
					<input
						class="grow p-1"
						type="text"
						name="input"
						bind:value={app.input}
						placeholder="Ask for event ideas, regional recipes, or just list ingredients"
						disabled={working}
					/>
					<Button
						type="submit"
						class="-mr-1"
						label="Submit request"
						disabled={working || !app.input.trim()}
					>
						{working ? 'Thinking...' : 'Get ideas'}
					</Button>
				</form>
			</Prompt>
			<div class="mt-2 flex flex-row justify-center gap-4">
				<Button href="/suggestions" cue="text" size="sm">
					Recent Suggestions
				</Button>
				<Button href="/suggestions?prompt=recommended" cue="text" size="sm">
					Recommended
				</Button>
				<Button href="/suggestions" cue="text" size="sm">
					Surprise Me!
				</Button>
			</div>
		</div>
	{:else if app.view === 'error'}
		<div class="error">
			<p class="my-4 font-bold">Ah donkeyspittle! There was a problem.</p>
			<p class="my-4">Refresh the browser and try again.</p>
			<p>{app.error}</p>
		</div>
	{/if}
</main>
