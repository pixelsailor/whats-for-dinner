import { describe, expect, it } from 'vitest';

import type { CloudRecipe, SavedRecipe } from '../recipe/recipe.types';
import {
  buildSyncPlan,
  categorizeConflict,
  CloudParseError,
  isActive,
  isSyncable,
  SHARE_TOKEN_ALPHABET,
  SHARE_TOKEN_BYTE_LENGTH,
  encodeShareToken,
  generateShareToken,
  parseCloudRecipe,
  parseCloudRecipeMaybe,
  parseCloudRecipeRows,
  parseCloudRecipeSyncSummaryRows,
  parseCloudRecipeUpdate,
  parseCloudRecipeUpload,
  parseSharedRecipe
} from './cloud.model';

const sampleSharedLink = {
  token: 'Ab3CdEf9',
  user_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  recipe_id: '550e8400-e29b-41d4-a716-446655440000',
  created_at: '2024-01-15T12:00:00.000Z',
  expires_at: null
};

const sampleCloudRecipe: CloudRecipe = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Test stew',
  short_description: 'A hearty stew',
  description: 'Comfort food for weeknights.',
  ingredients: '- 2 cups broth',
  instructions: '1. Simmer.',
  tags: ['dinner'],
  yield: '4 servings',
  prep_time: ['15'],
  cook_time: ['45'],
  notes: 'Season to taste.',
  created_at: '2024-01-15T12:00:00.000Z',
  updated_at: '2024-01-15T12:00:00.000Z',
  archived: null,
  deleted_at: null,
  last_opened: null,
  version: 1,
  parent_id: null,
  is_current: true,
  is_favorite: false,
  owner_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  shared_id: null,
  synced: true,
  last_synced_at: '2024-01-15T12:00:00.000Z',
  sync_error: null,
  checkout_history: []
};

describe('encodeShareToken', () => {
  it('maps each byte through the share token alphabet', () => {
    const bytes = new Uint8Array([0, 1, 2, 3]);

    expect(encodeShareToken(bytes)).toBe('1234');
  });

  it('produces one character per input byte', () => {
    const bytes = new Uint8Array(SHARE_TOKEN_BYTE_LENGTH);

    expect(encodeShareToken(bytes)).toHaveLength(SHARE_TOKEN_BYTE_LENGTH);
  });

  it('uses only characters from SHARE_TOKEN_ALPHABET', () => {
    const bytes = new Uint8Array([3, 17, 42, 99, 200, 11, 55, 88]);

    for (const char of encodeShareToken(bytes)) {
      expect(SHARE_TOKEN_ALPHABET).toContain(char);
    }
  });
});

describe('parseSharedRecipe', () => {
  it('accepts a valid shared_links row', () => {
    expect(parseSharedRecipe(sampleSharedLink)).toEqual(sampleSharedLink);
  });

  it('accepts PostgREST timestamptz strings with a numeric offset', () => {
    expect(
      parseSharedRecipe({
        ...sampleSharedLink,
        created_at: '2024-01-15T12:00:00+00:00'
      })
    ).toMatchObject({ created_at: '2024-01-15T12:00:00+00:00' });
  });

  it('throws CloudParseError for invalid rows', () => {
    expect(() => parseSharedRecipe({ token: 'x' })).toThrow(CloudParseError);
  });
});

describe('parseCloudRecipe', () => {
  it('accepts a valid recipes row with owner_id', () => {
    expect(parseCloudRecipe(sampleCloudRecipe)).toEqual(sampleCloudRecipe);
  });

  it('accepts PostgREST timestamptz strings with a numeric offset', () => {
    expect(
      parseCloudRecipe({
        ...sampleCloudRecipe,
        created_at: '2024-01-15T12:00:00+00:00',
        updated_at: '2024-01-15T12:00:00.123456+00:00',
        last_synced_at: '2024-01-15T12:00:00+00:00'
      })
    ).toMatchObject({
      created_at: '2024-01-15T12:00:00+00:00',
      updated_at: '2024-01-15T12:00:00.123456+00:00',
      last_synced_at: '2024-01-15T12:00:00+00:00'
    });
  });

  it('accepts null notes and null is_favorite from postgres rows', () => {
    expect(
      parseCloudRecipe({
        ...sampleCloudRecipe,
        notes: null,
        is_favorite: null
      })
    ).toMatchObject({
      notes: null,
      is_favorite: null
    });
  });

  it('throws CloudParseError with recipe identity when tags are invalid', () => {
    try {
      parseCloudRecipe({
        ...sampleCloudRecipe,
        tags: ['']
      });
      expect.fail('expected CloudParseError');
    } catch (err) {
      expect(err).toBeInstanceOf(CloudParseError);
      expect((err as CloudParseError).recipeId).toBe(sampleCloudRecipe.id);
      expect((err as CloudParseError).recipeTitle).toBe(sampleCloudRecipe.title);
      expect((err as CloudParseError).fieldErrors).toMatchObject({ tags: expect.any(Array) });
    }
  });

  it('throws CloudParseError when owner_id is null', () => {
    expect(() => parseCloudRecipe({ ...sampleCloudRecipe, owner_id: null })).toThrow(CloudParseError);
  });
});

