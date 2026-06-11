<script lang="ts" module>
  import type { TimeValue } from 'bits-ui';
  import type { Time } from '@internationalized/date';
  type T = unknown;
</script>

<script lang="ts" generics="T extends TimeValue = Time">
  import { TimeField } from 'bits-ui';

  let {
    labelText = 'Select a time',
    value = $bindable(),
    placeholder = $bindable(),
    name,
    ...restProps
  }: TimeField.RootProps<T> & { labelText?: string; name?: string } = $props();
</script>

<TimeField.Root hourCycle={24} bind:value bind:placeholder {...restProps}>
  <div class="recipe-time mb-3 flex min-h-24 w-fit flex-col gap-1">
    <TimeField.Label class="label mb-1 block select-none"
      >{labelText}</TimeField.Label
    >
    <TimeField.Input>
      {#snippet children({ segments })}
        {#each segments as { part, value }, i (part + value + i)}
          <div class="inline-block select-none">
            {#if part === 'literal'}
              <TimeField.Segment {part}>
                {value}
              </TimeField.Segment>
            {:else}
              <TimeField.Segment
                {part}
                class="data-invalid:text-destructive fluid-heading-03 rounded-sm bg-gray-100 px-3 py-1 focus-visible:ring-0! dark:bg-gray-900"
              >
                {value}
              </TimeField.Segment>
            {/if}
          </div>
        {/each}
      {/snippet}
    </TimeField.Input>
  </div>
</TimeField.Root>
