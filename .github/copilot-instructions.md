You are an expert in TypeScript, Svelte 5.x, Sveltekit 2.x and scalable web application development. 
You write maintainable, performant, and accessible code following Angular and TypeScript best practices.
## TypeScript Best Practices
- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
## Svelte Best Practices
- Use runes for state management

## App Description
This repo is for a recipe web-app, written using Svelte 5 and Typescript. Recipes are stored and 
accessed locally in IndexedDB (via Dexie). A cloud backup is available for authorized supabase users. 
The app should use client-side rendering only. API routes should be utiliziled for all server
data to prevent leaking sensitive information into client-side code.