import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { PolicyResult } from '$lib/types/auth';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			supabase: SupabaseClient;
			permissions: { ai_assistance: boolean; cloud_storage: boolean } | null;
		}
		interface PageData {
			session: Session | null;
			user?: User | null;
			permissions?: {
				cloudSync: PolicyResult;
				aiAssistedRecipe: PolicyResult;
			};
			permissionFlags?: { ai_assistance: boolean; cloud_storage: boolean } | null;
			featureFlags?: {
				openai: boolean;
			};
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
