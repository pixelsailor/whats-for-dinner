<script lang="ts">
  import { setContext } from 'svelte';
  import Page from '../+page.svelte';

  let { data } = $props();

  const viewport = {
    device: 'desktop' as const,
    nav: 'collapsed' as 'collapsed' | 'expanded'
  };

  setContext('viewport', viewport);
</script>

<Page {data} />
