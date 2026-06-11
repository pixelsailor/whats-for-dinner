<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="mx-auto flex h-screen max-w-5xl items-center px-4 py-24">
  <div class="mx-auto w-full max-w-3xl">
    <h1 class="fluid-heading-05 my-8">
      Ah donkey-spittle! There was a problem.
    </h1>
    <p class="flex items-center gap-3">
      <span class="fluid-heading-03">{page.status}</span><span>|</span><span
        >{page.error?.message}</span
      >
    </p>
  </div>
</div>
