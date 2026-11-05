<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  import {
    type CalendarMonth,
    formatCalendarMonthParam,
    getMonthNames,
    shiftCalendarMonth
  } from '$lib/api/calendar';
  import Button from '$lib/ui/button.svelte';
  import BackIcon from '$lib/ui/icons/BackIcon.svelte';

  let {
    month,
    years,
    currentMonth
  }: {
    /** The month being viewed. */
    month: CalendarMonth;
    /** Years offered by the year selector (always includes `month.year`). */
    years: number[];
    /** The real current month; target of the "Today" link. */
    currentMonth: CalendarMonth;
  } = $props();

  const monthNames = getMonthNames();

  /** URL for a month. Real href so links work with middle-click, copy, and back/forward. */
  const hrefFor = (m: CalendarMonth): string =>
    resolve(`/calendar?month=${formatCalendarMonthParam(m)}`);

  let previous = $derived(shiftCalendarMonth(month, -1));
  let next = $derived(shiftCalendarMonth(month, 1));

  /** Navigates to a month picked from a selector. */
  function go(m: CalendarMonth): void {
    void goto(resolve(`/calendar?month=${formatCalendarMonthParam(m)}`), {
      noScroll: true,
      keepFocus: true
    });
  }

  function onMonthChange(event: Event & { currentTarget: HTMLSelectElement }) {
    go({ year: month.year, month: Number(event.currentTarget.value) });
  }

  function onYearChange(event: Event & { currentTarget: HTMLSelectElement }) {
    go({ year: Number(event.currentTarget.value), month: month.month });
  }

  const selectClass =
    'rounded-input border-input-border hover:shadow-mini border bg-input';
</script>

<!--
@component MonthNav

Month navigation for the calendar: previous / next / Today links (real anchors) plus native month
and year selectors. The URL (`?month=YYYY-MM`) is the source of truth; nothing here holds state.
-->
<nav aria-label="Calendar navigation" class="flex flex-wrap items-center gap-2">
  <div class="flex items-center gap-1">
    <Button
      href={hrefFor(previous)}
      class="text icon"
      aria-label="Previous month"
      title="Previous month"
      data-sveltekit-noscroll
    >
      <BackIcon size="sm" />
    </Button>
    <Button
      href={hrefFor(next)}
      class="text icon"
      aria-label="Next month"
      title="Next month"
      data-sveltekit-noscroll
    >
      <span class="inline-flex rotate-180"><BackIcon size="sm" /></span>
    </Button>
  </div>

  <label class="sr-only" for="calendar-month">Month</label>
  <select
    id="calendar-month"
    class={selectClass}
    value={String(month.month)}
    onchange={onMonthChange}
  >
    {#each monthNames as name, index (name)}
      <option value={String(index + 1)}>{name}</option>
    {/each}
  </select>

  <label class="sr-only" for="calendar-year">Year</label>
  <select
    id="calendar-year"
    class={selectClass}
    value={String(month.year)}
    onchange={onYearChange}
  >
    {#each years as year (year)}
      <option value={String(year)}>{year}</option>
    {/each}
  </select>

  <Button href={hrefFor(currentMonth)} class="outlined" data-sveltekit-noscroll
    >Today</Button
  >
</nav>
