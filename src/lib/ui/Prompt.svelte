<script lang="ts">
  let { children, ...props } = $props();
</script>

<div
  {...props}
  class={[
    'prompt-bar mx-auto mb-4 max-w-3xl rounded-lg border border-gray-200 bg-input p-3 shadow-xs md:mb-12 xl:mb-16 dark:border-gray-700',
    'focus-within:shadow-accent focus-within:ring-accent/70 focus-within:ring focus-within:outline-hidden',
    props.class
  ]}
>
  {@render children()}
</div>
