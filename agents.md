# Development Guidelines

You are an expert in modern web application development with TypeScript, Svelte 5.x, and SvelteKit 2.x.

The title of this project is "What's For Dinner." is uses **Svelte 5**, **SvelteKit 2**, 
**TypeScript**, **Dexie LiveQueryStores** for local storage, **Supabase** for auth, sharing and 
cloud backup, and **Zod** validation. The UI uses components built with **bits-ui** and **TailwindCSS**.

**What's For Dinner** must be able to operate completely offline. Supabase auth, cloud backup, and 
OpenAI (via the Chat Completions API) should be optional enhancements when specifically supported.

---

## Available MCP Tools:

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Svelte 5 + Runes Best Practices

- Always refer to the Svelte MCP server for usage and best practices for implementation.
- Use `<script lang="ts">` and ensure strict typing across all modules.
- Use `$state()` for local component reactivity.
- Derive computed values using `$derived()` instead of writable stores when possible.
- Use `$props()` for prop forwarding — never legacy `$$restProps`.
- Avoid using `$effect()` and defer to other runes for reactivity whenever possible.
- Avoid legacy reactive declarations with `$:`.
- Keep components declarative and minimal; avoid direct DOM manipulation.
- Use [Snippets](https://svelte.dev/docs/svelte/snippet/llms.txt) to create reusable chunks of markup inside component templates.
- When possible, lift state upward or use context instead of prop drilling.
- Animate transitions and list updates using Svelte’s `animate:` directive or `motion` from `svelte-motion`.
- Keep markup accessible — use semantic elements, proper `aria-*` attributes, and keyboard support.
- Handle Promises in `+page.svelte` with `{#await ...}` blocks so pending, success, and error UI states stay declarative. Reference: [Await Blocks](https://svelte.dev/docs/svelte/await/llms.txt).

### Svelte Testing

- Refer to [Svelte Testing documentation](https://svelte.dev/docs/svelte/testing/llms.txt)

### Reactive $: statements

Legacy Svelte components relied on `Reactive $:` statements (e.g. `$: sum = a + b`) to recompute values or run side-effects when referenced state changed. Runes mode replaces those patterns with `$derived` for computed data and `$effect` for imperative reactions, which keeps dependencies explicit and tree-shakable. Do not author new `$:` statements—only interact with existing legacy code to remove or migrate it. For reference, see [Legacy Reactive Assignments](https://svelte.dev/docs/svelte/legacy-reactive-assignments/llms.txt).

This is a serverless app: server functions should use [**remote functions**](https://svelte.dev/docs/kit/remote-functions/llms.txt) compatible with Cloudflare Workers and Netlify

---

## TypeScript Conventions

- Enable strict mode in `tsconfig.json`.
- Infer types from Zod schemas using `z.infer<typeof Schema>` whenever applicable.
- Avoid `any`; if a type is uncertain, narrow it through validation or explicit typing.
- Always provide explicit return types for exported functions and stores.
- Use descriptive names for stores, variables, and functions.
- Respect indents. Keep nested items aligned. Do not reset tabs for nested content.
- When working with Svelte runes, prefer clear naming for derived and reactive state:
```ts
  const count = $state(0);
  const doubled = $derived(count * 2);
```

---

## Dexie + LiveQueryStores Guidelines

- Define a single `db.ts` module in `src/lib/db/` exporting the Dexie instance and table definitions.
- Tables should use interfaces derived from Zod schemas for type safety.
- Query data using `liveQuery()` and expose the results as readable Svelte stores.
- Store naming convention: `<entity>Store`, e.g. `recipesStore`, `suggestionsStore`.
- Treat store values as immutable snapshots — all modifications go through Dexie operations.
- Use derived stores for filtered or sorted data views.
- Wrap multi-table operations in `db.transaction()` to maintain atomic updates.
- Keep local state in sync with DB updates using reactive subscriptions.

Example:
```ts
import { liveQuery } from "dexie";
import { db } from "$lib/db";

export const recipesStore = liveQuery(() => db.recipes.toArray());
```

---

## TanStack Query `createQuery()`

- Use `createQuery` from `@tanstack/svelte-query` whenever remote data should stay in sync with UI state. Call it with an options object or store containing at least a stable `queryKey` and `queryFn`, and optionally `select`, `enabled`, `staleTime`, `gcTime`, `placeholderData`, `initialData`, or suspense helpers. A custom `queryClient` can be passed as the second argument when shared caching is required.
- The helper returns a store that fulfills the TanStack `CreateQueryResult<TData, TError>` contract (or `DefinedCreateQueryResult` when `initialData`/`placeholderData` guarantee data). Expect shape-aligned fields such as `data`, `error`, `status`, `fetchStatus`, `isPending`, `isSuccess`, `refetch`, and `failureCount`, which you can read reactively inside components.
- Typical usage keeps the query result outside template logic and derives consumable state with runes:
  ```
  import { createQuery } from '@tanstack/svelte-query';

  const recipesQuery = createQuery({
    queryKey: ['recipes', filters],
    queryFn: fetchRecipes,
    placeholderData: []
  });

  const recipes = $derived(recipesQuery.data ?? []);
  const refreshRecipes = recipesQuery.refetch;
  ```
- Prefer Dexie for durable offline reads and write-behind sync; wrap `queryFn` implementations so they validate responses with Zod and fall back to local cached values when offline. Keep TanStack queries side-effect free—mutations belong in dedicated request helpers or remote functions.  
Reference: [TanStack Query createQuery](https://tanstack.com/query/v5/docs/framework/svelte/reference/functions/createquery)

---

## Supabase Auth, Sharing and Cloud Backup

- Uses the `supabaseClient` in `src/lib/supabaseClient.ts` for authentication at login
- Uses `locals.supabase` in `src/hooks.server.ts` for route guards

## Zod Validation Rules

- Define all schemas in src/lib/schemas/ — one file per domain entity.
- Always call .strict() on schemas to reject unexpected keys.
- Use .safeParse() for user or AI-generated data and handle validation errors gracefully.
- Derive all TypeScript interfaces from Zod schemas:
```ts
export const RecipeSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
}).strict();

export type Recipe = z.infer<typeof RecipeSchema>;
```
- Validate responses from any external APIs (e.g., OpenAI, Supabase) before use.

- For transformations, prefer Zod .transform() instead of ad hoc mutation logic.
- Create composite schemas for structured entities such as:
  - Suggestion
  - FullRecipe
  - SavedRecipe
- Each schema should clearly define what’s persisted locally versus what’s transient or generated.

---

## General Code Style

- Use 2-space indentation.
- Prefer arrow functions and const declarations.
- Keep imports ordered: external → internal → local.
- Write small, composable functions.
- Use clear, readable variable names (no abbreviations).
- Always comment complex logic with short, meaningful JSDoc-style notes.
- Follow Prettier and ESLint rules configured for Svelte + TypeScript.
- Keep code focused on clarity, not cleverness.

---

## Accessibility and UX

- Always use semantic HTML tags and accessible form controls.
- Provide aria-label or descriptive text for all interactive elements.
- Ensure animations are subtle and never block user interaction.
- For asynchronous data (e.g., AI requests, Dexie updates), display appropriate loading or error states.
- Favor simplicity, readability, and maintainability over micro-optimizations.

---

## Architecture highlights (what matters to agents)

- Client-first SvelteKit app. Local data lives in IndexedDB via Dexie: `src/lib/db/local.ts` (primary) and
	the deprecated `src/lib/db.ts` (avoid editing unless migrating schema).
- Reactive stores use small helpers (see `src/lib/stores/_utils.ts` -> `createLiveQueryStore`) and
	derived/readable stores in `src/lib/stores/*.ts` (examples: `recipes.ts`, `suggestions.ts`).
- Cloud sync uses Supabase for authorized users via `src/lib/supabaseClient.ts` (PUBLIC_SUPABASE_* envs).
- OpenAI integration: server-side wrappers live under `src/lib/server/openai.ts` and leverage the OpenAI
	Chat Completions API for idea summaries, full recipes, revisions, addendums, and Q&A. Higher-level prompt
	logic lives in `src/lib/openai/*.ts` (see `recipe.ts`, `schema.ts`). Keep secret keys in server-only
	envs (`$env/static/private`). Example: private key imported as `VITE_OPENAI_API_KEY` in this repo.
- API routes live under `src/routes/api/*`. Any code that touches secrets (OpenAI, private DB keys)
	should run in server modules or route handlers, not in client components.
  
---

## Env & secrets

- Public keys: use `PUBLIC_*` env vars for values safe to expose (supabase URL/anon key found in
	`src/lib/supabaseClient.ts`).
- Private keys: use `$env/static/private` imports inside server code. This project uses
	`VITE_OPENAI_API_KEY` (imported in `src/lib/openai/index.ts`) — do NOT expose it to client bundles.

---

## Documentation References

- [svelte](https://svelte.dev/docs/svelte/llms-small.txt)
- [sveltekit](https://svelte.dev/docs/kit/llms-small.txt)
- [bits-ui](https://bits-ui.com/docs/llms.txt)
- [tailwindcss](https://github.com/tailwindlabs/tailwindcss)
- [dexie](https://dexie.org/docs/Tutorial/Svelte)
- [liveQuery](https://dexie.org/docs/liveQuery())
- [supabase](https://supabase.com/docs/reference/javascript)
- [tanstack query](https://tanstack.com/query/latest/docs/framework/svelte/overview)