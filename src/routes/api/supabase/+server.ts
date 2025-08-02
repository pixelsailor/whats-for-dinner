import type { RequestHandler } from './$types';
import { getRecipeBySharedId, getRecipeFromRemote } from '$lib/db/remote.js';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const shared = url.searchParams.get('shared');
  const id = url.searchParams.get('id');

  try {
    if (shared) {
      const recipe = await getRecipeBySharedId(shared);
      return json({ recipe });
    }
    if (id) {
      const recipe = await getRecipeFromRemote(id);
      return json({ recipe });
    }
    return json({ error: 'No valid query parameters provided.' }, { status: 400 });
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 404 });
  }
};

// export const POST: RequestHandler = async ({ request }) => {
// 	return json();
// };
