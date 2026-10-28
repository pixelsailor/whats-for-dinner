# CLAUDE.md — Claude Code Quick Reference

> Comprehensive agent instructions, ADR links, and orchestration workflows live in [**`AGENTS.md`**](./AGENTS.md). Refer to `AGENTS.md` as the canonical guide.

## Essential Commands

- **Check types & Svelte:** `pnpm run check` (runs `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`)
- **Lint & format check:** `pnpm run lint` (runs `prettier --check . && eslint .`)
- **Format code:** `pnpm run format` (runs `prettier --write .`)
- **Run all tests:** `pnpm run test` (runs Vitest across all projects)
- **Run server tests:** `pnpm test -- --project server`
- **Run client tests:** `pnpm test -- --project client`
- **Start dev server:** `pnpm run dev`
- **Production build:** `pnpm run build`

## Core Architecture Invariants

- **Offline-First & Anonymous-First ([ADR-001](./adrs/ADR-001-product-operating-model.md)):** Core recipe book (save, edit, search, organize, delete, restore) must function 100% offline in IndexedDB via Dexie without requiring Supabase auth, network, or OpenAI. Supabase and OpenAI are optional enhancements that must gracefully degrade.
- **Dexie as System of Record ([ADR-002](./adrs/ADR-002-local-data-ownership.md)):** Single Dexie instance in `src/lib/db.ts`. Subscribe to tables via `createLiveQueryStore` in `src/lib/stores/`. Route all database writes through store or domain helpers—never write raw `db.*.put/update` in `.svelte` components.
- **Preferences vs Recommendations ([ADR-009](./adrs/ADR-009-recommendations-engine-inputs.md)):** User preferences shape **AI prompts and suggestions only**. Recommendations rank **locally saved recipes** via `checkout_history` without preference filtering.
- **Schema-Led Domain Contracts ([ADR-008](./adrs/ADR-008-schema-led-domain-contracts.md)):** All domain code lives in `src/lib/api/<domain>/`. Define Zod schemas with `.strict()`, derive types via `z.infer<typeof Schema>`, and validate external boundaries with `.safeParse()`. Do not duplicate types in manual interfaces.
- **Serverless & Secret Safety ([ADR-006](./adrs/ADR-006-serverless-and-secret-boundary.md), [ADR-007](./adrs/ADR-007-ai-provider-contract.md)):** Secrets (`OPENAI_API_KEY`) and server SDKs must stay in server modules (`+server.ts`, `hooks.server.ts`, `src/lib/server/`) using `$env/static/private`. Never expose secrets or server SDKs to client code or `.svelte` components. Use OpenAI Responses API + Zod; do not extend legacy `chat.completions.create`.
- **Svelte 5 Runes & UI ([ADR-013](./adrs/ADR-013-ui-component-library-bits-ui.md), [ADR-014](./adrs/ADR-014-semantic-html-and-accessibility.md)):** Use `<script lang="ts">`, `$state()`, `$derived()`, `$effect()`, `$props()`. Do not use legacy `$:`. Headless UI uses **bits-ui** with TailwindCSS 4.
- **Code Style:** Tabs (`tabWidth: 2`) per `.prettierrc`. External → internal (`$lib/...`) → local relative imports. Use `import type` for type-only imports.

## Quality & Merge Gates

Before finishing any task:

1. Ensure code matches Accepted ADRs in `adrs/` and passes the checks in [`docs/validation-checklist.md`](./docs/validation-checklist.md) (MG-01 through MG-05).
2. Run `pnpm run check`, `pnpm run lint`, and `pnpm run test`.
