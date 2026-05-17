# External documentation references

Curated upstream docs for the WFD stack. For in-repo architecture and agent rules, use the [README Documentation Map](../README.md#documentation-map).

## Svelte and SvelteKit

- [Svelte (LLM-oriented)](https://svelte.dev/docs/svelte/llms-small.txt)
- [SvelteKit (LLM-oriented)](https://svelte.dev/docs/kit/llms-small.txt)
- [Svelte testing](https://svelte.dev/docs/svelte/testing/llms.txt) — see also [`.cursor/rules/svelte-mcp-workflow.mdc`](../.cursor/rules/svelte-mcp-workflow.mdc) for MCP tool order

## UI

- [bits-ui](https://bits-ui.com/docs/llms.txt)
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)

## Local data

- [Dexie + Svelte tutorial](https://dexie.org/docs/Tutorial/Svelte)
- [Dexie `liveQuery`](https://dexie.org/docs/liveQuery/) — WFD patterns: [`.cursor/rules/local-data-dexie-ownership.mdc`](../.cursor/rules/local-data-dexie-ownership.mdc), [ADR-002](../adrs/ADR-002-local-data-ownership.md)

## Cloud and remote data

- [Supabase JavaScript reference](https://supabase.com/docs/reference/javascript) — WFD boundary: [`.cursor/rules/supabase-enhancement-boundary.mdc`](../.cursor/rules/supabase-enhancement-boundary.mdc), [ADR-004](../adrs/ADR-004-account-and-cloud-enhancement-model.md)
- [TanStack Query (Svelte)](https://tanstack.com/query/latest/docs/framework/svelte/overview) — WFD usage: [`docs/tanstack-query.md`](./tanstack-query.md)
