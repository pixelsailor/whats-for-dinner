/**
 * @fileoverview Cross-domain TypeScript types aligned with common validation schemas.
 * @module lib/api/common/common.types
 */

/**
 * Generic API response envelope used by server routes and services.
 * Shape matches {@link ApiResponseSchema} in `common.schemas.ts`.
 * @template T - payload type
 */
export type ApiResponse<T> = {
  /** Whether the request succeeded. */
  success: boolean;
  /** Payload returned by the API when successful. */
  data: T;
  /** Optional human readable message (errors or success info). */
  message?: string;
  /** Optional structured error object for failures. */
  error?: {
    message: string;
    code?: string;
  };
};
