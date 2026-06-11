import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import {
  AiParseError,
  buildSuggestionsResponse,
  parseSuggestionsOutput
} from '$lib/api/ai/ai.model';
import { generateRecipeSuggestions } from '$lib/api/ai/ai.server.service';
import { SuggestionsPostBodySchema } from '$lib/api/ai/ai.schemas';

export const POST: RequestHandler = async ({
  request,
  locals
}): Promise<Response> => {
  const { permissions } = locals;

  const bodyResult = SuggestionsPostBodySchema.safeParse(await request.json());

  if (!bodyResult.success) {
    return error(400, { message: 'Prompt is required' });
  }

  const { prompt, preferences } = bodyResult.data;

  const aiAllowed = Boolean(permissions?.ai_assistance);

  if (!aiAllowed) {
    return error(403, { message: 'AI access denied' });
  }

  try {
    const request_id = Date.now();
    const raw = await generateRecipeSuggestions(prompt, preferences || '');
    const output = parseSuggestionsOutput(raw);
    const data = buildSuggestionsResponse(output, request_id);

    return json(data);
  } catch (err) {
    if (err instanceof AiParseError) {
      return json({ error: err.message }, { status: 502 });
    }

    console.error('Failed to get recipe suggestions', err);
    return json(
      { error: (err as Error)?.message || 'Failed to get recipe suggestions' },
      { status: 500 }
    );
  }
};
