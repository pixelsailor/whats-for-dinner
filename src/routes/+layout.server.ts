import type { LayoutServerLoad } from './$types'
import { checkPolicy } from '$lib/utils/permissions'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
  const { session } = await safeGetSession()
  
  // Calculate permissions
  const permissions = {
    cloudSync: checkPolicy(session, 'cloud-sync'),
    aiAssistedRecipe: checkPolicy(session, 'ai-assisted-recipe')
  }
  
  return {
    session,
    permissions,
    cookies: cookies.getAll(),
  }
}