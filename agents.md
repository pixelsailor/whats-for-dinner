# Development Guidelines

You are an expert in modern web application development with TypeScript, Svelte 5.x, and SvelteKit 2.x.

The title of this project is "What's For Dinner." is uses **Svelte 5**, **SvelteKit 2**, 
**TypeScript**, **Dexie LiveQueryStores** for local storage, **Supabase** for auth, sharing and 
cloud backup, and **Zod** validation. The UI uses components built with **bits-ui** and **TailwindCSS**.

**What's For Dinner** must be able to operate completely offline. Supabase auth, cloud backup, and 
OpenAI should be an optional enhancement when specifically supported. Prefer the **Responses API** with **Zod-structured output** (`src/lib/api/ai/` per [ADR-007](adrs/ADR-007-ai-provider-contract.md)). The legacy **Chat Completions** surface in `src/lib/server/openai.ts` is **deprecated** and scheduled for migration; do not extend it for new features.

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
- `$effect` is a valid Svelte rune; do not treat it as something to avoid categorically. Like ordinary functions, reactive code should minimize side effects: **prefer `$derived`** when a value is a pure function of other state, and **use `$effect`** when imperative work is required to maintain desired behavior (true side effects, external sync, or subscriptions). If `$effect` can be replaced by `$derived` without hurting performance or readability, prefer `$derived`; if `$effect` is clearer or more efficient, use it.
- DO NOT use legacy reactive declarations with `$:`.
- Keep components declarative and minimal; avoid direct DOM manipulation.
- Use [Snippets](https://svelte.dev/docs/svelte/snippet/llms.txt) to create reusable chunks of markup inside component templates.
- When possible, lift state upward or use context instead of prop drilling.
- Animate transitions and list updates using Svelte’s `animate:` directive or `motion` from `svelte-motion`.
- Keep markup accessible — use semantic elements, proper `aria-*` attributes, and keyboard support.
- Handle Promises in `+page.svelte` with `{#await ...}` blocks so pending, success, and error UI states stay declarative. Reference: [Await Blocks](https://svelte.dev/docs/svelte/await/llms.txt).
- Subscribe to Dexie stores by using `$derived()` with dollar-sign prefixed state variables, e.g.:

```
let queryStore = $derived(createQuery({ prompt }));
let queryStoreResults = $derived($queryStore);
let queryData = $derived(queryStoreResults?.data);
```

### Svelte Testing

- Refer to [Svelte Testing documentation](https://svelte.dev/docs/svelte/testing/llms.txt)

### Reactive $: statements

Legacy Svelte components relied on `Reactive $:` statements (e.g. `$: sum = a + b`) to recompute values or run side-effects when referenced state changed. Runes mode replaces those patterns with `$derived` for computed data and `$effect` for imperative reactions, which keeps dependencies explicit and tree-shakable. Do not author new `$:` statements—only interact with existing legacy code to remove or migrate it. For reference, see [Legacy Reactive Assignments](https://svelte.dev/docs/svelte/legacy-reactive-assignments/llms.txt).

This is a serverless app: keep handlers compatible with constrained runtimes per [ADR-006](adrs/ADR-006-serverless-and-secret-boundary.md) (Netlify is the configured adapter today; use [**remote functions**](https://svelte.dev/docs/kit/remote-functions/llms.txt) only when they fit those constraints)

---

## TypeScript Conventions

Canonical home: [`.cursor/rules/lint-and-code-quality.mdc`](.cursor/rules/lint-and-code-quality.mdc) (TypeScript and Formatting sections) and [`.cursor/rules/schema-and-type-safety.mdc`](.cursor/rules/schema-and-type-safety.mdc) for Zod-led types. The bullets below remain a summary until `agents.md` is retired.

- Enable strict mode in `tsconfig.json`.
- Infer types from Zod schemas using `z.infer<typeof Schema>` whenever applicable.
- Avoid `any`; if a type is uncertain, narrow it through validation or explicit typing.
- Always provide explicit return types for exported functions and stores.
- Use descriptive names for stores, variables, and functions.
- Respect the indentation that **Prettier** is configured for in [`.prettierrc`](.prettierrc) (do not restate values here). Keep nested items aligned; do not mix indentation characters within a file or override the formatter in new code.
- When working with Svelte runes, prefer clear naming for derived and reactive state:
```ts
  const count = $state(0);
  const doubled = $derived(count * 2);
```

---

## Dexie + LiveQueryStores Guidelines

Canonical home: [`.cursor/rules/local-data-dexie-ownership.mdc`](.cursor/rules/local-data-dexie-ownership.mdc) (globs `src/lib/db.ts`, `src/lib/db/**/*.ts`, `src/lib/stores/**/*.ts`). Binding ADR: [ADR-002](adrs/ADR-002-local-data-ownership.md). The bullets below remain a short summary until `agents.md` is retired.

- Single Dexie application database in `src/lib/db.ts`; `src/lib/db/` holds helpers that use `db`, not alternate Dexie roots.
- `liveQuery` / `createLiveQueryStore` expose readable stores; treat snapshots as read-only in UI, route mutations through store or domain helpers, and use `db.transaction('rw', …)` for multi-table writes.

---

## TanStack Query `createQuery()`

Canonical home: [`docs/tanstack-query.md`](docs/tanstack-query.md) (offline-first + Zod + `queryFn` expectations, runes pattern). API layer pointer: [`src/lib/api/README.md`](src/lib/api/README.md) (*Data fetching*). Dexie vs cache boundary: [`.cursor/rules/local-data-dexie-ownership.mdc`](.cursor/rules/local-data-dexie-ownership.mdc) (*Remote and cache layers*). The bullets below remain a short summary until `agents.md` is retired.

- Use `createQuery` from `@tanstack/svelte-query` for remote data; stable `queryKey` + `queryFn`; optional `queryClient` as second argument.
- Subscribe with `$derived($queryStore)` and read `data` / `refetch` from the result object.
- Prefer Dexie for durable offline reads; validate HTTP with Zod in the fetch path; keep `queryFn` side-effect free—mutations in dedicated helpers.

---

## Supabase Auth, Sharing and Cloud Backup

- Uses the `supabaseClient` in `src/lib/supabaseClient.ts` for authentication at login
- Uses `locals.supabase` in `src/hooks.server.ts` for route guards

## Zod Validation Rules

Canonical home: [`.cursor/rules/schema-and-type-safety.mdc`](.cursor/rules/schema-and-type-safety.mdc) (placement under `src/lib/api/**`, `.strict()`, `.safeParse()`, `z.infer`, `.transform()`, composites, persisted vs transient). Binding ADR: [ADR-008](adrs/ADR-008-schema-led-domain-contracts.md). The bullets below remain a short summary until `agents.md` is retired.

- Domain modules: `*.schemas.ts`, `*.types.ts`, `*.model.ts`, `*.service.ts`, barrel `index.ts` per [`src/lib/api/README.md`](src/lib/api/README.md).
- Reject unknown keys on object schemas (`.strict()`); validate boundaries with `.safeParse()`; derive entity types with `z.infer<typeof …>`.

---

## General Code Style

Canonical home: [`.cursor/rules/lint-and-code-quality.mdc`](.cursor/rules/lint-and-code-quality.mdc) (Formatting and general style); JSDoc expectations live in [`.cursor/rules/documentation-conventions.mdc`](.cursor/rules/documentation-conventions.mdc). The bullets below remain a summary until `agents.md` is retired.

- Use the indentation Prettier is configured for in [`.prettierrc`](.prettierrc) (do not restate the value here). Run `pnpm run format` rather than hand-formatting; do not mix indentation characters or override the formatter in new code.
- Prefer arrow functions and const declarations.
- Keep imports ordered: external → internal → local.
- Write small, composable functions.
- Use clear, readable variable names (no abbreviations).
- Always comment complex logic with short, meaningful JSDoc-style notes.
- Follow Prettier and ESLint rules configured for Svelte + TypeScript.
- Keep code focused on clarity, not cleverness.

---

## Accessibility and UX

Canonical homes: [ADR-014: Semantic HTML and accessibility](adrs/ADR-014-semantic-html-and-accessibility.md) (Accepted) and [`.cursor/rules/svelte-5-ui-conventions.mdc`](.cursor/rules/svelte-5-ui-conventions.mdc) (a11y section). Cross-cutting hooks (loading/error states for any async work, simplicity over micro-optimization) also appear in [`.cursor/rules/lint-and-code-quality.mdc`](.cursor/rules/lint-and-code-quality.mdc). The bullets below remain a summary until `agents.md` is retired.

- Always use semantic HTML tags and accessible form controls.
- Provide aria-label or descriptive text for all interactive elements.
- Ensure animations are subtle and never block user interaction.
- For asynchronous data (e.g., AI requests, Dexie updates), display appropriate loading or error states.
- Favor simplicity, readability, and maintainability over micro-optimizations.

---

## Architecture highlights (what matters to agents)

- Client-first SvelteKit app. Local data lives in IndexedDB via Dexie: `src/lib/db.ts`
- Reactive stores use small helpers (see `src/lib/stores/_utils.ts` -> `createLiveQueryStore`) and
	derived/readable stores in `src/lib/stores/*.ts` (examples: `recipes.ts`, `suggestions.ts`).
- Cloud sync uses Supabase for authorized users via `src/lib/supabaseClient.ts` (PUBLIC_SUPABASE_* envs).
- OpenAI integration (dual path, [ADR-007](adrs/ADR-007-ai-provider-contract.md)): **preferred** — `src/lib/api/ai/ai.model.ts` uses the **Responses API** with Zod (`zodTextFormat`) for suggestion flows and related structured outputs; consumed from `src/routes/api/suggestions/*`. **Deprecated legacy** — `src/lib/server/openai.ts` still uses **Chat Completions** for some recipe actions and Q&A until migrated; treat edits there as migration debt, not patterns to copy. Prompt strings live in `src/lib/openai/*.ts` (see `recipe.ts`, `schema.ts`). Keep secret keys in server-only envs (`$env/static/private`). This repo imports the private key as `OPENAI_API_KEY`.
- API routes live under `src/routes/api/*`. Any code that touches secrets (OpenAI, private DB keys)
	should run in server modules or route handlers, not in client components.
  
---

## Env & secrets

- Public keys: use `PUBLIC_*` env vars for values safe to expose (supabase URL/anon key found in
	`src/lib/supabaseClient.ts`).
- Private keys: use `$env/static/private` imports inside server code. This project uses
	`OPENAI_API_KEY` (imported in `src/lib/openai/index.ts`) — do NOT expose it to client bundles.

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