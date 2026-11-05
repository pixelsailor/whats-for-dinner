<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import { setContext } from 'svelte';

  import Page from '../+page.svelte';

  // PageHeader / AppBar read `device` and `nav` from the layout's viewport context.
  setContext('viewport', { device: 'desktop', nav: 'expanded' });
</script>

<Tooltip.Provider>
  <Page />
</Tooltip.Provider>
