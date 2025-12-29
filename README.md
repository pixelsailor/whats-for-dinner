# What's For Dinner 🍽️

> An AI-powered meal planning assistant that answers the never-ending question: "What's for dinner?"

A modern, offline-first web application built with Svelte 5 and SvelteKit 2, featuring AI-powered recipe suggestions, personalized meal planning, and seamless cloud synchronization.

## ✨ Features

### Core Features
- **AI-Powered Suggestions**: Get personalized recipe recommendations using the OpenAI Chat Completions API
- **Recipe Management**: Save, organize, and manage your favorite recipes
- **Personalized Recommendations**: Learn from your preferences and dietary restrictions
- **Smart Search**: Find recipes by ingredients, cuisine, or dietary needs

### Technical Features
- **Offline-First**: Works without internet using IndexedDB for local storage
- **Cloud Sync**: Seamless synchronization with Supabase for authenticated users
- **Progressive Web App**: Installable with offline capabilities
- **Real-time Updates**: Reactive UI with Svelte 5 runes and Dexie live queries

### User Experience
- **Responsive Design**: Optimized for desktop and mobile devices
- **Accessible UI**: Built with semantic HTML and ARIA attributes
- **Fast Performance**: Client-side rendering with serverless backend
- **Type Safety**: Full TypeScript support with Zod validation

## 🧭 User Experience & Interaction Guidelines

This section defines the expected behavior for common user interactions so that the experience remains consistent across the app. It focuses on what the user sees and can do (toasts, redirects, undo flows), not on specific implementation details.

### Deleting Recipes

- **Immediate soft-delete**: Clicking the delete button on a recipe immediately deletes the recipe from the user's perspective.
- **Soft-delete implementation**: The recipe MUST NOT be physically removed from the database. Instead, it is marked as deleted by setting the `deleted_at` field to the current timestamp.
- **Undo via toast**: After a recipe is deleted, a toast message is shown with an option to undo/restore the recipe. Choosing undo removes the `deleted_at` timestamp so the recipe is treated as active again.
- **Post-delete navigation**: After the delete action is triggered, the user is redirected to the `/recipes` page.

## 🛠️ Technology Stack

### Framework & Language
- **Svelte 5** - Modern reactive framework with runes syntax
- **SvelteKit 2** - Full-stack web framework with file-based routing
- **TypeScript** - Strict type checking and enhanced developer experience

### UI & Styling
- **bits-ui** - Headless UI components for accessibility
- **TailwindCSS 4** - Utility-first CSS framework
- **Flowbite Svelte** - Pre-built component library
- **Carbon Icons** - Comprehensive icon set

### State Management & Data
- **Dexie** - IndexedDB wrapper with reactive queries
- **TanStack Query** - Server state management and caching
- **Svelte Stores** - Local component state management

### Backend & Services
- **Supabase** - Authentication, database, and real-time subscriptions
- **OpenAI Chat Completions API** - DEPRECATED. AI-powered recipe summaries, full recipes, revisions, and Q&A
- **OpenAI Responses API** - AI-powered recipe summaries, full recipes, revisions, and Q&A using **Structured Outputs**
- **Zod** - Runtime type validation and schema definition

### Development & Testing
- **Vite 7** - Fast build tool and development server
- **Vitest** - Unit and integration testing
- **Playwright** - End-to-end browser testing
- **ESLint & Prettier** - Code quality and formatting

## 🏗️ Serverless Architecture

This application is designed for serverless deployment with the following constraints:

### Remote Functions
- Uses SvelteKit's experimental **remote functions** feature
- Compatible with **Vercel Edge Runtime** and **Netlify Edge Functions**
- Server code must be compatible with edge runtime (no Node.js-specific APIs)

### Current Configuration
- **Adapter**: `@sveltejs/adapter-vercel` (configurable)
- **Runtime**: Edge-compatible functions only
- **Alternative Adapters**: `@sveltejs/adapter-netlify`, `@sveltejs/adapter-auto`

### Security Considerations
- OpenAI Chat Completions API keys handled server-side only
- Environment variables properly scoped (PUBLIC_* vs private)
- Authentication via Supabase SSR pattern

## 🚀 Prerequisites & Installation

### Requirements
- **Node.js** 18+ (LTS recommended)
- **pnpm** (preferred), npm, or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd whats-for-dinner

# Install dependencies
pnpm install
```

## 🔧 Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Configuration (safe to expose)
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API Key (server-only, NEVER expose to client)
VITE_OPENAI_API_KEY=your_openai_api_key
```

### Environment Setup
- **OpenAI Usage**: `VITE_OPENAI_API_KEY` powers all Chat Completions requests inside `src/lib/server/openai.ts`.
- **Public Variables**: Safe to expose in client bundles (Supabase URL/key)
- **Private Variables**: Server-only, imported via `$env/static/private`
- **Security**: Never commit API keys to version control

