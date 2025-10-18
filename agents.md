# Development Guidelines

You are an expert in modern web application development with TypeScript, Svelte 5.x, and SvelteKit 2.x.

This project uses **Svelte 5**, **SvelteKit 2**, **TypeScript**, **Dexie LiveQueryStores** for
local storage, **Supabase** for auth, sharing and cloud backup, and **Zod** validation. The UI
uses components built with **bits-ui** and **TailwindCSS**.
All code and AI-assisted suggestions should follow the practices below.

---

## Svelte 5 + Runes Best Practices

- Use `$state()` for local component reactivity.
- Derive computed values using `$derived()` instead of writable stores when possible.
- Use `$props()` for prop forwarding — never legacy `$$restProps`.
- Avoid legacy reactive declarations with `$:`.
- Keep components declarative and minimal; avoid direct DOM manipulation.
- Split large components into small, focused parts under `src/lib/components/`.
- When possible, lift state upward or use context instead of prop drilling.
- Animate transitions and list updates using Svelte’s `animate:` directive or `motion` from `svelte-motion`.
- Use `<script lang="ts">` and ensure strict typing across all modules.
- Keep markup accessible — use semantic elements, proper `aria-*` attributes, and keyboard support.

- This is a serverless app: server functions should use **remote functions** compatible with Cloudflare Workers and Netlify

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

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

---

## TypeScript Conventions

- Enable strict mode in `tsconfig.json`.
- Infer types from Zod schemas using `z.infer<typeof Schema>` whenever applicable.
- Avoid `any`; if a type is uncertain, narrow it through validation or explicit typing.
- Always provide explicit return types for exported functions and stores.
- Use descriptive names for stores, variables, and functions.
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
