<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import cn from 'clsx';

  type SegmentId = 'hours' | 'minutes';

  interface SegmentConfig {
    min: number;
    max: number;
    padZero: boolean;
    label: string;
    ariaLabel: string;
  }

  const SEGMENT_CONFIG: Record<SegmentId, SegmentConfig> = {
    hours: { min: 0, max: 23, padZero: true, label: 'h', ariaLabel: 'Hours' },
    minutes: {
      min: 0,
      max: 59,
      padZero: true,
      label: 'm',
      ariaLabel: 'Minutes'
    }
  };

  type Props = {
    /** Total duration in minutes (hours × 60 + minutes). */
    value?: number;
    /** Form field name for the hidden input. */
    name?: string;
    /** Associates the control with a `<label for="…">`. */
    id?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    invalid?: boolean;
    class?: string;
  } & Omit<HTMLAttributes<HTMLDivElement>, 'id' | 'class'>;

  let {
    value = $bindable(0),
    name,
    id,
    disabled = false,
    readonly = false,
    required = false,
    invalid = false,
    class: className,
    ...restProps
  }: Props = $props();

  const uid = $props.id();
  const rootId = $derived(id ?? uid);

  let segmentHours = $state<string | null>(null);
  let segmentMinutes = $state<string | null>(null);
  let activeSegment = $state<SegmentId | null>(null);
  let hoursEl = $state<HTMLSpanElement | null>(null);
  let minutesEl = $state<HTMLSpanElement | null>(null);

  /** Per-segment typing state (mirrors bits-ui date-field segment behavior). */
  let segmentTyping = $state({
    hours: { hasLeftFocus: false, lastKeyZero: false },
    minutes: { hasLeftFocus: false, lastKeyZero: false }
  });

  let internalValueUpdate = false;

  /**
   * Pads a segment value for display when non-empty.
   * @param raw - Segment digits or null when empty
   * @param config - Segment bounds and padding rules
   */
  function formatSegmentDisplay(
    raw: string | null,
    config: SegmentConfig
  ): string {
    if (raw === null) return config.padZero ? '00' : '';
    if (config.padZero && raw.length === 1) return `0${raw}`;
    return raw;
  }

  /**
   * Converts segment strings to a non-negative minute total.
   * @param hours - Hours segment value
   * @param minutes - Minutes segment value
   */
  function segmentsToMinutes(
    hours: string | null,
    minutes: string | null
  ): number {
    const h = hours === null ? 0 : Number.parseInt(hours, 10);
    const m = minutes === null ? 0 : Number.parseInt(minutes, 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return h * 60 + m;
  }

  /**
   * Syncs editable segments from the bound minute value.
   * @param totalMinutes - Total duration in minutes
   */
  function syncSegmentsFromValue(totalMinutes: number): void {
    const safe = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    segmentHours = formatSegmentValue(h, SEGMENT_CONFIG.hours);
    segmentMinutes = formatSegmentValue(m, SEGMENT_CONFIG.minutes);
  }

  /**
   * Writes the bound value from the current segments.
   */
  function commitValueFromSegments(): void {
    internalValueUpdate = true;
    value = segmentsToMinutes(segmentHours, segmentMinutes);
    internalValueUpdate = false;
  }

  $effect(() => {
    const total = value;
    if (internalValueUpdate) return;
    syncSegmentsFromValue(total);
  });

  /**
   * @param segment - Segment being edited
   */
  function getSegmentElement(segment: SegmentId): HTMLSpanElement | null {
    return segment === 'hours' ? hoursEl : minutesEl;
  }

  /**
   * @param segment - Segment to focus
   */
  function focusSegment(segment: SegmentId): void {
    getSegmentElement(segment)?.focus();
  }

  /**
   * @param segment - Segment receiving focus
   * @param event - Focus event from the segment element
   */
  function handleSegmentFocus(segment: SegmentId, event: FocusEvent): void {
    if (disabled || readonly) return;
    activeSegment = segment;
    const el = event.currentTarget as HTMLSpanElement;
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  /**
   * @param segment - Segment losing focus
   */
  function handleSegmentBlur(segment: SegmentId): void {
    const config = SEGMENT_CONFIG[segment];
    const typing = segmentTyping[segment];

    typing.hasLeftFocus = true;

    const raw = segment === 'hours' ? segmentHours : segmentMinutes;
    if (raw !== null && config.padZero && raw.length === 1) {
      const padded = `0${raw}`;
      if (segment === 'hours') segmentHours = padded;
      else segmentMinutes = padded;
    }

    commitValueFromSegments();

    if (activeSegment === segment) activeSegment = null;
  }

  /**
   * @param segment - Segment to update
   * @param updater - Receives the previous segment string
   */
  function updateSegment(
    segment: SegmentId,
    updater: (prev: string | null) => string | null
  ): void {
    if (disabled || readonly) return;
    if (segment === 'hours') segmentHours = updater(segmentHours);
    else segmentMinutes = updater(segmentMinutes);
    commitValueFromSegments();
  }

  /**
   * @param value - Numeric segment value
   * @param config - Segment configuration
   * @param forDisplay - Whether to apply zero-padding for display
   */
  function formatSegmentValue(
    value: number,
    config: SegmentConfig,
    forDisplay = true
  ): string {
    const str = String(value);
    if (forDisplay && config.padZero && str.length === 1) return `0${value}`;
    return str;
  }

  /**
   * @param segment - Segment being incremented
   */
  function handleArrowUp(segment: SegmentId): void {
    const config = SEGMENT_CONFIG[segment];
    segmentTyping[segment].hasLeftFocus = false;
    updateSegment(segment, (prev) => {
      const current = prev === null ? config.min : Number.parseInt(prev, 10);
      const next = current >= config.max ? config.min : current + 1;
      return formatSegmentValue(next, config);
    });
  }

  /**
   * @param segment - Segment being decremented
   */
  function handleArrowDown(segment: SegmentId): void {
    const config = SEGMENT_CONFIG[segment];
    segmentTyping[segment].hasLeftFocus = false;
    updateSegment(segment, (prev) => {
      const current = prev === null ? config.max : Number.parseInt(prev, 10);
      const next = current <= config.min ? config.max : current - 1;
      return formatSegmentValue(next, config);
    });
  }

  /**
   * @param segment - Segment receiving the digit
   * @param digit - Single numeric key
   * @returns Whether focus should move to the next segment
   */
  function handleDigit(segment: SegmentId, digit: number): boolean {
    const config = SEGMENT_CONFIG[segment];
    const typing = segmentTyping[segment];
    const maxStart = Math.floor(config.max / 10);
    let moveToNext = false;

    updateSegment(segment, (prev) => {
      if (typing.hasLeftFocus) {
        prev = null;
        typing.hasLeftFocus = false;
      }

      if (prev === null) {
        if (digit === 0) {
          typing.lastKeyZero = true;
          return '0';
        }

        if (typing.lastKeyZero || digit > maxStart) {
          moveToNext = true;
        }

        typing.lastKeyZero = false;

        if (moveToNext) return `0${digit}`;
        return String(digit);
      }

      if (typing.lastKeyZero) {
        if (digit !== 0) {
          moveToNext = true;
          typing.lastKeyZero = false;
          return `0${digit}`;
        }

        if (segment === 'minutes' && digit === 0) {
          moveToNext = true;
          typing.lastKeyZero = false;
          return '00';
        }

        return prev;
      }

      const total = Number.parseInt(`${prev}${digit}`, 10);
      if (total > config.max) {
        moveToNext = true;
        return `0${digit}`;
      }

      moveToNext = true;
      return String(total);
    });

    return moveToNext && segment === 'hours';
  }

  /**
   * @param segment - Segment receiving backspace
   * @param event - Keyboard event for focus navigation
   */
  function handleBackspace(segment: SegmentId, event: KeyboardEvent): void {
    const typing = segmentTyping[segment];
    typing.hasLeftFocus = false;
    let moveToPrev = false;

    updateSegment(segment, (prev) => {
      if (prev === null) {
        moveToPrev = true;
        return null;
      }

      if (prev.length === 2 && prev.startsWith('0')) {
        return null;
      }

      if (prev.length === 1) {
        return null;
      }

      return String(Number.parseInt(prev.slice(0, -1), 10));
    });

    if (moveToPrev && segment === 'minutes') {
      event.preventDefault();
      focusSegment('hours');
    }
  }

  /**
   * @param segment - Active segment
   * @param event - Keyboard event
   */
  function handleSegmentKeydown(
    segment: SegmentId,
    event: KeyboardEvent
  ): void {
    if (disabled || readonly) return;
    if (event.ctrlKey || event.metaKey) return;

    const key = event.key;

    if (key !== 'Tab') event.preventDefault();

    if (key === 'ArrowUp') {
      handleArrowUp(segment);
      return;
    }

    if (key === 'ArrowDown') {
      handleArrowDown(segment);
      return;
    }

    if (/^\d$/.test(key)) {
      if (handleDigit(segment, Number.parseInt(key, 10))) {
        focusSegment('minutes');
      }
      return;
    }

    if (key === 'Backspace' || key === 'Delete') {
      handleBackspace(segment, event);
      return;
    }

    if (key === 'ArrowRight' && segment === 'hours') {
      event.preventDefault();
      focusSegment('minutes');
      return;
    }

    if (key === 'ArrowLeft' && segment === 'minutes') {
      event.preventDefault();
      focusSegment('hours');
    }
  }

  /**
   * @param segment - Segment receiving paste
   * @param event - Clipboard event
   */
  function handleSegmentPaste(segment: SegmentId, event: ClipboardEvent): void {
    if (disabled || readonly) return;
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '');
    if (!digits) return;

    for (const char of digits) {
      if (
        handleDigit(segment, Number.parseInt(char, 10)) &&
        segment === 'hours'
      ) {
        focusSegment('minutes');
      }
    }
  }

  /**
   * @param segment - Segment id
   * @param raw - Raw segment value
   */
  function segmentAriaValue(segment: SegmentId, raw: string | null) {
    const config = SEGMENT_CONFIG[segment];
    const parsed = raw === null ? null : Number.parseInt(raw, 10);
    return {
      'aria-label': config.ariaLabel,
      'aria-valuenow': parsed ?? undefined,
      'aria-valuemin': config.min,
      'aria-valuemax': config.max,
      'aria-valuetext':
        raw === null ? 'Empty' : formatSegmentDisplay(raw, config)
    };
  }

  /**
   * @param segment - Segment id
   * @param raw - Raw segment value
   */
  function isSegmentEmpty(raw: string | null): boolean {
    return raw === null;
  }

  const hoursDisplay = $derived(
    formatSegmentDisplay(segmentHours, SEGMENT_CONFIG.hours)
  );
  const minutesDisplay = $derived(
    formatSegmentDisplay(segmentMinutes, SEGMENT_CONFIG.minutes)
  );
  const hiddenValue = $derived(String(Math.max(0, value)));
</script>

<!--
@component
Segmented hours/minutes duration input styled like a digital clock; bound value is total minutes.

- Usage:
```svelte
<TimePicker bind:value={prepTimeMinutes} name="prep_time" />
```
-->

<div
  {...restProps}
  id={rootId}
  role="group"
  data-invalid={invalid ? '' : undefined}
  data-disabled={disabled ? '' : undefined}
  class={cn(
    'time-picker h-input-mobile md:h-input rounded-input border-input-border bg-input text-foreground focus-within:shadow-date-field-focus data-invalid:border-destructive flex w-fit select-none items-center border px-3 py-2',
    disabled && 'pointer-events-none opacity-50',
    className
  )}
>
  {#if name}
    <input type="hidden" {name} value={hiddenValue} {required} />
  {/if}

  <div class="time-picker__segments flex flex-1 items-baseline gap-4">
    <div class="time-picker__unit-group inline-flex items-baseline gap-0.5">
      <div class="inline-block select-none">
        <span
          bind:this={hoursEl}
          role="spinbutton"
          tabindex={disabled ? -1 : 0}
          spellcheck="false"
          inputmode="numeric"
          enterkeyhint="next"
          contenteditable={disabled || readonly ? undefined : 'true'}
          class={cn(
            'time-picker__segment rounded-input tabular-nums px-1 py-0.5 outline-none focus-visible:ring-0',
            activeSegment === 'hours'
              ? 'bg-muted text-foreground'
              : 'hover:bg-muted/60',
            isSegmentEmpty(segmentHours) && 'text-muted-foreground'
          )}
          style="caret-color: transparent"
          {...segmentAriaValue('hours', segmentHours)}
          onfocus={(e) => handleSegmentFocus('hours', e)}
          onblur={() => handleSegmentBlur('hours')}
          onkeydown={(e) => handleSegmentKeydown('hours', e)}
          onbeforeinput={(e) => e.preventDefault()}
          onpaste={(e) => handleSegmentPaste('hours', e)}
        >
          {hoursDisplay}
        </span>
      </div>
      <span class="time-picker__unit text-placeholder" aria-hidden="true"
        >h</span
      >
    </div>

    <div class="time-picker__unit-group inline-flex items-baseline gap-0.5">
      <div class="inline-block select-none">
        <span
          bind:this={minutesEl}
          role="spinbutton"
          tabindex={disabled ? -1 : 0}
          spellcheck="false"
          inputmode="numeric"
          enterkeyhint="done"
          contenteditable={disabled || readonly ? undefined : 'true'}
          class={cn(
            'time-picker__segment rounded-5px tabular-nums px-1 py-0.5 outline-none focus-visible:ring-0',
            activeSegment === 'minutes'
              ? 'bg-muted text-foreground'
              : 'hover:bg-muted/60',
            isSegmentEmpty(segmentMinutes) && 'text-muted-foreground'
          )}
          style="caret-color: transparent"
          {...segmentAriaValue('minutes', segmentMinutes)}
          onfocus={(e) => handleSegmentFocus('minutes', e)}
          onblur={() => handleSegmentBlur('minutes')}
          onkeydown={(e) => handleSegmentKeydown('minutes', e)}
          onbeforeinput={(e) => e.preventDefault()}
          onpaste={(e) => handleSegmentPaste('minutes', e)}
        >
          {minutesDisplay}
        </span>
      </div>
      <span class="time-picker__unit text-placeholder" aria-hidden="true"
        >m</span
      >
    </div>
  </div>
</div>

<style>
  .time-picker__segment {
    font-size: 1.5rem;
    font-weight: 500;
    line-height: 1.1;
    min-width: 2ch;
    text-align: center;
  }

  .time-picker__unit {
    font-size: 0.75rem;
    line-height: 1;
    translate: 0 0.15em;
  }
</style>
