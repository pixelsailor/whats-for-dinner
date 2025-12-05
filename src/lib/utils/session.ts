import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

export type PermissionFlags = { ai_assistance: boolean; cloud_storage: boolean };

const PERMISSIONS_COOKIE = 'wfd-permissions';
const PERMISSIONS_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const cookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: !dev,
	maxAge: PERMISSIONS_MAX_AGE
};

function isPermissionFlags(value: unknown): value is PermissionFlags {
	if (!value || typeof value !== 'object') return false;
	const flags = value as Record<string, unknown>;
	return typeof flags.ai_assistance === 'boolean' && typeof flags.cloud_storage === 'boolean';
}

export function getSessionPermissions(cookies: Cookies): PermissionFlags | null {
	const raw = cookies.get(PERMISSIONS_COOKIE);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw);
		return isPermissionFlags(parsed) ? parsed : null;
	} catch (error) {
		console.error('Failed to parse permissions cookie', error);
		return null;
	}
}

export function setSessionPermissions(cookies: Cookies, permissions: PermissionFlags): void {
	cookies.set(PERMISSIONS_COOKIE, JSON.stringify(permissions), cookieOptions);
}

export function clearSessionPermissions(cookies: Cookies): void {
	cookies.delete(PERMISSIONS_COOKIE, { path: cookieOptions.path });
}