describe('parseCloudRecipeRows', () => {
  it('returns null for absent arrays', () => {
    expect(parseCloudRecipeRows(null)).toBeNull();
  });

  it('accepts PostgREST timestamptz strings with a numeric offset', () => {
    expect(
      parseCloudRecipeRows([
        {
          ...sampleCloudRecipe,
          created_at: '2024-01-15T12:00:00+00:00',
          updated_at: '2024-01-15T12:00:00+00:00',
          last_synced_at: '2024-01-15T12:00:00+00:00'
        }
      ])
    ).toHaveLength(1);
  });
});

describe('parseCloudRecipeMaybe', () => {
  it('returns null for absent rows', () => {
    expect(parseCloudRecipeMaybe(null)).toBeNull();
  });
});

describe('parseCloudRecipeSyncSummaryRows', () => {
  it('accepts summary projection rows', () => {
    expect(
      parseCloudRecipeSyncSummaryRows([
        {
          id: sampleCloudRecipe.id,
          title: sampleCloudRecipe.title,
          short_description: sampleCloudRecipe.short_description,
          last_synced_at: '2024-01-15T12:00:00.000Z'
        }
      ])
    ).toHaveLength(1);
  });

  it('accepts PostgREST timestamptz strings with a numeric offset', () => {
    expect(
      parseCloudRecipeSyncSummaryRows([
        {
          id: sampleCloudRecipe.id,
          title: sampleCloudRecipe.title,
          short_description: sampleCloudRecipe.short_description,
          last_synced_at: '2024-01-15T12:00:00.123456+00:00'
        }
      ])
    ).toMatchObject([{ last_synced_at: '2024-01-15T12:00:00.123456+00:00' }]);
  });
});

describe('parseCloudRecipeUpload', () => {
  it('requires owner_id on upload payloads', () => {
    expect(parseCloudRecipeUpload(sampleCloudRecipe)).toEqual(sampleCloudRecipe);
  });

  it('throws CloudParseError when owner_id is missing', () => {
    expect(() => parseCloudRecipeUpload({ ...sampleCloudRecipe, owner_id: null })).toThrow(CloudParseError);
  });
});

describe('parseCloudRecipeUpdate', () => {
  it('accepts partial updates with id', () => {
    expect(parseCloudRecipeUpdate({ id: sampleCloudRecipe.id, title: 'Renamed' })).toEqual({
      id: sampleCloudRecipe.id,
      title: 'Renamed'
    });
  });
});

describe('generateShareToken', () => {
  it('returns a token with the expected byte length', () => {
    expect(generateShareToken()).toHaveLength(SHARE_TOKEN_BYTE_LENGTH);
  });

  it('returns alphabet-only characters', () => {
    for (const char of generateShareToken()) {
      expect(SHARE_TOKEN_ALPHABET).toContain(char);
    }
  });
});

const syncRecipe = (overrides: Partial<SavedRecipe> = {}): SavedRecipe => ({
  ...sampleCloudRecipe,
  ...overrides
});

describe('isActive and isSyncable', () => {
  it('treats tombstoned rows as inactive but syncable', () => {
    const tombstoned = syncRecipe({ deleted_at: '2024-02-01T12:00:00.000Z' });

    expect(isActive(tombstoned)).toBe(false);
    expect(isSyncable(tombstoned)).toBe(true);
  });

  it('excludes archived rows from both helpers', () => {
    const archived = syncRecipe({ archived: '2024-02-01T12:00:00.000Z' });

    expect(isActive(archived)).toBe(false);
    expect(isSyncable(archived)).toBe(false);
  });
});

