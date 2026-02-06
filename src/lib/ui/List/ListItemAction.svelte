<script lang="ts">
  import { Button } from 'bits-ui';

	type ListItemActionProps = {
		children: any;
		href?: string;
		onClick?: () => void;
		disabled?: boolean;
	};

	let { children, href, onClick, disabled }: ListItemActionProps = $props();
</script>

<Button.Root href={href} onclick={onClick} {disabled} class={['button text narrow', 'pxl-listitem__action']}>
  {@render children()}
</Button.Root>

<style>
  :global(.pxl-listitem__action) {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    width: 100%;
    height: auto;
    padding: 0.5rem;
    gap: 0.125rem;
    border: none;
    border-radius: 0;
  }
</style>