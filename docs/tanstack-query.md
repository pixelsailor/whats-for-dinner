# TanStack Query in What's For Dinner

This document describes how WFD uses **TanStack Query** (`@tanstack/svelte-query`) for **remote** data that should stay in sync with the UI. It complements the offline-first product model ([ADR-001: Product operating model](../adrs/ADR-001-product-operating-model.md)), local ownership rules ([ADR-002: Local data ownership](../adrs/ADR-002-local-data-ownership.md)), and the layered front-end data-flow decision ([ADR-016: Frontend data flow and Svelte async UX](../adrs/ADR-016-frontend-data-flow-and-svelte-dx.md)).

## Role in the stack

- **Dexie / IndexedDB** remains the **system of record** for the recipe book and other ADR-002 domains. TanStack Query caches **network** responses; it does not replace Dexie for durable user data.
- Prefer **Dexie-backed** reads (LiveQuery stores) for offline-first surfaces; use `createQuery` when the UI needs **server-backed** or **HTTP** data with caching, deduplication, and background refresh.
- Operational boundary with Dexie: [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc) (_Remote and cache layers_).

## `createQuery` usage

- Import **`createQuery`** from `@tanstack/svelte-query` when remote data should stay aligned with UI state.
- Pass an options object (or a store of options) with at least a stable **`queryKey`** and **`queryFn`**. Common options include `select`, `enabled`, `staleTime`, `gcTime`, `placeholderData`, `initialData`, and suspense-related settings. Pass a custom **`queryClient`** as the second argument when shared client configuration or cache isolation is required.
- The helper returns a **Svelte store** whose value matches TanStack’s **`CreateQueryResult<TData, TError>`** (or **`DefinedCreateQueryResult`** when `initialData` / `placeholderData` makes data always defined). Reactive fields include `data`, `error`, `status`, `fetchStatus`, `isPending`, `isSuccess`, `refetch`, `failureCount`, and related helpers—read them inside components via the store subscription pattern below.

## Runes-friendly pattern

Keep the query store **outside** template logic and derive consumable state with runes:

```ts
import { createQuery } from '@tanstack/svelte-query';

const recipesQueryStore = $derived(
  createQuery({
    queryKey: ['recipes', filters],
    queryFn: fetchRecipes,
    placeholderData: []
  })
);

const recipesQueryResults = $derived($recipesQueryStore);

const recipes = $derived(recipesQueryResults.data ?? []);
const refreshRecipes = recipesQueryResults.refetch;
```

Official reference: [TanStack Query — `createQuery` (Svelte)](https://tanstack.com/query/v5/docs/framework/svelte/reference/functions/createquery).

## Offline-first, Zod, and `queryFn`

Per ADR-001 and ADR-002:

1. **Validate** HTTP JSON with **Zod** inside or alongside the `queryFn` (or in the service the `queryFn` calls). Schema placement and `.safeParse()` patterns: [`.cursor/rules/schema-and-type-safety.mdc`](../.cursor/rules/schema-and-type-safety.mdc).
2. When the browser is **offline** or the network path is **unavailable**, **do not** treat TanStack’s cache as authoritative for ADR-002 domains. **Prefer reads from Dexie** (or merge server data into Dexie through existing sync helpers) and use **`placeholderData` / `initialData`** or explicit UI states so the recipe book stays usable without blocking on the network.
3. Keep **`queryFn` side-effect free** for remote fetch + parse only. **Mutations** belong in dedicated helpers, domain services, or SvelteKit server routes—not inside `queryFn` as hidden writes.

## Further reading

- [TanStack Query — Svelte overview](https://tanstack.com/query/latest/docs/framework/svelte/overview)
- [ADR-016: Frontend data flow and Svelte async UX](../adrs/ADR-016-frontend-data-flow-and-svelte-dx.md) — when to use TanStack vs Dexie stores vs load/actions
- [`.cursor/rules/frontend-data-flow.mdc`](../.cursor/rules/frontend-data-flow.mdc) — agent checklist for routes and API modules
- [ADR-001: Product operating model](../adrs/ADR-001-product-operating-model.md) — capability matrix and non-blocking degraded UI
- [ADR-002: Local data ownership](../adrs/ADR-002-local-data-ownership.md) — Dexie as system of record
- [`.cursor/rules/offline-first-development.mdc`](../.cursor/rules/offline-first-development.mdc) — offline vs online behavior expectations