describe('buildSyncPlan tombstones', () => {
  it('includes local-only tombstones for upload', () => {
    const localTombstone = syncRecipe({
      id: '11111111-1111-4111-8111-111111111111',
      deleted_at: '2024-02-01T12:00:00.000Z',
      updated_at: '2024-02-01T12:00:00.000Z',
      last_synced_at: '2024-01-15T12:00:00.000Z',
      synced: false
    });

    const plan = buildSyncPlan([localTombstone], []);

    expect(plan.localOnly).toEqual([localTombstone]);
    expect(plan.cloudOnly).toEqual([]);
  });

  it('includes cloud-only tombstones for download', () => {
    const cloudTombstone = syncRecipe({
      id: '22222222-2222-4222-8222-222222222222',
      deleted_at: '2024-02-01T12:00:00.000Z',
      updated_at: '2024-02-01T12:00:00.000Z',
      last_synced_at: '2024-02-01T12:00:00.000Z'
    });

    const plan = buildSyncPlan([], [cloudTombstone]);

    expect(plan.cloudOnly).toEqual([cloudTombstone]);
    expect(plan.localOnly).toEqual([]);
  });

  it('flags tombstone drift as conflicts when sync timestamps differ', () => {
    const local = syncRecipe({
      deleted_at: '2024-02-01T12:00:00.000Z',
      updated_at: '2024-02-01T12:00:00.000Z',
      last_synced_at: '2024-01-15T12:00:00.000Z',
      synced: false
    });
    const cloud = syncRecipe({
      deleted_at: null,
      updated_at: '2024-01-20T12:00:00.000Z',
      last_synced_at: '2024-01-20T12:00:00.000Z'
    });

    const plan = buildSyncPlan([local], [cloud]);

    expect(plan.conflicts).toHaveLength(1);
    expect(plan.autoResolvable[0]).toMatchObject({ action: 'upload', reason: 'local-tombstone-newer' });
  });
});

describe('categorizeConflict tombstones', () => {
  it('uploads a newer local tombstone over an active cloud row', () => {
    const resolution = categorizeConflict({
      local: syncRecipe({
        deleted_at: '2024-02-01T12:00:00.000Z',
        updated_at: '2024-02-01T12:00:00.000Z'
      }),
      cloud: syncRecipe({
        deleted_at: null,
        updated_at: '2024-01-20T12:00:00.000Z'
      })
    });

    expect(resolution).toMatchObject({ action: 'upload', reason: 'local-tombstone-newer' });
  });

  it('downloads a newer cloud tombstone over an active local row', () => {
    const resolution = categorizeConflict({
      local: syncRecipe({
        deleted_at: null,
        updated_at: '2024-01-20T12:00:00.000Z'
      }),
      cloud: syncRecipe({
        deleted_at: '2024-02-01T12:00:00.000Z',
        updated_at: '2024-02-01T12:00:00.000Z'
      })
    });

    expect(resolution).toMatchObject({ action: 'download', reason: 'cloud-tombstone-newer' });
  });

  it('uploads a local restore when the active row is newer than a cloud tombstone', () => {
    const resolution = categorizeConflict({
      local: syncRecipe({
        deleted_at: null,
        updated_at: '2024-03-01T12:00:00.000Z'
      }),
      cloud: syncRecipe({
        deleted_at: '2024-02-01T12:00:00.000Z',
        updated_at: '2024-02-01T12:00:00.000Z'
      })
    });

    expect(resolution).toMatchObject({ action: 'upload', reason: 'local-active-or-restored-newer' });
  });

  it('downloads a cloud restore when the active row is newer than a local tombstone', () => {
    const resolution = categorizeConflict({
      local: syncRecipe({
        deleted_at: '2024-02-01T12:00:00.000Z',
        updated_at: '2024-02-01T12:00:00.000Z'
      }),
      cloud: syncRecipe({
        deleted_at: null,
        updated_at: '2024-03-01T12:00:00.000Z'
      })
    });

    expect(resolution).toMatchObject({ action: 'download', reason: 'cloud-active-or-restored-newer' });
  });
});
