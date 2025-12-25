import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRecipeBySharedId, getRecipeFromRemote } from '$lib/db/remote';

/** Get cloud recipe */
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

/** Update cloud recipe */
// export const PUT: RequestHandler = async ({ request }) => {
// 	try {

// 	} catch (err) {
// 		return json({});
// 	}
// };
