import { describe, expect, it } from 'vitest';

import { deriveAICapability } from './auth.capability';

const baseArgs = {
  session: { access_token: 'token' } as import('@supabase/supabase-js').Session,
  permissions: { aiAssistedRecipe: { allowed: true } },
  featureFlags: { openai: true },
  online: true
};

describe('deriveAICapability', () => {
  it('allows AI when all gates pass', () => {
    expect(deriveAICapability(baseArgs)).toEqual({
      canUseAI: true,
      reason: null
    });
  });

  it('blocks when offline', () => {
    expect(deriveAICapability({ ...baseArgs, online: false })).toEqual({
      canUseAI: false,
      reason: 'offline'
    });
  });

  it('blocks when OpenAI feature flag is off', () => {
    expect(
      deriveAICapability({ ...baseArgs, featureFlags: { openai: false } })
    ).toEqual({
      canUseAI: false,
      reason: 'disabled'
    });
  });

  it('blocks when unauthenticated', () => {
    expect(deriveAICapability({ ...baseArgs, session: null })).toEqual({
      canUseAI: false,
      reason: 'unauthenticated'
    });
  });

  it('blocks when permission policy denies AI assistance', () => {
    expect(
      deriveAICapability({
        ...baseArgs,
        permissions: { aiAssistedRecipe: { allowed: false } }
      })
    ).toEqual({
      canUseAI: false,
      reason: 'unauthorized'
    });
  });
});
