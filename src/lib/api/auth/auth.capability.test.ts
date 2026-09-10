import { describe, expect, it } from 'vitest';

import { deriveAICapability, deriveCloudCapability } from './auth.capability';

const baseArgs = {
  session: { access_token: 'token' } as import('@supabase/supabase-js').Session,
  permissions: { aiAssistedRecipe: { allowed: true } },
  featureFlags: { openai: true },
  online: true
};

const cloudBaseArgs = {
  session: { access_token: 'token' } as import('@supabase/supabase-js').Session,
  permissions: {
    cloudRead: { allowed: true },
    cloudWrite: { allowed: true }
  },
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

describe('deriveCloudCapability', () => {
  it('allows read and write when both policies pass', () => {
    expect(deriveCloudCapability(cloudBaseArgs)).toEqual({
      canReadCloud: true,
      canWriteCloud: true,
      reason: null
    });
  });

  it('allows read-only when write is denied', () => {
    expect(
      deriveCloudCapability({
        ...cloudBaseArgs,
        permissions: {
          cloudRead: { allowed: true },
          cloudWrite: { allowed: false }
        }
      })
    ).toEqual({
      canReadCloud: true,
      canWriteCloud: false,
      reason: null
    });
  });

  it('blocks when offline', () => {
    expect(deriveCloudCapability({ ...cloudBaseArgs, online: false })).toEqual({
      canReadCloud: false,
      canWriteCloud: false,
      reason: 'offline'
    });
  });

  it('blocks when unauthenticated', () => {
    expect(deriveCloudCapability({ ...cloudBaseArgs, session: null })).toEqual({
      canReadCloud: false,
      canWriteCloud: false,
      reason: 'unauthenticated'
    });
  });

  it('blocks when neither read nor write is allowed', () => {
    expect(
      deriveCloudCapability({
        ...cloudBaseArgs,
        permissions: {
          cloudRead: { allowed: false },
          cloudWrite: { allowed: false }
        }
      })
    ).toEqual({
      canReadCloud: false,
      canWriteCloud: false,
      reason: 'unauthorized'
    });
  });
});
