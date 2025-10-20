import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { permissions } = await parent();
  return { permissions };
};
