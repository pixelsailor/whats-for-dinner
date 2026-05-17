<script lang="ts">
  import { Button } from 'bits-ui';
  import { getContext } from 'svelte';

  import type { Viewport } from '$lib/types';
  import OpenPanelLeftIcon from '$lib/ui/icons/OpenPanelLeftIcon.svelte';

  const vp: Viewport = getContext('viewport');

  let { children = null, disableMobileNav = false } = $props();

  let isMobile = $derived(vp.device === 'mobile');

  function toggleMobileNav() {
    vp.nav = vp.nav === 'expanded' ? 'collapsed' : 'expanded';
  }
</script>

<div class="flex h-16 flex-row items-center py-2">
  {#if isMobile && !disableMobileNav}
    <Button.Root title="Show navigation" onclick={toggleMobileNav} class="button icon text">
      <OpenPanelLeftIcon size="xs" />
    </Button.Root>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</div>
