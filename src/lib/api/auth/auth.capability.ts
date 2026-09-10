/**
 * @fileoverview Derives AI and cloud enhancement availability from session, permissions, and connectivity.
 * @module lib/api/auth/auth.capability
 */
import type { Session } from '@supabase/supabase-js';

import type { PolicyResult } from '$lib/types/auth';

/** Inputs for AI capability policy evaluation. */
type AICapabilityArgs = {
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
}: AICapabilityArgs): AICapability {
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

/** Inputs for cloud read/write capability evaluation. */
type CloudCapabilityArgs = {
  session: Session | null;
  permissions?: {
    cloudRead?: PolicyResult;
    cloudWrite?: PolicyResult;
  };
  online: boolean;
};

/**
 * Result of cloud capability policy evaluation for sync and mutate gating.
 *
 * @remarks
 * Product assumption: write implies read. Demo accounts may have read without write.
 * Callers must still respect RLS; this helper only gates client UX and layout sync.
 */
export type CloudCapability = {
  canReadCloud: boolean;
  canWriteCloud: boolean;
  reason: 'offline' | 'unauthenticated' | 'unauthorized' | null;
};

/**
 * Combines connectivity, session, and cloud permission policies into read/write gates.
 * @param args - Session, `cloudRead`/`cloudWrite` policies, and browser online hint
 * @returns Whether cloud download and upload paths are allowed, plus the first blocking reason
 */
export function deriveCloudCapability({
  session,
  permissions,
  online
}: CloudCapabilityArgs): CloudCapability {
  let reason: CloudCapability['reason'] = null;

  if (!online) {
    reason = 'offline';
  } else if (!session) {
    reason = 'unauthenticated';
  } else if (
    !permissions?.cloudRead?.allowed &&
    !permissions?.cloudWrite?.allowed
  ) {
    reason = 'unauthorized';
  }

  const canWriteCloud =
    reason === null && (permissions?.cloudWrite?.allowed ?? false);
  const canReadCloud =
    reason === null &&
    ((permissions?.cloudRead?.allowed ?? false) || canWriteCloud);

  return {
    canReadCloud,
    canWriteCloud,
    reason
  };
}
