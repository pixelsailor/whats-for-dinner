import { z } from 'zod';

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
