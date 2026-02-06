<script lang="ts">
  let { children = null } = $props();
</script>

<div class="pxl-form-field flex flex-col gap-2 h-23 relative content-center">
  {@render children?.()}
</div>

<style>
    /* :global(.form-field) {
      @apply mb-4 flex min-h-24 flex-col;
    } */

  :global(.pxl-form-field > label) {
    font-size: 0.875rem;
    line-height: 1.125rem;
    font-weight: 400;
    letter-spacing: 0.16px;
  }
</style>