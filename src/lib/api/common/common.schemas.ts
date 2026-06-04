/**
 * @fileoverview Shared Zod primitives for API response envelopes and Supabase row shapes.
 * @module lib/api/common/common.schemas
 */

import { z } from 'zod';

/**
 * ISO-8601 datetime string as returned by PostgREST for `timestamptz` columns.
 *
 * @remarks Uses Zod v4 `z.iso.datetime({ offset: true })` (not deprecated `z.string().datetime()`).
 * Default `z.iso.datetime()` rejects numeric offsets; PostgREST usually returns `+00:00`.
 * Both `Z` and offset forms validate; timezone-less local strings do not.
 */
export const supabaseTimestamptzSchema = z.iso.datetime({ offset: true });

/**
 * Generic API response envelope used by server routes.
 * @template T - payload type
 */
export const ApiResponseSchema = <T>(data: T) =>
  z.object({
    success: z.boolean(),
    data: data,
    message: z.string().optional(),
    error: z
      .object({
        message: z.string(),
        code: z.string().optional()
      })
      .optional()
  });
