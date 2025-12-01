import { z } from 'zod';

import type { ApiResponseSchema } from './common.schemas';

export type ApiResponse<T> = z.infer<typeof ApiResponseSchema<T>>;
