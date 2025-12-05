import type { Session } from '@supabase/supabase-js';
import type { PolicyName, PolicyResult } from '$lib/types/auth';

export function checkPolicy(session: Session | null, policy: PolicyName): PolicyResult {
  // Not authenticated = no permissions
  if (!session?.user) {
    return { allowed: false, reason: 'User not authenticated' };
  }

  // All authenticated users get cloud storage
  if (policy === 'cloud_storage') {
    return { allowed: true };
  }

  // Mock ai assistance as true for now
  if (policy === 'ai_assistance') {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Permission not granted' };
}
