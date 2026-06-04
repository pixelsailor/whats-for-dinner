import { describe, expect, it } from 'vitest';

import { AccountParseError, hasPermission, parseUserPreferencesResponse, parseUserPreferencesUpdate, parseUserProfile } from './account.model';

const sampleProfile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  user_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  ai_assistance: true,
  cloud_storage: false,
  preferences: {}
};

const samplePreferences = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  user_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  diet: ['vegetarian'],
  allergies: null,
  dislikes: null,
  cuisine_preferences: null,
  equipment: ['oven'],
  skill_level: 'intermediate',
  preferred_prep_time: '30m',
  use_ai_assistance: true,
  created_at: '2024-01-15T12:00:00.000Z',
  updated_at: '2024-01-15T12:00:00.000Z'
};

describe('parseUserProfile', () => {
  it('accepts a valid user_profiles row', () => {
    expect(parseUserProfile(sampleProfile)).toEqual(sampleProfile);
  });

  it('throws AccountParseError for invalid rows', () => {
    expect(() => parseUserProfile({ user_id: 'not-a-uuid' })).toThrow(AccountParseError);
  });
});

describe('parseUserPreferencesResponse', () => {
  it('accepts a valid user_preferences row', () => {
    expect(parseUserPreferencesResponse(samplePreferences)).toMatchObject({
      user_id: samplePreferences.user_id,
      use_ai_assistance: true
    });
  });

  it('throws AccountParseError for invalid rows', () => {
    expect(() => parseUserPreferencesResponse({ user_id: 'bad' })).toThrow(AccountParseError);
  });
});

describe('parseUserPreferencesUpdate', () => {
  it('accepts partial preference payloads including user_id for upsert', () => {
    expect(
      parseUserPreferencesUpdate({
        user_id: samplePreferences.user_id,
        use_ai_assistance: false,
        diet: []
      })
    ).toEqual({
      user_id: samplePreferences.user_id,
      use_ai_assistance: false,
      diet: []
    });
  });

  it('rejects invalid preference field types', () => {
    expect(() => parseUserPreferencesUpdate({ diet: 'vegetarian' })).toThrow(AccountParseError);
  });
});

describe('hasPermission', () => {
  it('returns true only when the flag is strictly true', () => {
    expect(hasPermission(sampleProfile, 'ai_assistance')).toBe(true);
    expect(hasPermission(sampleProfile, 'cloud_storage')).toBe(false);
  });
});
