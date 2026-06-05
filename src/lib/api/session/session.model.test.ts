import { describe, expect, it } from 'vitest';

import {
  SESSION_SERIALIZED_RESPONSE_HEADERS,
  createLayoutBrowserClient,
  createLayoutServerClient,
  createRequestServerClient,
  isSessionSerializedResponseHeader
} from './session.model';

const testConfig = {
  url: 'https://example.supabase.co',
  publishableKey: 'test-publishable-key'
};

describe('isSessionSerializedResponseHeader', () => {
  it('accepts known Supabase SSR response headers', () => {
    for (const header of SESSION_SERIALIZED_RESPONSE_HEADERS) {
      expect(isSessionSerializedResponseHeader(header)).toBe(true);
    }
  });

  it('rejects unrelated headers', () => {
    expect(isSessionSerializedResponseHeader('set-cookie')).toBe(false);
  });
});

describe('session client factories', () => {
  it('createRequestServerClient returns a Supabase client with auth and from', () => {
    const setAll = () => {};
    const client = createRequestServerClient({ getAll: () => [], setAll }, testConfig);

    expect(client.auth).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('createLayoutBrowserClient returns a Supabase client with auth and from', () => {
    const client = createLayoutBrowserClient(fetch, testConfig);

    expect(client.auth).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('createLayoutServerClient returns a Supabase client with auth and from', () => {
    const client = createLayoutServerClient({ getAll: () => [] }, fetch, testConfig);

    expect(client.auth).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});
