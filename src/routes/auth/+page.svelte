<script lang="ts">
  import { enhance } from '$app/forms';

  import Button from '$lib/ui/button.svelte';
  import { Card } from '$lib/ui/card';
  import { Checkbox } from '$lib/ui/checkbox';
  import { Textinput } from '$lib/ui/forms';
  import Password from '$lib/ui/password/password.svelte';

  import FormField from '$lib/ui/forms/form-field';
  import FieldInput from '$lib/ui/forms/field-input.svelte';

  let firstName = new FormField({
    name: 'first_name',
    value: '',
    validators: {
      onInput: (value) => {
        console.log('onInput validator', value);
        return value.length < 3 ? 'Minimum 3 characters' : null;
      },
    }
  });

  let email = $state('');
  let password = $state('');
  let rememberMe = $state(false);

  // $inspect(firstName);
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
      <FieldInput field={firstName} label="First Name" />
      <!-- <Textinput
        type="email"
        label="Email"
        name="email"
        placeholder="name@example.com"
        bind:value={email}
        validateOn="input"
        minlength={(value) => value.length < 3 ? 'Minimum 3 characters' : null}
      /> -->
      <Password labelText="Password" name="password" placeholder="•••••" value={password} />
      <div class="flex items-center gap-2">
        <Checkbox labelText="Remember me" id="remember-me" checked={rememberMe} />
      </div>
      <Button type="submit" class="primary w-full">Sign in</Button>
    </form>
  </Card>
</div>