## 💻 Development

### Development Server
```bash
# Start development server
pnpm run dev

# Start with browser auto-open
pnpm run dev -- --open
```

### Code Quality
```bash
# Type checking
pnpm check
pnpm check:watch

# Linting and formatting
pnpm lint
pnpm format
```

### Testing
```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit
```

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Svelte 5      │  │   Flowbite      │  │  TailwindCSS │ │
│  │   Components    │  │   Components    │  │  Styling     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    State Management Layer                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Dexie         │  │  TanStack       │  │  Svelte      │ │
│  │   (IndexedDB)   │  │  Query          │  │  Stores      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       API Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   SvelteKit     │  │   Remote        │  │  Server      │ │
│  │   Routes        │  │   Functions     │  │  Hooks       │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
│  ┌─────────────────┐  ┌───────────────────────────────────┐ │
│  │   OpenAI Chat   │  │   Supabase                        │ │
│  │   Completions   │  │   (Auth/Cloud Storage/Sharing)    │ │
│  │   (AI/ML)       │  │                                   │ │
│  └─────────────────┘  └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **Offline-First**: Primary data stored in IndexedDB via Dexie
- **Reactive Stores**: `liveQuery()` from Dexie wrapped in Svelte stores
- **Type Safety**: Zod schemas define all data structures, TypeScript interfaces derived
- **Authentication**: Supabase SSR pattern with `hooks.server.ts`
- **AI Integration**: Server-side OpenAI Chat Completions calls via API routes
- **Chat Completions Workflow**: `src/lib/server/openai.ts` orchestrates Chat Completions requests for idea summaries, full recipes, revisions, addendums, and Q&A so clients never touch the API directly.

### Data Flow
1. **User Input** → Svelte 5 components (runes-based reactivity)
2. **Local Storage** → Dexie IndexedDB with reactive queries
3. **API Calls** → SvelteKit remote functions (serverless)
4. **External Services** → OpenAI Chat Completions (AI), Supabase (auth/sync)
5. **Cloud Sync** → Optional synchronization for authenticated users

## Routing API Requests

SvelteKit provides two primary patterns for handling server-side requests: **`+server.ts`** (API endpoints) and **`+page.server.ts`** (page-specific server logic). Understanding when to use each is crucial for maintaining a clean, secure, and maintainable codebase.

### `+server.ts` - Standalone API Endpoints

**Location**: `src/routes/api/*/+server.ts`

**Purpose**: Create reusable REST API endpoints that can be called from anywhere (client components, external services, or other pages).

**Characteristics**:
- Exports HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`, etc.)
- Accepts JSON, FormData, or any HTTP body format
- Returns JSON, text, or any HTTP response
- Can be called via `fetch()` from client-side code
- Ideal for remote third-party API integrations (e.g., OpenAI)

**When to Use**:
- ✅ Creating reusable API endpoints consumed by multiple pages
- ✅ Building a public or internal REST API
- ✅ Handling requests from external services or clients
- ✅ Integrating with remote APIs (OpenAI, Supabase, etc.)
- ✅ When you need explicit HTTP methods and status codes
- ✅ When the endpoint serves a general purpose beyond a single page

**Example**: `/api/recipes/+server.ts`
```typescript
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getFullRecipe, OPENAI_DISABLED_ERROR } from '$lib/server/openai';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { session, permissions } = locals;
  
  if (!session) {
    throw error(401, { message: 'Authentication required' });
  }
  
  const { action, prompt, recipe } = await request.json();
  const response = await getFullRecipe(prompt, recipe);
  
  return json({ success: true, data: response });
};
```

**Client Usage**:
```typescript
const response = await fetch('/api/recipes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'detail', prompt, recipe })
});
```

### `+page.server.ts` - Page-Specific Server Logic

**Location**: `src/routes/[page]/+page.server.ts` (alongside the page component)

**Purpose**: Handle form submissions and load page-specific data for a particular route.

**Characteristics**:
- Exports `actions` (for form submissions) and/or `load` (for data loading)
- Works with SvelteKit's form handling (`$form` stores)
- Returns data that SvelteKit merges into page props
- Supports progressive enhancement (works without JavaScript)
- Tightly coupled to a specific page route

**When to Use**:
- ✅ Handling form submissions for a specific page
- ✅ Loading page-specific data that's only needed for that route
- ✅ When you want progressive enhancement (forms work without JS)
- ✅ When the logic is truly page-specific and won't be reused
- ✅ When you prefer SvelteKit's built-in form handling patterns

**Example**: `/recipes/[id]/+page.server.ts`
```typescript
import { type Actions, fail } from '@sveltejs/kit';
import { askCookingQuestion } from '$lib/server/openai';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const { session, permissions } = locals;
    
    if (!session) {
      return fail(401, { error: 'Authentication required' });
    }
    
    const data = await request.formData();
    const message = data.get('input') as string;
    const recipe = data.get('recipe') as string;
    
    const response = await askCookingQuestion(message, recipe);
    return { type: response[0], message: response[1] };
  }
};
```

**Form Usage**:
```svelte
<form method="POST" use:enhance={({ formData, cancel }) => {
  // Handle form submission
  return async ({ result, update }) => {
    if (result.type === 'success') {
      // Access result.data from the action
    }
    await update();
  };
}}>
  <input name="input" />
  <button type="submit">Submit</button>
