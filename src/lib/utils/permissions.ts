import type { Session } from '@supabase/supabase-js';
import type { PolicyName, PolicyResult } from '$lib/types/auth';

/**
 * @deprecated Use permissions returned from Supabase user profiles (`locals.permissions`)
 * instead of this helper. This function now returns `allowed: false` for all policies
 * to avoid mocked overrides.
 */
export function checkPolicy(session: Session | null, policy: PolicyName): PolicyResult {
	// Not authenticated = no permissions
	if (!session?.user) {
		return { allowed: false, reason: 'User not authenticated' };
	}

	return { allowed: false, reason: 'Permission not granted' };
}
