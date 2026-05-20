/**
 * @fileoverview Public barrel for the AI API module (types, schemas, client HTTP, queries).
 * @module lib/api/ai
 *
 * @remarks Server-only OpenAI provider functions live in `ai.server.service.ts` and are not
 * re-exported here so secrets and the provider SDK stay off the client graph.
 */
export * from './ai.model';
export * from './ai.schemas';
export * from './ai.service';
export * from './ai.types';
export * from './ai.queries';
