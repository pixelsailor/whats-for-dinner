<script lang="ts">
  import type { Recipe } from '$lib/api/recipe';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';

	let { recipe }: { recipe: Recipe } = $props();
</script>

<div class="flex flex-column gap-2">
  <div class="form-field">
    <label for="title" class="label-medium">Title</label>
  </div>
</div>