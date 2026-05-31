import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { AiParseError, parseRecipeDetail } from '$lib/api/ai/ai.model';
import { ImportUrlPostBodySchema } from '$lib/api/ai/ai.schemas';
import { OPENAI_DISABLED_ERROR, importRecipeFromURL } from '$lib/api/ai/ai.server.service';

/**
 * Normalizes a recipe URL for server-side import.
 * @param raw - User-provided URL string
 * @returns URL with an http(s) scheme when missing
 */
function normalizeImportUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { permissions } = locals;

  const bodyResult = ImportUrlPostBodySchema.safeParse(await request.json());

  if (!bodyResult.success) {
    return json({ success: false, data: null, error: 'A valid URL is required' }, { status: 400 });
  }

  const aiAllowed = Boolean(permissions?.ai_assistance);

  if (!aiAllowed) {
    return json({ success: false, data: null, error: 'AI access denied' }, { status: 403 });
  }

  const url = normalizeImportUrl(bodyResult.data.url);

  try {
    new URL(url);
  } catch {
    return json({ success: false, data: null, error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const raw = await importRecipeFromURL(url);
    const data = parseRecipeDetail(raw);
    return json({ success: true, data });
  } catch (err) {
    if (err instanceof AiParseError) {
      return json({ success: false, data: null, error: err.message }, { status: 502 });
    }

    if (err instanceof Error && err.message === OPENAI_DISABLED_ERROR) {
      return json({ success: false, data: null, error: 'AI service is unavailable right now' }, { status: 503 });
    }

    console.error('recipe-import-url failed', err);
    return json(
      { success: false, data: null, error: err instanceof Error ? err.message : 'Failed to import recipe' },
      { status: 500 }
    );
  }
};
