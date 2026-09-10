<script lang="ts">
  import { NavigationMenu } from 'bits-ui';
  import { getContext } from 'svelte';
  import { invalidate } from '$app/navigation';

  import Button from '$lib/ui/button.svelte';
  import RecipesIcon from '$lib/ui/icons/RecipesIcon.svelte';
  import CollapseSidenavIcon from '$lib/ui/icons/CollapseSidenavIcon.svelte';
  import ChatbotIcon from '$lib/ui/icons/ChatbotIcon.svelte';
  import SettingsIcon from '$lib/ui/icons/SettingsIcon.svelte';
  import OpenPanelLeftIcon from '$lib/ui/icons/OpenPanelLeftIcon.svelte';
  import LogoutIcon from '$lib/ui/icons/LogoutIcon.svelte';
  import LoginIcon from '$lib/ui/icons/LoginIcon.svelte';
  import DocumentAddIcon from '$lib/ui/icons/DocumentAddIcon.svelte';
  import TimeIcon from '$lib/ui/icons/Time.svelte';
  import { AppBar } from '../AppBar';
  import type { Viewport } from '$lib/types';
  import Dialog from '../Dialog.svelte';
  import LoginForm from '../login-form/login-form.svelte';

  let { session, recentlyOpened, network, supabase } = $props();

  const vp: Viewport = getContext('viewport');

  let openLoginDialog = $state(false);
  let loginFormStatus = $state<'idle' | 'progress' | 'invalid'>('invalid');

  async function handleSignOut() {
    await supabase.auth.signOut();
    invalidate('supabase:auth');
  }

  function toggleSidenav() {
    vp.nav = vp.nav === 'expanded' ? 'collapsed' : 'expanded';
  }
</script>

