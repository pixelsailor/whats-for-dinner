# What's For Dinner

What's For Dinner (WFD) is an offline-first recipe book with a recommendations engine and optional AI assistance for recipe suggestions, recipe drafting, recipe changes, and cooking questions.

The project should remain useful without an account, without cloud services, and without AI. Supabase and OpenAI extend the experience, but the local recipe book is the product's center of gravity.

## Product Principles

- **Offline-first**: WFD must be capable of running entirely offline once cached in the browser. The application should stay lightweight enough for practical browser caching and fast repeat loads.
- **Anonymous-first**: A user should be able to use the core recipe book without creating an account or signing in.
- **Local-first saved recipes**: Saved recipes belong in the user's browser by default, stored locally with Dexie and IndexedDB.
- **Transient AI suggestions**: Viewed AI-generated suggestions may be cached locally so they can be reopened without another AI request, but suggestions are not saved to cloud storage and should be eligible for eventual deletion.
- **Cloud as an enhancement**: Registered Supabase accounts support backup, sharing, and sync across devices. A registered user must still be able to keep using WFD while logged out or offline.
- **AI as an enhancement**: AI helps generate suggestions, expand suggestions into recipes, revise recipes, and answer recipe questions. The app must continue to have meaningful offline behavior when AI is unavailable.
- **Self-hosting as a future path**: WFD should be able to evolve toward user-controlled services, including personal AI API endpoints and user-hosted databases that can bypass WFD-managed account restrictions.
- **Preferences shape recommendations**: User preferences, dietary needs, and cooking constraints should influence recommendations and be applied to every AI recipe prompt.
- **Serverless and secret-safe**: WFD is intended for serverless deployment on Cloudflare Workers or Pages. Server-side code and secrets must stay out of `.svelte` files and other client-side modules.

## Core Capabilities

WFD is organized around a recipe book, a recommendations experience, and optional assisted workflows.

- **Recipe book**: Save, edit, search, organize, soft-delete, and restore local recipes.
- **Recommendations**: Recommend recipes from the user's saved collection and usage history.
- **AI suggestions**: Generate recipe ideas from user prompts and preferences, cache viewed suggestions locally, and allow selected suggestions to become saved recipes.
- **Recipe assistance**: Use AI to refine recipes, answer cooking questions, and help adapt a recipe to the user's needs.
- **Account-backed cloud features**: For registered users, use Supabase for cloud backup, sharing, and synchronization.
- **User-controlled services**: Future self-hosting should allow users to configure their own AI API and database provider without requiring WFD-managed accounts.

## Technology Stack

- **Application**: Svelte 5, SvelteKit 2, TypeScript, Vite
- **UI**: bits-ui, TailwindCSS 4, Flowbite Svelte, Carbon Icons
- **Local data**: Dexie, IndexedDB, Dexie live queries, Svelte stores
- **Remote state and validation**: TanStack Query, Zod
- **Cloud services**: Supabase for auth, backup, sharing, and sync
- **AI services**: OpenAI SDK using Chat Completions for server-side AI workflows
- **Testing and quality**: Vitest, Playwright, ESLint, Prettier, `svelte-check`

## Architecture Boundaries

The client is responsible for the local-first product experience. Recipes, preferences, cached suggestions, and recommendation inputs should be readable from browser-local storage whenever possible.

Server-side code exists to protect secrets, validate remote requests, call external services, and support account-backed enhancements. OpenAI and privileged Supabase operations must run through server-only modules, SvelteKit server routes, remote functions, or hooks. Client modules and Svelte components must not import private environment variables or call secret-bearing services directly.

Provider-specific integrations should stay behind explicit service boundaries. Current development may use OpenAI and Supabase, but the architecture should avoid assuming they are the only possible AI or cloud data providers.

The data model should stay schema-led. Zod schemas define persisted and external shapes, TypeScript types are derived from those schemas, and external or generated data is validated before use.

## Data Ownership

Saved recipes are durable local user data. They may be backed up or synchronized through Supabase for registered users, but local IndexedDB remains the default home for anonymous and offline usage.

AI-generated suggestions are cached local artifacts. They exist to avoid duplicate AI requests and to make recently viewed suggestions available offline. They are not cloud records, and they should not be treated as saved recipes unless the user explicitly saves them.

Cloud data is optional account data. It should support backup, sharing, and multi-device continuity without making authentication a requirement for ordinary recipe book use.

## Roadmap Direction

Near-term and future work should preserve the offline-first, anonymous-first foundation while allowing richer assisted workflows.

- **Calendar**: Show when recipes were made using `checkout_history`, including multiple recipes per day.
- **Recipe import**: Use AI to extract recipe content from URLs.
- **OCR import**: Support photos and scans as sources for recipe capture.
- **Meal planner**: Add planning workflows for future meals, selected recipes, and integrated shopping lists.
- **Self-hosting**: Support user-configured personal AI APIs and user-hosted database providers so advanced users can run WFD without WFD-managed AI or Supabase accounts.

## Project Structure

```text
src/
  lib/
    api/        Zod schemas, domain types, models, and service helpers
    stores/     Reactive Dexie-backed stores and related store utilities
    ui/         Reusable Svelte UI components
    db.ts       Local Dexie database
  routes/
    api/        Server routes for remote and secret-bearing operations
    ...         SvelteKit pages
  hooks.server.ts
  service-worker.js
docs/
  ...           Topic-specific architecture and flow documents
```

Detailed guidance should live near the code it governs. Use the top-level README for durable project intent, and add focused README or architecture notes inside the relevant directory when a topic needs deeper discussion.

## Documentation Map

- [`AGENTS.md`](./AGENTS.md): Agent-facing development rules and coding expectations.
- [`docs/adrs/`](./docs/adrs/): Architecture decision records (template and future ADRs).
- [`src/lib/api/README.md`](./src/lib/api/README.md): API service layer organization.
- [`src/lib/ui/README.md`](./src/lib/ui/README.md): UI component library guidance.
- [`src/lib/stores/README.md`](./src/lib/stores/README.md): Store patterns and local data flow.
- [`docs/suggestions-architecture.md`](./docs/suggestions-architecture.md): Suggestions system architecture.
- [`docs/suggestions-flow.md`](./docs/suggestions-flow.md): Suggestions user flow.
- [`docs/adr-and-rules-todo.md`](./docs/adr-and-rules-todo.md): ADR, Cursor rule, and workflow governance backlog.

## Development

Install dependencies with pnpm:

```bash
pnpm install
```

Run the development server:

```bash
pnpm run dev
```

Useful project scripts:

```bash
pnpm run check
pnpm run lint
pnpm run test
pnpm run build
```

## Environment Variables

Create a local environment file with values for the optional services you are using:

```bash
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

`PUBLIC_*` values are safe for client exposure. OpenAI keys and other secrets must be imported only from server-side code using SvelteKit private environment APIs.

## Development Workflow

Project decisions should be captured as ADRs when they define durable architecture, data ownership, security boundaries, or workflow constraints. Cursor rules and agent workflows should enforce accepted ADRs rather than encoding one-off preferences.

Before adding detailed guidance to this README, prefer one of these homes:

- an ADR for durable architectural decisions;
- a directory-local README for implementation patterns owned by that area;
- a Cursor rule for agent-enforced development behavior;
- a docs file for a specific flow, feature, or design discussion.
