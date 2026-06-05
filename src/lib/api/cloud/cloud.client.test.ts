import { describe, expect, it } from 'vitest';

import { createAnonymousCloudClient } from './cloud.client';

const testConfig = {
  url: 'https://example.supabase.co',
  publishableKey: 'test-publishable-key'
};

describe('createAnonymousCloudClient', () => {
  it('returns a Supabase client with auth and from', () => {
    const client = createAnonymousCloudClient(testConfig);

    expect(client.auth).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});
