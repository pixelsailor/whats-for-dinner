<script lang="ts">
	import { getContext, setContext } from 'svelte';

	let { children } = $props();

	class ListItemApi {
		#title = $state('');
		#text = $state('');
		#secondaryAction = $state<any>(null);

		get title() {
			return this.#title;
		}
		set title(value: string) {
			this.#title = value;
		}

		constructor() {}
	}

	const listitem = new ListItemApi();

	setContext('listitem', listitem);

	const contextValue = getContext<{ truncate: boolean }>('pxl-list');
	const truncate = $derived(contextValue?.truncate ?? false);
</script>

<div
	class={[
		'pxl-listitem flex flex-row flex-nowrap text-sm w-full min-h-14 content-center',
		{ 'truncate': truncate }
	]}
>
  {@render children()}
</div>
