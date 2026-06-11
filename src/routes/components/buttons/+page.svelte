<script lang="ts">
  import { Button } from 'bits-ui';
  import SettingsIcon from '$lib/ui/icons/SettingsIcon.svelte';
</script>

<div class="mx-auto flex max-w-5xl gap-8 px-4 py-8 lg:px-8">
  <aside class="sticky top-6 w-48 flex-none">
    <nav>
      <ul>
        <li><a href="#basic">Basic</a></li>
        <li><a href="#outlined">Outlined</a></li>
        <li><a href="#text">Text</a></li>
      </ul>
    </nav>
  </aside>
  <article>
    <h1 class="fluid-heading-06">Buttons</h1>
    <section class="my-8 flex flex-col gap-4">
      <h2 class="fluid-heading-05">Basic</h2>
      <div class="flex flex-row flex-wrap gap-4">
        <Button.Root class="button">Default</Button.Root>
        <Button.Root class="button primary">Primary</Button.Root>
        <Button.Root class="button warn">Warn</Button.Root>
        <Button.Root class="button danger">Danger</Button.Root>
        <Button.Root class="button raised">Raised</Button.Root>
        <Button.Root class="button danger" disabled>Disabled</Button.Root>
      </div>
    </section>

    <section class="my-8 flex flex-col gap-4">
      <h2 class="fluid-heading-05">Outlined</h2>
      <div class="flex flex-row flex-wrap gap-4">
        <Button.Root class="button outlined">Default</Button.Root>
        <Button.Root class="button outlined primary">Primary</Button.Root>
        <Button.Root class="button outlined warn">Warn</Button.Root>
        <Button.Root class="button outlined danger">Danger</Button.Root>
        <Button.Root class="button outlined raised">Raised</Button.Root>
        <Button.Root class="button outlined primary" disabled
          >Disabled</Button.Root
        >
      </div>
    </section>

    <section class="my-8 flex flex-col gap-4">
      <h2 class="fluid-heading-05">Text</h2>
      <div class="flex flex-row flex-wrap gap-4">
        <Button.Root class="button text">Default</Button.Root>
        <Button.Root class="button text primary">Primary</Button.Root>
        <Button.Root class="button text warn">Warn</Button.Root>
        <Button.Root class="button text danger">Danger</Button.Root>
        <Button.Root class="button text raised">Raised</Button.Root>
        <Button.Root class="button text primary" disabled>Disabled</Button.Root>
      </div>
    </section>

    <section class="my-8 flex flex-col gap-4">
      <h2 class="fluid-heading-05">Icon</h2>
      <p class="body">
        Icon buttons are designed to be used with svg icons only, without any
        text. To visually balance their circular shape, they have a slightly
        larger height than regular buttons, along with a width equal to their
        height. SVG icons are absolutely centered within the button. They
        inherit the properties of any other button modifier class, e.g. primary,
        outlined, text, etc.
      </p>
      <div class="flex flex-row flex-wrap gap-4">
        <Button.Root class="button icon">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon primary">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon warn">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon danger">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon raised">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon primary" disabled>
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon">
          <SettingsIcon size="lg" />
        </Button.Root>
        <Button.Root class="button icon">
          <SettingsIcon size="xs" />
        </Button.Root>
      </div>
      <div class="flex flex-row flex-wrap gap-4">
        <Button.Root class="button icon outlined">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon outlined primary">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon outlined warn">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon outlined danger">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon outlined raised">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon outlined primary" disabled>
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon outlined">
          <SettingsIcon size="lg" />
        </Button.Root>
        <Button.Root class="button icon outlined">
          <SettingsIcon size="xs" />
        </Button.Root>
      </div>
      <div class="flex flex-row flex-wrap gap-4">
        <Button.Root class="button icon text">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon text primary">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon text warn">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon text danger">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon text raised">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon text primary" disabled>
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button icon text">
          <SettingsIcon size="lg" />
        </Button.Root>
        <Button.Root class="button icon text">
          <SettingsIcon size="xs" />
        </Button.Root>
      </div>
    </section>

    <section class="my-8 flex flex-col gap-4">
      <h2 class="fluid-heading-05">Narrow</h2>
      <p class="body">
        Narrow buttons have a smaller padding on the left and right sides;
        specifically designed for buttons featuring both text and icons where
        the visibility of the text is dependent on the available space. When
        text is hidden, the button will be reduced to a square with the icon
        centered, without the need to adjust alignment.
      </p>
      <div class="flex flex-row flex-wrap gap-4">
        <Button.Root class="button narrow">Default</Button.Root>
        <Button.Root class="button narrow">
          <SettingsIcon size="sm" />
          <span>Default</span>
        </Button.Root>
        <Button.Root class="button narrow">
          <SettingsIcon size="sm" />
        </Button.Root>
        <Button.Root class="button narrow">
          <SettingsIcon />
        </Button.Root>
        <Button.Root class="button narrow">
          <SettingsIcon size="xs" />
        </Button.Root>
      </div>
    </section>
  </article>
</div>
