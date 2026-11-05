<script lang="ts">
  import { toStore } from 'svelte/store';

  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import {
    buildMonthGrid,
    formatCalendarMonthLabel,
    getCalendarYearRange,
    getCurrentCalendarMonth,
    getWeekdayLabels,
    parseCalendarMonthParam
  } from '$lib/api/calendar';
  import { calendarMonthStore } from '$lib/stores/calendar';
  import { AppBar } from '$lib/ui/AppBar';
  import MonthGrid from '$lib/ui/calendar/MonthGrid.svelte';
  import MonthNav from '$lib/ui/calendar/MonthNav.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

  /** Visible month. The URL (`?month=YYYY-MM`) is the source of truth; invalid/missing = current. */
  let requestedMonth = $derived(
    parseCalendarMonthParam(
      page.url.searchParams.get('month'),
      getCurrentCalendarMonth()
    )
  );

  // Created once: Svelte drops a `$store` subscription before taking a new one, so a store per
  // month would restart the Dexie liveQuery on every navigation.
  const calendar = calendarMonthStore(toStore(() => requestedMonth));

  let month = $derived($calendar.month);
  let monthLabel = $derived(formatCalendarMonthLabel(month));
  let weekdays = getWeekdayLabels();
  let years = $derived(
    getCalendarYearRange($calendar.data?.earliestYear ?? null, month)
  );
  let weeks = $derived(
    $calendar.data ? buildMonthGrid(month, $calendar.data) : null
  );
  let monthIsEmpty = $derived($calendar.data?.days.size === 0);
  let nothingEverMade = $derived($calendar.data?.earliestYear === null);
</script>

<svelte:head>
  <title>What's for dinner? | Calendar</title>
</svelte:head>

<PageHeader>
  <AppBar.Root>
    <AppBar.Text primary="Calendar" />
  </AppBar.Root>
</PageHeader>

<div class="mx-auto w-full max-w-7xl px-2 pb-8 sm:px-4 lg:px-8">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
    <h2 class="text-xl font-semibold" aria-live="polite">{monthLabel}</h2>
    <MonthNav {month} {years} currentMonth={getCurrentCalendarMonth()} />
  </div>

  {#if $calendar.error}
    <div class="grid place-content-center gap-3 py-16">
      <p class="fluid-heading-03">Ah donkey-spittle! There was a problem.</p>
      <p class="flex items-center gap-3">
        <span>{$calendar.error.name}</span><span>|</span><span
          >{$calendar.error.message}</span
        >
      </p>
    </div>
  {:else if $calendar.loading || !weeks}
    <div class="grid place-content-center py-16">
      <ProgressSpinner size="lg" />
    </div>
  {:else}
    {#if nothingEverMade}
      <p class="helper-text mb-3" role="status">
        Nothing has been marked as made yet. When you make a recipe, it will
        show up here on that day. <a
          class="underline"
          href={resolve('/recipes')}>Browse My Recipes</a
        >.
      </p>
    {:else if monthIsEmpty}
      <p class="helper-text mb-3" role="status">
        No recipes were made in {monthLabel}.
      </p>
    {/if}
    <MonthGrid {weeks} {monthLabel} {weekdays} />
  {/if}
</div>
