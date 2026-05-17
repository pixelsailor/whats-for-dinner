<script lang="ts">
  import type { IconSize } from '$lib/types';

  let { children, ...props } = $props();

  let iconSize = $derived.by(() => {
    const { size } = props;
    if (!size) return '100%';

    if (typeof size === 'string') {
      const sizes = {
        xs: 16,
        sm: 20,
        md: 24,
        lg: 32,
        xl: 40
      };
      return `${sizes[size as IconSize]}`;
    } else {
      return size;
    }
  });
</script>

{@render children(iconSize)}
