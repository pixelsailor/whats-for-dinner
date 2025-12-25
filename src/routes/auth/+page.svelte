<script lang="ts">
  // import { Section, Register } from "flowbite-svelte-blocks";
  import { Card, Checkbox, Label, Input } from "flowbite-svelte";
  import BButton from "$lib/ui/BButton/BButton.svelte";
</script>

<div class="flex justify-center items-center h-screen">
  <Card class="p-4 sm:p-6 md:p-8 w-96 bg-white dark:bg-gray-800">
    <form method="POST" action="?/login" class="flex flex-col space-y-6">
      <h3 class="p-0 text-xl font-medium text-gray-900 dark:text-white">Log In</h3>
      <Label class="space-y-2">
        <span>Email</span>
        <Input type="email" name="email" placeholder="name@company.com" required />
      </Label>
      <Label class="space-y-2">
        <span>Password</span>
        <Input type="password" name="password" placeholder="•••••" required />
      </Label>
      <BButton type="submit" class="w-full">Sign in</BButton>
      <!-- <p class="text-sm font-light text-gray-500 dark:text-gray-400">
        Don’t have an account yet? <a href="/" class="text-primary-600 dark:text-primary-500 font-medium hover:underline">Sign up</a>
      </p> -->
    </form>
  </Card>
</div>
