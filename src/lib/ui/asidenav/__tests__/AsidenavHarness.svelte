<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import { setContext } from 'svelte';

  import Asidenav from '../asidenav.svelte';

  let { nav = 'expanded' }: { nav?: 'collapsed' | 'expanded' } = $props();

  // The nav reads `device` and `nav`. Tests fix `nav` via the prop, so toggling is a no-op.
  setContext('viewport', {
    device: 'desktop',
    get nav() {
      return nav;
    },
    set nav(_value: 'collapsed' | 'expanded') {}
  });
</script>

<Tooltip.Provider>
  <Asidenav
    session={null}
    recentlyOpened={[]}
    network={{ online: true }}
    supabase={{ auth: { signOut: async () => {} } }}
  />
</Tooltip.Provider>
