# Calendar API module (contracts)

## Overview

The calendar module under `src/lib/api/calendar/` holds **Zod schemas, inferred types, and pure helpers** for the `/calendar` month view. It does **not** include a `calendar.service.ts` and persists nothing.

The durable source of truth is `SavedRecipe.checkout_history` in Dexie ([ADR-002](../../../../adrs/ADR-002-local-data-ownership.md)). The calendar is a **read-only, derived view** of it: it adds no table, no sync behavior, and no server route ([ADR-012](../../../../adrs/ADR-012-feature-roadmap-boundaries.md) §A). Reads and reactive subscriptions live in **`src/lib/stores/calendar.ts`**; this folder stays free of Dexie and DOM access.

Feature design, escalation plan, and measurements: [`docs/calendar/README.md`](../../../../docs/calendar/README.md).

## Layout

| File                  | Role                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `calendar.schemas.ts` | Zod `.strict()` schemas: month, `?month=` param, recipe entry, month data, grid cell           |
| `calendar.types.ts`   | `z.infer` types, plus `CheckoutIndex` and `CheckoutIndexSource`                                |
| `calendar.model.ts`   | Pure helpers: month arithmetic, `buildCheckoutIndex`, `selectCalendarMonth`, `buildMonthGrid`  |
| `calendar.labels.ts`  | Month and weekday labels via `DateFormatter` (`@internationalized/date`), fixed `en-US` locale |
| `index.ts`            | Public barrel                                                                                  |

## Rules for this module

- **Dates are calendar days, not instants.** Never build days with `new Date('YYYY-MM-DD')` or serialize via `toISOString()`; that shifts days in negative-offset time zones. Use integers or `setUTCFullYear` + `getUTC*`. "Today" is `isoDateToday()`.
- **Reuse `toIsoDate`** from `$lib/api/recipe` to normalize `checkout_history`; legacy rows can hold timestamps.
- **Do not import** `$lib/api/cloud`, `$lib/server/**`, `$lib/recommendations`, or `$lib/openai/**` ([ADR-009](../../../../adrs/ADR-009-recommendations-engine-inputs.md), ADR-012 §A).
- **Memory:** `buildCheckoutIndex` shares one `{ id, title }` object per recipe across its dates and leaves lists unsorted; `selectCalendarMonth` sorts only the visible month. Indexes are treated as immutable (`earliestYear` is cached per Map instance).
- **No time-of-day ordering exists.** Within a day, entries sort by title, then id.
- **Labels use a fixed locale** and UTC-zoned formatting so server-rendered and browser text match and never shift with the runtime time zone.

## Related

| Topic              | Location                                                                |
| ------------------ | ----------------------------------------------------------------------- |
| API layer overview | [`../README.md`](../README.md)                                          |
| Recipe contracts   | [`../recipe/README.md`](../recipe/README.md)                            |
| Store read model   | [`../../stores/README.md`](../../stores/README.md)                      |
| Frontend data flow | [ADR-016](../../../../adrs/ADR-016-frontend-data-flow-and-svelte-dx.md) |
