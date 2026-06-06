<script lang="ts">
  import { enhance } from '$app/forms';

  import Button from '$lib/ui/button.svelte';
  import { Card } from '$lib/ui/card';
  import { Checkbox } from '$lib/ui/checkbox';
  // import Password from '$lib/ui/password/password.svelte';

  import FormField from '$lib/ui/forms/form-field';
  import FieldInput from '$lib/ui/forms/field-input.svelte';

  let email = new FormField({
    name: 'email',
    value: '',
    validators: { required: 'Please enter your email' }
  });

  let password = new FormField({
    name: 'password',
    value: '',
    validators: { required: 'Please enter your password' }
  });
  
  let rememberMe = $state(false);
</script>

<div class="flex h-screen items-center justify-center">
  <Card class="w-96">
    <form
      id="form"
      method="POST"
      action="?/login"
      class="form"
      use:enhance={({ formElement, formData, action, cancel, submitter }) => {
        console.log(formElement, formData, action, cancel, submitter);
        cancel();
        // return async ({ result, update }) => {

        // };
      }}
    >
      <h3 class="p-0 text-xl font-medium">Log In</h3>
      <FieldInput type="email" field={email} labelText="Email" placeholder="name@example.com" />
      <FieldInput type="password" field={password} labelText="Password" placeholder="•••••" />
      <!-- <Password labelText="Password" name="password" placeholder="•••••" value={password} /> -->
      <div class="flex items-center gap-2">
        <Checkbox labelText="Remember me" id="remember-me" checked={rememberMe} />
      </div>
      <Button type="submit" class="primary w-full" disabled={!email.valid || !password.valid}>Sign in</Button>
    </form>
  </Card>
</div>
