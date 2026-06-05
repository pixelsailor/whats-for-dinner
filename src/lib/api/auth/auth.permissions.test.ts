import type { Cookies } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';

import { clearSessionPermissions, getSessionPermissions, setSessionPermissions } from './auth.permissions';

function createCookieJar(): Cookies & { jar: Map<string, string> } {
  const jar = new Map<string, string>();

  return {
    jar,
    get: (name) => jar.get(name),
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    set: (name, value, _opts) => {
      jar.set(name, value);
    },
    serialize: () => '',
    delete: (name) => {
      jar.delete(name);
    }
  };
}

describe('session permission cookies', () => {
  it('round-trips valid permission flags', () => {
    const cookies = createCookieJar();
    const flags = { ai_assistance: true, cloud_storage: false };

    setSessionPermissions(cookies, flags);

    expect(getSessionPermissions(cookies)).toEqual(flags);
  });

  it('returns null for missing cookie', () => {
    expect(getSessionPermissions(createCookieJar())).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const cookies = createCookieJar();
    cookies.jar.set('wfd-permissions', 'not-json');

    expect(getSessionPermissions(cookies)).toBeNull();
  });

  it('returns null for invalid shape', () => {
    const cookies = createCookieJar();
    cookies.jar.set('wfd-permissions', JSON.stringify({ ai_assistance: 'yes' }));

    expect(getSessionPermissions(cookies)).toBeNull();
  });

  it('clears the permission cookie', () => {
    const cookies = createCookieJar();
    setSessionPermissions(cookies, { ai_assistance: true, cloud_storage: true });

    clearSessionPermissions(cookies);

    expect(getSessionPermissions(cookies)).toBeNull();
  });
});
