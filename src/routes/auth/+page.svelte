<script lang="ts">
  import Button from '$lib/ui/button.svelte';
  import { Card } from '$lib/ui/card';
  import { Checkbox } from '$lib/ui/checkbox';
  import { Textinput } from '$lib/ui/forms';
  import Password from '$lib/ui/password/password.svelte';

  let email = $state('');
  let password = $state('');
  let rememberMe = $state(false);
</script>

<div class="flex h-screen items-center justify-center">
  <Card class="w-96">
    <form method="POST" action="?/login" class="form">
      <h3 class="p-0 text-xl font-medium">Log In</h3>
      <Textinput type="email" label="Email" name="email" placeholder="name@example.com" value={email} />
      <Password labelText="Password" name="password" placeholder="•••••" value={password} />
      <div class="flex items-center gap-2">
        <Checkbox labelText="Remember me" id="remember-me" checked={rememberMe} />
      </div>
      <Button type="submit" class="primary w-full">Sign in</Button>
    </form>
  </Card>
</div>
