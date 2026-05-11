You are an expert in TypeScript, Svelte 5.x, and SvelteKit 2.x. Be pragmatic and follow the
repository's conventions (strict typing, runes for local state, Dexie for client-side storage,
server API routes for secret ops).

Quick commands
- Start dev server: `pnpm run dev`
- Build: `pnpm run build`
- Preview build: `pnpm run preview`
- Typecheck & svelte-check: `pnpm run check`
- Lint: `pnpm run lint`  (Prettier + ESLint)
- Format: `pnpm run format`
- Tests: `pnpm run test` (Vitest)

Architecture highlights (what matters to agents)
- Client-first SvelteKit app. Local data lives in IndexedDB via Dexie: `src/lib/db.ts`
- Reactive stores use small helpers (see `src/lib/stores/_utils.ts` -> `createLiveQueryStore`) and
	derived/readable stores in `src/lib/stores/*.ts` (examples: `recipes.ts`, `suggestions.ts`).
- Cloud sync uses Supabase for authorized users via `src/lib/supabaseClient.ts` (PUBLIC_SUPABASE_* envs).
- OpenAI integration: server-side wrappers live under `src/lib/server/openai.ts` and higher-level
	prompt logic in `src/lib/openai/*.ts` (see `recipe.ts`, `schema.ts`). Keep secret keys in server-only
	envs (`$env/static/private`). Example: private key imported as `OPENAI_API_KEY` in this repo.
- API routes live under `src/routes/api/*`. Any code that touches secrets (OpenAI, private DB keys)
	should run in server modules or route handlers, not in client components.

Patterns & conventions (concrete, discoverable)
- Use the Dexie `db` instance from `src/lib/local/db.ts`. Example usage: `await db.recipes.toArray()` or
	helper `getSavedRecipe(id)` in `src/lib/stores/recipes.ts`.
- Prefer `createLiveQueryStore(queryFn)` (in `src/lib/stores/_utils.ts`) to expose reactive DB-backed
	Svelte stores instead of manual subscriptions.
- State management uses runes-style stores (Svelte 5 conventions). Favor small focused stores in
	`src/lib/stores/` rather than global monoliths.
- Validation/parsing for LLM outputs uses Zod and the OpenAI response helpers (`src/lib/openai/schema.ts`).
	When adding prompts, prefer `openai.responses.parse` + schema over free-text parsing.

Env & secrets
- Public keys: use `PUBLIC_*` env vars for values safe to expose (supabase URL/anon key found in
	`src/lib/supabaseClient.ts`).
- Private keys: use `$env/static/private` imports inside server code. This project uses
	`OPENAI_API_KEY` (imported in `src/lib/openai/index.ts`) — do NOT expose it to client bundles.

Tests & CI hints
- Unit tests use Vitest. Tests live next to routes/components (see `src/routes/*/*.test.ts` and
	`demo.spec.ts`). Use `npm run test` for local runs. Playwright is available in devDependencies
	for future E2E tests.

Files you will consult/modify most often
- Local DB schema: `src/lib/db.ts`
- Stores & helpers: `src/lib/stores/_utils.ts`, `src/lib/stores/*.ts`
- OpenAI logic & schema: `src/lib/openai/*.ts`, `src/lib/server/openai.ts`
- Supabase client: `src/lib/supabaseClient.ts`
- Routes and API: `src/routes/api/**`, `src/routes/recipes/[...id]/+page.svelte`

Quick examples for common edits
- Add a reactive DB-backed store:
	- Put query logic in `createLiveQueryStore(async () => db.recipes.toArray())`
	- Return filtered/sorted results in the store's factory function (see `recipes.ts`).
- Add a server-only OpenAI call:
	- Put secrets in env and use `$env/static/private` in a server module (see
		`src/lib/server/openai.ts`). Keep prompt composition and parsing near `src/lib/openai/`.

Small gotchas
- Prompts in `src/lib/openai/*` expect strict JSON output and often use Zod schemas. Follow
	the schema formats strictly (examples in `recipe.ts` and `schema.ts`).
- The repo uses `svelte-kit sync` in the `prepare`/`check` scripts—ensure you run `pnpm run check`
	before large refactors to surface type/svelte issues.

If anything here is unclear or you want me to add examples for a specific area (stores, OpenAI
prompts, DB migrations, or tests), tell me which and I'll expand the file.