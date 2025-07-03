<script lang="ts">
  let { children, ...props } = $props();
</script>

<div {...props} class={['prompt-bar mx-auto mb-4 md:mb-12 xl:mb-16 max-w-3xl p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shadow-xs', props.class]}>
  {@render children()}
</div>