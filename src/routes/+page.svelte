<script lang="ts">
	import { Button } from 'bits-ui';

	import type { RecipeSummary } from '$lib/types';
	// import Button from '$lib/ui/Button/Button.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import { goto } from '$app/navigation';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { getGreeting } from '$lib/greetings';
	import { networkStore } from '$lib/stores/network';
	import { deriveAICapability } from '$lib/utils/capabilities';

	let { data } = $props();
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
				return 'You are offline. Reconnect to request fresh suggestions.';
			case 'disabled':
				return 'AI suggestions are unavailable in this build.';
			case 'unauthenticated':
				return 'Log in to request AI-powered recipe suggestions.';
			case 'unauthorized':
				return 'Your account does not include AI suggestions.';
			default:
				return '';
		}
	});

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

	/** Handles prompt form, sending input value as URL params */
	function getSuggestions(e: Event) {
		e.preventDefault();
		if (!app.input.trim()) return;

		working = true;
		const prompt = encodeURIComponent(app.input);
		goto(`/suggestions?prompt=${prompt}`);
	}
</script>

<div
	class="mx-auto flex h-screen max-w-5xl items-center px-4 lg:px-8"
	style:height={app.view === 'suggestions' ? 'auto' : ''}
>
	{#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'idle'}
		<div class="mx-auto w-full max-w-3xl">
			<h1 class="display-small my-4 text-center">{getGreeting()}</h1>
			{#if canUseAI}
				<Prompt style="margin-bottom: 0">
					<form class="flex w-full flex-row gap-2" onsubmit={getSuggestions}>
						<input
							class="grow p-1 border-none bg-gray-100 dark:bg-gray-900 placeholder:text-gray-500 dark:placeholder:text-gray-400"
							type="text"
							name="input"
							bind:value={app.input}
							placeholder="Ask for event ideas, regional recipes, or just list ingredients"
							disabled={working}
						/>
						<Button.Root
							type="submit"
							class="button text narrow"
							disabled={working || !app.input.trim()}
						>
							{working ? 'Thinking...' : 'Get ideas'}
						</Button.Root>
					</form>
				</Prompt>
			{:else if aiRestrictionMessage}
				<p class="text-center text-gray-500">{aiRestrictionMessage}</p>
			{/if}
			<div class="mt-2 flex flex-row justify-center gap-4">
				<Button.Root href="/suggestions" class="button text">
					Recent Suggestions
				</Button.Root>
				<Button.Root href="/recommendations" class="button text">
					Recommended
				</Button.Root>
				<Button.Root href="/recipes" class="button text">
					Surprise Me!
				</Button.Root>
			</div>
		</div>
	{:else if app.view === 'error'}
		<div class="error">
			<h1 class="my-4 headline-medium">Ah donkeyspittle! There was a problem.</h1>
			<p class="my-4">Refresh the browser and try again.</p>
			<p>{app.error}</p>
		</div>
	{/if}
</div>
