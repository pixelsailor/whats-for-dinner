export type User = {
	id: string;
	email: string;
	name: string;
	permissions: Permission[];
	isAuthenticated: boolean;
};

export type Permission = {
	id: string;
	name: string;
	resource: string;
	action: string;
};

export type PolicyName = 'ai-assisted-recipe' | 'cloud-sync';

export type PolicyResult = {
	allowed: boolean;
	reason?: string;
};
