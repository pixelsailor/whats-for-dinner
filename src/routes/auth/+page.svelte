<script lang="ts">
  import { Button } from 'bits-ui';
  import { Checkbox } from 'bits-ui';
  import { Label } from 'bits-ui';
  import { Card, Input } from "flowbite-svelte";
</script>

<div class="flex justify-center items-center h-screen">
  <Card class="p-4 sm:p-6 md:p-8 w-96 bg-white dark:bg-gray-800">
    <form method="POST" action="?/login" class="flex flex-col space-y-6">
      <h3 class="p-0 text-xl font-medium text-gray-900 dark:text-white">Log In</h3>
      <Label.Root class="space-y-2">
        <span>Email</span>
        <Input type="email" name="email" placeholder="name@company.com" required />
      </Label.Root>
      <Label.Root class="space-y-2">
        <span>Password</span>
        <Input type="password" name="password" placeholder="•••••" required />
      </Label.Root>
      <div class="flex items-center gap-2">
        <Checkbox.Root id="remember-me" />
        <Label.Root id="remember-me" for="remember-me" class="label-medium">Remember me</Label.Root>
      </div>
      <Button.Root type="submit" class="w-full button primary">Sign in</Button.Root>
      <!-- <p class="text-sm font-light text-gray-500 dark:text-gray-400">
        Don’t have an account yet? <a href="/" class="text-primary-600 dark:text-primary-500 font-medium hover:underline">Sign up</a>
      </p> -->
    </form>
  </Card>
</div>
