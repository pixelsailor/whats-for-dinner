# What's For Dinner 🍽️

> An AI-powered meal planning assistant that answers the never-ending question: "What's for dinner?"

A modern, offline-first web application built with Svelte 5 and SvelteKit 2, featuring AI-powered recipe suggestions, personalized meal planning, and seamless cloud synchronization.

## ✨ Features

### Core Features
- **AI-Powered Suggestions**: Get personalized recipe recommendations using OpenAI
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
- **OpenAI API** - AI-powered recipe generation and suggestions
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
- OpenAI API keys handled server-side only
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
│  │   OpenAI        │  │   Supabase                        │ │
│  │   (AI/ML)       │  │   (Auth/Cloud Storage/Sharing)    │ │
│  └─────────────────┘  └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **Offline-First**: Primary data stored in IndexedDB via Dexie
- **Reactive Stores**: `liveQuery()` from Dexie wrapped in Svelte stores
- **Type Safety**: Zod schemas define all data structures, TypeScript interfaces derived
- **Authentication**: Supabase SSR pattern with `hooks.server.ts`
- **AI Integration**: Server-side OpenAI calls via API routes

### Data Flow
1. **User Input** → Svelte 5 components (runes-based reactivity)
2. **Local Storage** → Dexie IndexedDB with reactive queries
3. **API Calls** → SvelteKit remote functions (serverless)
4. **External Services** → OpenAI (AI), Supabase (auth/sync)
5. **Cloud Sync** → Optional synchronization for authenticated users

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
│   ├── components/      # Reusable Svelte components
│   ├── db/             # Database definitions
│   │   ├── local.ts    # Primary DB (IndexedDB)
│   │   └── remote.ts   # Supabase sync logic
│   ├── openai/         # OpenAI integration & prompts
│   ├── queries/        # TanStack query functions
│   ├── stores/         # Reactive stores (recipes, suggestions)
│   ├── ui/             # UI components (bits-ui based)
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Shared utility functions
├── routes/
│   ├── api/            # API endpoints (server-side)
│   └── [pages]         # SvelteKit routes
└── hooks.server.ts     # Server hooks (auth, etc.)
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
- **Flowbite Svelte**: Prefered UI components built with TailwindCSS.
- **bits-ui**: Legacy headless UI components that compose with TailwindCSS. Deprecated.
- **OpenAI SDK v6**: Uses new API patterns with streaming responses
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
