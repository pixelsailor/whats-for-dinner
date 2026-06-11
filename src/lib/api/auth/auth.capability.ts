/**
 * @fileoverview Derives whether AI enhancement is available from session, permissions, and connectivity.
 * @module lib/api/auth/auth.capability
 */
import type { Session } from '@supabase/supabase-js';

import type { PolicyResult } from '$lib/types/auth';

/** Inputs for AI capability policy evaluation. */
type CapabilityArgs = {
  session: Session | null;
  permissions?: {
    aiAssistedRecipe?: PolicyResult;
  };
  featureFlags?: {
    openai?: boolean;
  };
  online: boolean;
};

/** Result of AI capability policy evaluation for UI gating. */
export type AICapability = {
  canUseAI: boolean;
  reason: 'offline' | 'disabled' | 'unauthenticated' | 'unauthorized' | null;
};

/**
 * Combines connectivity, feature flags, session, and permission policy into an AI gate.
 * @param args - Session, permissions, feature flags, and browser online hint
 * @returns Whether AI can be used and the first blocking reason when unavailable
 */
export function deriveAICapability({
  session,
  permissions,
  featureFlags,
  online
}: CapabilityArgs): AICapability {
  let reason: AICapability['reason'] = null;

  if (!online) {
    reason = 'offline';
  } else if (!featureFlags?.openai) {
    reason = 'disabled';
  } else if (!session) {
    reason = 'unauthenticated';
  } else if (!permissions?.aiAssistedRecipe?.allowed) {
    reason = 'unauthorized';
  }

  return {
    canUseAI: reason === null,
    reason
  };
}
