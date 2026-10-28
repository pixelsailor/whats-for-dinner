import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

function createMockSupabase(overrides?: {
  session?: Session | null;
  user?: User | null;
  getUserError?: Error | null;
  signOutError?: Error | null;
}) {
  const getSession = vi.fn().mockResolvedValue({
    data: { session: overrides?.session ?? null },
    error: null
  });

  const getUser = vi.fn().mockImplementation(() => {
    if (overrides?.getUserError) {
      return Promise.reject(overrides.getUserError);
    }
    return Promise.resolve({
      data: { user: overrides?.user ?? null },
      error: overrides?.getUserError ?? null
    });
  });

  const signOut = vi.fn().mockImplementation(() => {
    if (overrides?.signOutError) {
      return Promise.reject(overrides.signOutError);
    }
    return Promise.resolve({ error: null });
  });

  return {
    client: {
      auth: {
        getSession,
        getUser,
        signOut
      }
    } as unknown as SupabaseClient,
    spies: {
      getSession,
      getUser,
      signOut
    }
  };
}

describe('AuthService.validateOrSignOut', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when no session is present', async () => {
    const { client, spies } = createMockSupabase({ session: null });
    const service = new AuthService(client);

    const result = await service.validateOrSignOut(null);

    expect(result).toBe(false);
    expect(spies.signOut).not.toHaveBeenCalled();
  });

  it('returns true when session is still within valid lifetime', async () => {
    const futureSession = {
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes in future
      user: { id: 'user-1' }
    } as Session;

    const { client, spies } = createMockSupabase({ session: futureSession });
    const service = new AuthService(client);

    const result = await service.validateOrSignOut(futureSession);

    expect(result).toBe(true);
    expect(spies.getUser).not.toHaveBeenCalled();
    expect(spies.signOut).not.toHaveBeenCalled();
  });

  it('clears stale session and returns false when expired and offline', async () => {
    const expiredSession = {
      expires_at: Math.floor(Date.now() / 1000) - 300, // 5 minutes in past
      user: { id: 'user-1' }
    } as Session;

    // Simulate offline
    vi.stubGlobal('navigator', { onLine: false });

    const { client, spies } = createMockSupabase({ session: expiredSession });
    const service = new AuthService(client);

    const result = await service.validateOrSignOut(expiredSession);

    expect(result).toBe(false);
    expect(spies.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(spies.getUser).not.toHaveBeenCalled();
  });

  it('refreshes and returns true when expired and online getUser succeeds', async () => {
    const expiredSession = {
      expires_at: Math.floor(Date.now() / 1000) - 300,
      user: { id: 'user-1' }
    } as Session;

    vi.stubGlobal('navigator', { onLine: true });

    const { client, spies } = createMockSupabase({
      session: expiredSession,
      user: { id: 'user-1' } as User
    });
    const service = new AuthService(client);

    const result = await service.validateOrSignOut(expiredSession);

    expect(result).toBe(true);
    expect(spies.getUser).toHaveBeenCalled();
    expect(spies.signOut).not.toHaveBeenCalled();
  });

  it('signs out locally and returns false when expired and online getUser returns error', async () => {
    const expiredSession = {
      expires_at: Math.floor(Date.now() / 1000) - 300,
      user: { id: 'user-1' }
    } as Session;

    vi.stubGlobal('navigator', { onLine: true });

    const { client, spies } = createMockSupabase({
      session: expiredSession,
      user: null
    });
    const service = new AuthService(client);

    const result = await service.validateOrSignOut(expiredSession);

    expect(result).toBe(false);
    expect(spies.getUser).toHaveBeenCalled();
    expect(spies.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('signs out locally and returns false when getUser throws a network or auth error', async () => {
    const expiredSession = {
      expires_at: Math.floor(Date.now() / 1000) - 300,
      user: { id: 'user-1' }
    } as Session;

    vi.stubGlobal('navigator', { onLine: true });

    const { client, spies } = createMockSupabase({
      session: expiredSession,
      getUserError: new Error('Network error / Auth session missing')
    });
    const service = new AuthService(client);

    const result = await service.validateOrSignOut(expiredSession);

    expect(result).toBe(false);
    expect(spies.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
