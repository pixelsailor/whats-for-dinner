<script lang="ts">
  import { resolve } from '$app/paths';

  import type { CalendarWeek, WeekdayLabel } from '$lib/api/calendar';

  let {
    weeks,
    monthLabel,
    weekdays
  }: {
    /** Rows of exactly seven cells, from `buildMonthGrid`. */
    weeks: CalendarWeek[];
    /** Accessible table name, e.g. "November 2026". */
    monthLabel: string;
    /** Column headers in the same order as the grid's first weekday. */
    weekdays: WeekdayLabel[];
  } = $props();
</script>

<!--
@component MonthGrid

Classic month calendar as a semantic table. Seven equal columns at every width (`table-fixed`),
so recipe pills truncate instead of widening the page. Every recipe made on a day is listed; a busy
day grows its row.
-->
<table class="w-full table-fixed border-collapse">
  <caption class="sr-only">{monthLabel}</caption>
  <thead>
    <tr>
      {#each weekdays as day (day.long)}
        <th
          scope="col"
          class="border-border text-foreground-alt border-b px-1 py-2 text-xs font-semibold sm:text-sm"
        >
          <span class="sr-only">{day.long}</span>
          <span aria-hidden="true" class="hidden sm:inline">{day.short}</span>
          <span aria-hidden="true" class="sm:hidden">{day.narrow}</span>
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each weeks as week, weekIndex (weekIndex)}
      <tr>
        {#each week as cell, cellIndex (cellIndex)}
          {#if cell.kind === 'filler'}
            <td class="border-border bg-dark-04 border"></td>
          {:else}
            <td
              class={[
                'border-border h-20 min-w-0 overflow-hidden border p-0.5 align-top sm:h-28 sm:p-1',
                cell.isToday && 'outline-primary outline-2 -outline-offset-2'
              ]}
            >
              <time
                datetime={cell.iso}
                aria-current={cell.isToday ? 'date' : undefined}
                class={[
                  'mb-0.5 inline-flex size-6 items-center justify-center rounded-full text-xs sm:text-sm',
                  cell.isToday && 'bg-primary text-primary-foreground font-bold'
                ]}>{cell.day}</time
              >
              {#if cell.entries.length > 0}
                <ul class="flex min-w-0 flex-col gap-0.5">
                  {#each cell.entries as entry (entry.id)}
                    <li class="min-w-0">
                      <a
                        href={resolve('/recipes/[...id]', { id: entry.id })}
                        title={entry.title}
                        class="bg-dark-10 hover:bg-dark-40 focus-visible:outline-primary rounded-input block truncate px-1.5 py-1 text-[0.6875rem] leading-4 whitespace-nowrap focus-visible:outline-2 sm:text-xs"
                        >{entry.title}</a
                      >
                    </li>
                  {/each}
                </ul>
              {/if}
            </td>
          {/if}
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