<div class="flex flex-col justify-between h-full">
  {#if vp.nav === 'expanded'}
    <AppBar.Root disableMobileNav>
      <div class="ml-2.5">
        <Button href="/" class="text icon">
          <ChatbotIcon size="sm" />
        </Button>
      </div>
      <AppBar.End>
        <div class="mr-5.5">
          <Button
            class="text icon"
            onclick={toggleSidenav}
            tooltip="Minimize navigation panel"
          >
            <CollapseSidenavIcon size="sm" />
          </Button>
        </div>
      </AppBar.End>
    </AppBar.Root>
  {:else}
    <AppBar.Root disableMobileNav>
      <div class="ml-2.5">
        <Button
          class="text icon"
          onclick={toggleSidenav}
          tooltip="Toggle side-nav"
        >
          <OpenPanelLeftIcon size="xs" />
        </Button>
      </div>
    </AppBar.Root>
  {/if}

  <div class="w-full overflow-x-hidden px-2 grow overflow-y-auto">
    <NavigationMenu.Root orientation="vertical">
      <NavigationMenu.List>
        {#if session}
          <NavigationMenu.Item>
            <NavigationMenu.Link
              href="/"
              class="sidenav-link h-input-mobile md:h-input hover:bg-dark-10"
            >
              <ChatbotIcon size="xs" />
              {#if vp.nav === 'expanded'}
                <span class="sidenav-link__text">What's For Dinner?</span>
              {/if}
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        {/if}
        <NavigationMenu.Item>
          <NavigationMenu.Link
            href="/recommendations"
            class="sidenav-link h-input-mobile md:h-input hover:bg-dark-10"
          >
            <TimeIcon size="xs" ariaLabel="Recommendations" />
            {#if vp.nav === 'expanded'}
              <span class="sidenav-link__text">Recommendations</span>
            {/if}
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item class="rounded-button hover:bg-dark-04">
          <div class="button-group">
            <NavigationMenu.Link
              href="/recipes"
              class="sidenav-link flex-grow h-input-mobile md:h-input hover:bg-dark-10 rounded-r-none"
            >
              <RecipesIcon size="xs" />
              {#if vp.nav === 'expanded'}
                <span class="sidenav-link__text">My Recipes</span>
              {/if}
            </NavigationMenu.Link>
            {#if vp.nav === 'expanded'}
              <NavigationMenu.Link
                href="/recipes/new"
                class="sidenav-link flex-none min-content h-input-mobile md:h-input hover:bg-dark-10 rounded-l-none"
              >
                <DocumentAddIcon size="xs" />
              </NavigationMenu.Link>
            {/if}
          </div>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>

    {#if vp.nav === 'expanded'}
      <div class="mx-3 mt-8 mb-2">
        <span class="heading-compact text-foreground-alt">Recent recipes</span>
      </div>

      {#if recentlyOpened.length === 0}
        <p class="helper-text m-3 italic">
          Your recently viewed recipes will appear here.
        </p>
      {:else if recentlyOpened.length > 0}
        <NavigationMenu.Root orientation="vertical">
          <NavigationMenu.List>
            {#each recentlyOpened as recipe (recipe.id)}
              <NavigationMenu.Item>
                <NavigationMenu.Link
                  href="/recipes/{recipe.id}"
                  title={recipe.title}
                  class="sidenav-link h-input-mobile md:h-input hover:bg-dark-10"
                >
                  <span class="sidenav-link__text">{recipe.title}</span>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            {/each}
          </NavigationMenu.List>
        </NavigationMenu.Root>
      {/if}
      {#if !network.online}
        <div
          class="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
        >
          Offline mode: cloud sync and AI features are temporarily disabled.
        </div>
      {/if}
    {/if}
  </div>
  <div class="w-full p-2">
    <NavigationMenu.Root orientation="vertical">
      <NavigationMenu.List>
        {#if session}
          <NavigationMenu.Item>
            <NavigationMenu.Link
              class="sidenav-link h-input-mobile md:h-input hover:bg-dark-10"
              href="/preferences"
            >
              <SettingsIcon size="xs" />
              {#if vp.nav === 'expanded'}
                <span class="sidenav-link__text">Preferences</span>
              {/if}
            </NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <button
              class="sidenav-link w-full h-input-mobile md:h-input hover:bg-dark-10 hover:cursor-pointer"
              onclick={handleSignOut}
            >
              <LogoutIcon size="xs" />
              {#if vp.nav === 'expanded'}
                <span class="sidenav-link__text user-email"
                  >{session.user.email}</span
                >
                <span class="sidenav-link__text logout">Log out</span>
              {/if}
            </button>
          </NavigationMenu.Item>
        {:else}
          <NavigationMenu.Item>
            <button
              class="sidenav-link w-full h-input-mobile md:h-input hover:bg-dark-10 hover:cursor-pointer"
              onclick={() => (openLoginDialog = true)}
            >
              <LoginIcon size="xs" />
              {#if vp.nav === 'expanded'}
                <span class="sidenav-link__text">Log in</span>
              {/if}
            </button>
          </NavigationMenu.Item>
        {/if}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  </div>
</div>

<Dialog bind:open={openLoginDialog}>
  {#snippet title()}
    <h1>Log in</h1>
  {/snippet}
  {#snippet description()}
    <p>Log in to your account to continue.</p>
  {/snippet}
  <LoginForm
    bind:status={loginFormStatus}
    onSuccess={() => (openLoginDialog = false)}
  />
  {#snippet actions()}
    <Button
      type="submit"
      class="primary"
      form="login-form"
      disabled={loginFormStatus === 'progress' || loginFormStatus === 'invalid'}
      >Log in</Button
    >
  {/snippet}
</Dialog>

<style>
  .sidenav-link .sidenav-link__text.logout {
    display: none;
  }

  .sidenav-link:hover,
  .sidenav-link:focus {
    .sidenav-link__text.logout {
      display: block;
    }
    .sidenav-link__text.user-email {
      display: none;
    }
  }
</style>