</form>
```

### Decision Matrix

| Scenario | Use `+server.ts` | Use `+page.server.ts` |
|----------|------------------|----------------------|
| Reusable API endpoint | ✅ | ❌ |
| Form submission for one page | ❌ | ✅ |
| Remote third-party API calls | ✅ | ⚠️ (can work, but less ideal) |
| Progressive enhancement needed | ❌ | ✅ |
| Called from multiple pages | ✅ | ❌ |
| Called from client-side `fetch()` | ✅ | ❌ |
| Page-specific data loading | ❌ | ✅ |
| Building a REST API | ✅ | ❌ |

### Best Practices

#### For Remote API Integrations (e.g., OpenAI)

**Always use `+server.ts`** when calling remote REST APIs:

1. **Security**: API keys must stay server-side. `+server.ts` ensures secrets never reach the client.
2. **Reusability**: One endpoint can serve multiple pages and use cases.
3. **Flexibility**: Better control over request/response format, error handling, and retries.

```typescript
// ✅ Good: API endpoint in /api/recipes/+server.ts
export const POST: RequestHandler = async ({ request, locals }) => {
  // API key stays server-side
  const response = await fetch('https://api.openai.com/v1/...', {
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
  });
  return json({ data: await response.json() });
};

// ❌ Bad: Never call remote APIs directly from client
// This would expose your API key!
```

#### File Organization

- **API Endpoints**: Place all `+server.ts` files in `src/routes/api/*`
  - Example: `src/routes/api/recipes/+server.ts`
  - Example: `src/routes/api/share/[token]/+server.ts`

- **Page Actions**: Place `+page.server.ts` alongside the page component
  - Example: `src/routes/recipes/[id]/+page.server.ts`
  - Example: `src/routes/suggestions/recipe/+page.server.ts`

#### Serverless Considerations

Both file types work in serverless environments (Vercel Edge, Netlify Functions), but:

- **`+server.ts`**: Better for caching and CDN optimization
- **`+page.server.ts`**: Benefits from SvelteKit's built-in form handling and progressive enhancement
- Both have access to `locals`, private env vars, and server-only code
- Both are deployed as serverless functions

### Current Codebase Patterns

This project uses both patterns appropriately:

- **`/api/recipes/+server.ts`**: Reusable REST endpoint for AI operations (called from multiple pages)
- **`/recipes/[id]/+page.server.ts`**: Page-specific form action for recipe chat interface
- **`/suggestions/recipe/+page.server.ts`**: Page-specific form action for recipe suggestions

**Standardization Goal**: Migrate page-specific actions that call remote APIs to use `+server.ts` endpoints when the logic could be reused, while keeping `+page.server.ts` for truly page-specific form handling.

## AI Assisted Requests

### AI Suggestions Workflow

**Outgoing request**
1. User input is passed to `src/routes/suggestions` via url search params.
2. A truthy value in search params triggers a call to `createSuggestionsQuery()` in `$lib/ai/ai.queries.ts`.
3. Query function makes a `fetch` request to the **suggestions** endpoint, `src/routes/api/suggestions/+server.ts`.
4. **suggestions** uses a _Request Handler_ to call OpenAI with the `generateRecipeSuggestions()` callback and await the response.

**Incoming responst**
5. The _Request Handler_ then returns the OpenAI response as a **Response**, parsing the data.
6. `$lib/ai/ai.queries.ts` passes along the Response JSON as a Response and stores it as a QueryResponse

## 📴 Offline Service Worker

The custom service worker in [`src/service-worker.js`](src/service-worker.js) keeps the PWA usable offline by combining cache-first static assets with network-first content fetches:

- **Static shell**: Every entry in `$service-worker`'s `build` and `files` manifests is pre-cached during `install` and served cache-first for instant boot.
- **Dynamic data**: Network-first caching (with offline fallback) covers the key content routes:
  - `/recipes` (all nested pages such as `/recipes/[id]`, `/recipes/new`, `/recipes/trash`)
  - `/recommendations`
  - `/suggestions` (including `/suggestions/recipe`)
  - `/preferences`
  - `/` (home/dashboard)
- **Safety guards**: Only same-origin `GET` requests are intercepted, preventing interference with Supabase/OpenAI calls, while failed network requests reuse the last good cached response.

### Adding New Offline Paths
1. Identify the route (or family of routes) that should work offline.
2. Update the `dataRoutePrefixes` array inside `src/service-worker.js` with the new prefix. Nested routes are automatically covered by the helper that checks `pathname.startsWith(prefix + '/')`.
3. For API endpoints, only cache them if they expose `GET` handlers and contain idempotent payloads. As of now, no `/api/*` routes for recipes, recommendations, suggestions, or preferences rely on `GET`, so caching is not required. Revisit this guidance if new read-only API endpoints are introduced.

## 📁 Project Structure

```
src/
├── lib/
│   ├── api/              # Zod schemas, types, and services for remote and local/offline api functions
│   ├── components/       # Reusable Svelte components
│   ├── db/               # Database definitions -- deprecated
│   │   ├── local.ts      # Primary DB (IndexedDB)
│   │   └── remote.ts     # Supabase sync logic
│   ├── queries/          # TanStack query functions
│   ├── stores/           # Reactive stores (recipes, suggestions)
│   ├── ui/               # UI components (bits-ui based)
│   │   └── constants.ts  # Shared immutable variable constants
│   ├── types/            # TypeScript type definitions -- deprecated
│   ├── utils/            # Shared utility functions
│   ├── db.ts             # Local Dexie database class
│   └── types.ts          # Common type definitions, not API related
├── routes/
│   ├── api/              # REST API endpoints
│   └── [pages]           # SvelteKit routes
├── hooks.server.ts       # Server hooks (auth, session, permissions, etc.)
└── service-worker.js     # Offline service worker
```

## 🚀 Building & Deployment

### Build Commands
```bash
# Create production build
pnpm run build

# Preview production build locally
pnpm run preview
```

### Deployment Targets

#### Vercel (Current Configuration)
- **Adapter**: `@sveltejs/adapter-vercel`
- **Runtime**: Edge functions (configurable)
- **Setup**: Zero-config deployment
- **Environment**: Set variables in Vercel dashboard

#### Netlify
- **Adapter**: Switch to `@sveltejs/adapter-netlify` in `svelte.config.js`
- **Runtime**: Edge functions supported
- **Environment**: Configure in Netlify dashboard

#### Important Notes
- Only one adapter can be used at a time
- Environment variables must be configured in deployment platform
- Server code must be compatible with edge runtime

## 🤖 LLM Development Guidelines

For AI agents working on this codebase, see the comprehensive [AGENTS.md](./AGENTS.md) file.

### Critical Patterns for LLMs

- **Svelte 5 Runes**: Use `$state()`, `$derived()`, `$props()` - avoid legacy syntax
- **Await Blocks**: Wrap Promise-returning data sources inside `{#await ...}` when rendering in `+page.svelte` files to control pending/error states. Docs: [Await Blocks](https://svelte.dev/docs/svelte/await/llms.txt)
- **Reactive $: statements**: Older components may use `$:` blocks for derived data or effects. Prefer `$derived` and `$effect` runes instead, and migrate legacy code when touched. Docs: [Legacy Reactive Assignments](https://svelte.dev/docs/svelte/legacy-reactive-assignments/llms.txt)
- **Remote Functions**: Server code must be serverless-compatible
- **Zod Validation**: All external data must be validated
- **Dexie Live Queries**: Use `liveQuery()` for reactive database stores
- **Environment Variables**: `PUBLIC_*` for client-safe, private imports for secrets

### Experimental Features
- `remoteFunctions: true` - Enables SvelteKit remote functions
- `async` compiler option - Enables async component features

## 📦 Key Dependencies Impact on LLMs

Understanding these dependencies is crucial for generating compatible code:

- **Svelte 5**: Must use runes syntax, not legacy reactivity patterns
- **SvelteKit 2 Remote Functions**: Server code must be edge runtime compatible
- **Dexie**: IndexedDB wrapper with async operations and reactive `liveQuery()`
- **bits-ui**: Headless UI components that compose with TailwindCSS for building custom UI library
- **Flowbite Svelte**: Pre-build UI components built with TailwindCSS as a fallback when bits-ui components aren't available.
- **OpenAI SDK v6 (Chat Completions)**: Uses the Chat Completions API with streaming responses for recipes
- **Supabase SSR**: Requires specific setup in hooks and layouts
- **Zod 4**: Schema-first validation with automatic type inference

## 🤝 Contributing

### Code Style
- **Prettier**: Automatic code formatting
- **ESLint**: Code quality and consistency
- **TypeScript**: Strict type checking enabled

### Development Workflow
- Feature branches for new development
- Testing required before pull requests
- Follow established patterns in [AGENTS.md](./AGENTS.md)

## 📄 License

[Add license information if applicable]
