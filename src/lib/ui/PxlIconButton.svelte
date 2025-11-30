<script lang="ts">
	import { Button } from 'bits-ui';
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	type Props = Button.RootProps & Tooltip.RootProps & {
		children: any;
		shape?: 'circle' | 'square';
		tooltip?: string;
		// trigger: Snippet;
		// triggerProps?: Tooltip.TriggerProps;
		[x: string]: any;
	};

	let {
    open = $bindable(false),
    children,
		shape = 'circle',
		tooltip,
    // trigger,
    // triggerProps = {},
    ...props
  }: Props = $props();

	let triggerProps: Tooltip.TriggerProps = {
		onclick: props.onclick as MouseEventHandler<HTMLButtonElement>,
		...props.tooltipTriggerProps
	};
	
</script>

<!--
@component
# PxlIconButton
A custom icon button component that provides a consistent styling and behavior for icon buttons.
Includes built-in tooltip support.

_Reference: bits-ui [Button](https://bits-ui.com/docs/components/button/llms.txt)_
_Reference: bits-ui [Tooltip](https://bits-ui.com/docs/components/tooltip/llms.txt)_

## Usage
- Basic Usage
```html
<PxlIconButton onclick={() => isFavorite = !isFavorite}>
	<FavoriteIcon size="xs" />
</PxlIconButton>
```

- With Tooltip
```html
<PxlIconButton onclick={() => isFavorite = !isFavorite} tooltip="Mark as favorite">
	<FavoriteIcon size="xs" />
</PxlIconButton>
```
-->
{#if tooltip}
	<Tooltip.Provider delayDuration={300} ignoreNonKeyboardFocus={true}>
		<Tooltip.Root open={open}>
			<Tooltip.Trigger
				class="pxl-icon-button hover:bg-gray-200 hover:shadow-sm dark:hover:bg-gray-900"
				style={`border-radius: ${shape === 'circle' ? '9999px' : '0.125rem'};`}
				{...triggerProps}
			>
				{@render children()}
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="helper-text text-gray-800 bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-sm py-1 px-2 shadow-sm">
					<Tooltip.Arrow class="text-gray-300 dark:text-gray-800" />
					<span class="helper-text">{tooltip}</span>
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	</Tooltip.Provider>
{:else}
	<Button.Root
		class="pxl-icon-button hover:bg-gray-200 hover:shadow-sm dark:hover:bg-gray-900"
		style={`border-radius: ${shape === 'circle' ? '9999px' : '0.125rem'};`}
		{...props}
	>
		{@render children()}
	</Button.Root>
{/if}

<style>
	:global(.pxl-icon-button) {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 2.5rem;
		width: 2.5rem;
		color: currentColor;
		border: 1px solid transparent;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		backdrop-filter: opacity(0);
		transition: backdrop-filter 0.9s ease-in-out;
	}

	:global(.pxl-icon-button:hover) {
		backdrop-filter: opacity(0.75);
	}

	:global(.pxl-icon-button:disabled) {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>