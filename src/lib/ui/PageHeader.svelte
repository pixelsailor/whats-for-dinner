<script lang="ts">
  import { getContext } from 'svelte';

  const vp: any = getContext('viewport');

  let { children, position = 'sticky' } = $props();

  let left = $derived.by(() => {
    if (vp.device === 'mobile') return '0';
    // return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.75rem + 1px)';
    return 'auto';
  });
</script>

<!--
@component PageHeader

Structural component for placing items at the top of the page.
-->
<div class={`${position} top-0 right-0 z-100 px-4 backdrop-blur-sm lg:px-8`} style:left>
  {@render children()}
</div>
