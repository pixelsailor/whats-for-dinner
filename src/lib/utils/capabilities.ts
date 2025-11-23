import type { Session } from '@supabase/supabase-js';
import type { PolicyResult } from '$lib/types/auth';

type CapabilityArgs = {
	session: Session | null;
	permissions?: {
		aiAssistedRecipe?: PolicyResult;
	};
	featureFlags?: {
		openai?: boolean;
	};
	online: boolean;
};

export type AICapability = {
	canUseAI: boolean;
	reason: 'offline' | 'disabled' | 'unauthenticated' | 'unauthorized' | null;
};

export function deriveAICapability({
	session,
	permissions,
	featureFlags,
	online
}: CapabilityArgs): AICapability {
	let reason: AICapability['reason'] = null;

	if (!online) {
		reason = 'offline';
	} else if (!featureFlags?.openai) {
		reason = 'disabled';
	} else if (!session) {
		reason = 'unauthenticated';
	} else if (!permissions?.aiAssistedRecipe?.allowed) {
		reason = 'unauthorized';
	}

	return {
		canUseAI: reason === null,
		reason
	};
}

