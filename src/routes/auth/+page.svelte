<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  import Button from '$lib/ui/button.svelte';
  import { Card } from '$lib/ui/card';
  import { Checkbox } from '$lib/ui/checkbox';
  import Password from '$lib/ui/password/password.svelte';
  import type { FormControlState } from '$lib/ui/form/types';
  import TextInput from '$lib/ui/text-input/text-input.svelte';

  let { form }: PageProps = $props();

  /** This is what creating a `Form` instance should look like */
  // const form = new Form({
  //   email: ['', { required: true }],
  //   password: ['', { required: true }],
  //   remember_me: [false]
  // });

  const Form = $state({
    state: {
      invalid: null,
      valid: null,
      errors: [],
      touched: false,
      dirty: false,
      disabled: false,
    },
    controls: <Record<string, FormControlState>>{
      email: <FormControlState<string>>{
        value: '',
        invalid: false,
        valid: false,
        error: '',
        pending: false,
        touched: false,
        dirty: false,
      },
      password: <FormControlState<string>>{
        value: '',
        invalid: null,
        valid: null,
        error: '',
        pending: false,
        touched: false,
        dirty: false,
      },
    },
  });

  let formValid = $derived.by(() => {
    return Object.values(Form.controls).every((control) => control.valid);
  });

  let rememberMe = $state(false);
</script>

<svelte:head>
  <title>Log In</title>
</svelte:head>

<div class="flex h-screen items-center justify-center">
  <Card class="w-96">
    <form
      method="POST"
      action="?/login"
      class="form"
      // use:enhance={({ formElement, formData, action, cancel, submitter }) => {
      //   // console.log(formElement, formData, action, cancel, submitter);
      //   if (!formValid || Form.state.errors) {
      //     cancel();
      //   }
      //   // return async ({ result, update }) => {

      //   // };
      // }}
    >
      <h1 class="p-0 headline-small">Log In</h1>
      {#if Form.state.errors.length > 0}
        <div class="banner alert-5">
          <div class="banner-icon">
            <!-- <Icon name="alert-circle" /> -->
          </div>
          <div class="banner-content">
            <p class="banner-title">Error: Invalid email or password</p>
          </div>
        </div>
      {/if}
      <TextInput
        bind:control={Form.controls.email}
        type="email"
        name="email"
        labelText="Email"
        placeholder="name@example.com"
        validateOn="input"
        required
      />
      <Password
        bind:control={Form.controls.password}
        labelText="Password"
        name="password"
        validateOn="input"
        required
      />
      <div class="flex items-center gap-2">
        <Checkbox
          labelText="Remember me"
          id="remember-me"
          checked={rememberMe}
        />
      </div>
      <Button type="submit" class="primary w-full" disabled={!formValid}>Sign in</Button>
    </form>
  </Card>
</div>
