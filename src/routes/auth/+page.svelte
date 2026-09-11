<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  import Button from '$lib/ui/button.svelte';
  import { Card } from '$lib/ui/card';
  import FormGroup from '$lib/ui/form-group/form-group';
  import Password from '$lib/ui/password/password.svelte';
  import TextInput from '$lib/ui/text-input/text-input.svelte';

  let { form }: PageProps = $props();

  let loginError = $derived(form?.error ?? '');
  let submitting = $state(false);

  const formGroup = new FormGroup({
    email: '',
    password: ''
  });

  let formValid = $derived.by(() => {
    return Object.values(formGroup.controls).every((control) => control.valid);
  });

  // Reset submitting state if there is an error
  $effect(() => {
    if (form?.error) {
      submitting = false;
    }
  });
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
      use:enhance={() => {
        submitting = true;
      }}
    >
      <h1 class="headline-small p-0">Log In</h1>
      {#if loginError}
        <div
          class="banner alert-5 rounded border border-red-300 bg-red-100 p-2"
          role="alert"
        >
          <div class="banner-icon">
            <!-- <Icon name="alert-circle" /> -->
          </div>
          <div class="banner-content">
            <p class="banner-title">{loginError}</p>
          </div>
        </div>
      {/if}
      <TextInput
        control={formGroup.controls.email}
        type="email"
        name="email"
        labelText="Email"
        placeholder="name@example.com"
        validateOn="input"
        required
      />
      <Password
        control={formGroup.controls.password}
        labelText="Password"
        name="password"
        validateOn="input"
        required
      />
      <!-- <div class="flex items-center gap-2">
        <Checkbox
          labelText="Remember me"
          id="remember-me"
          checked={rememberMe}
        />
      </div> -->
      <Button
        type="submit"
        class="primary w-full"
        disabled={!formValid || submitting}
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  </Card>
</div>
