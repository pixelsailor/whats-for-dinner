<script lang="ts">
  import { Calendar, Popover  } from 'bits-ui';
  import { getLocalTimeZone, parseDate, parseTime, today, type DateValue } from '@internationalized/date';

  import CalendarHeatMapIcon from './icons/CalendarHeatMapIcon.svelte';
  import ChevronLeftIcon from './icons/ChevronLeftIcon.svelte';
  import ChevronRightIcon from './icons/ChevronRightIcon.svelte';

  type Props = Popover.RootProps & {
    iMadeThisToday: boolean;
  }

  let { iMadeThisToday, ...restProps }: Props = $props();

  let value = $state<DateValue[]>([today(getLocalTimeZone())]);
</script>

<Popover.Root {...restProps}>
  <Popover.Trigger class="button icon text">
    <CalendarHeatMapIcon size="xs" class={iMadeThisToday ? 'currentColor' : 'text-dark-40'} />
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="border-dark-10 bg-background shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--bits-popover-content-transform-origin) z-100 w-full max-w-[328px] rounded-[12px] border p-4"
    sideOffset={8}>
      <Calendar.Root type="multiple" weekdayFormat="short" fixedWeeks={true} bind:value={value}>
        {#snippet children({ months, weekdays })}
          <Calendar.Header class="flex items-center justify-between">
            <Calendar.PrevButton class="rounded-9px bg-background-alt hover:bg-muted inline-flex size-10 items-center justify-center transition-all active:scale-[0.98]">
              <ChevronLeftIcon size="xs" />
            </Calendar.PrevButton>
            <Calendar.Heading class="text-[15px] font-medium" />
            <Calendar.NextButton class="rounded-9px bg-background-alt hover:bg-muted inline-flex size-10 items-center justify-center transition-all active:scale-[0.98]">
              <ChevronRightIcon size="xs" />
            </Calendar.NextButton>
          </Calendar.Header>
          <div class="flex flex-col space-y-4 pt-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            {#each months as month (month.value)}
              <Calendar.Grid class="w-full border-collapse select-none space-y-1">
                <Calendar.GridHead>
                  <Calendar.GridRow class="mb-1 flex w-full justify-between">
                    {#each weekdays as day (day)}
                      <Calendar.HeadCell class="text-muted-foreground font-normal! w-10 rounded-md text-xs">
                        <div>{day.slice(0, 2)}</div>
                      </Calendar.HeadCell>
                    {/each}
                  </Calendar.GridRow>
                </Calendar.GridHead>
                <Calendar.GridBody>
                  {#each month.weeks as weekDates (weekDates)}
                    <Calendar.GridRow class="flex w-full">
                      {#each weekDates as date, i (i)}
                        <Calendar.Cell
                          {date}
                          month={month.value}
                          class="p-0! relative size-10 text-center text-sm"
                        >
                          <Calendar.Day
                            class="rounded-9px text-foreground hover:border-foreground data-selected:bg-foreground data-disabled:text-foreground/30 data-selected:text-background data-unavailable:text-muted-foreground data-disabled:pointer-events-none data-outside-month:pointer-events-none data-selected:font-medium data-unavailable:line-through group relative inline-flex size-10 items-center justify-center whitespace-nowrap border border-transparent bg-transparent p-0 text-sm font-normal"
                          >
                            <div
                              class="bg-foreground group-data-selected:bg-background group-data-today:block absolute top-[5px] hidden size-1 rounded-full"
                            ></div>
                            {date.day}
                          </Calendar.Day>
                        </Calendar.Cell>
                      {/each}
                    </Calendar.GridRow>
                  {/each}
                </Calendar.GridBody>
              </Calendar.Grid>
            {/each}
          </div>
        {/snippet}
      </Calendar.Root>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
