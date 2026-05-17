import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { permissions } = await parent();

  if (!permissions?.aiAssistedRecipe?.allowed) {
    throw redirect(303, '/recommendations');
  }

  return { permissions };
};
