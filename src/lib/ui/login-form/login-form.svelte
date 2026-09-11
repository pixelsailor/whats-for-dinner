<script lang="ts">
  import { applyAction, enhance } from '$app/forms';
  import { resolve } from '$app/paths';

  import FormGroup from '$lib/ui/form-group/form-group';
  import Password from '$lib/ui/password/password.svelte';
  import TextInput from '$lib/ui/text-input/text-input.svelte';

  // eslint-disable-next-line no-useless-assignment
  let {
    id = 'login-form',
    status = $bindable('invalid'),
    onSuccess
  } = $props();

  let loginError = $state('');

  const formGroup = new FormGroup({
    email: '',
    password: ''
  });

  let formValid = $derived.by(() => {
    return Object.values(formGroup.controls).every((control) => control.valid);
  });

  $effect(() => {
    if (formValid) {
      status = 'idle';
    } else {
      status = 'invalid';
    }
  });

  function handleOnSuccess() {
    onSuccess?.();
  }
</script>

<form
  {id}
  method="POST"
  action={resolve('/auth?/login')}
  class="form"
  use:enhance={() => {
    status = 'progress';
    return async ({ result }) => {
      status = 'idle';
      if (result.type === 'error') {
        loginError = result.error.message;
      } else {
        await applyAction(result);
        handleOnSuccess();
      }
    };
  }}
>
  {#if loginError}
    <div
      class="banner alert-5 rounded border border-red-300 bg-red-100 p-2 text-black"
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
</form>
