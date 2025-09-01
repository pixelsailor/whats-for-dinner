export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Layout = 'mobile--collapsed' | 'mobile--expanded' | 'desktop--collapsed' | 'desktop--expanded';

export type Viewport = {
	width: number;
	device: 'desktop' | 'mobile';
	layout: Layout;
	nav: 'collapsed' | 'expanded';
};

export type ViewState = 'idle' | 'suggestions' | 'detail' | 'error' | 'loading';

export type PromptContext = 'addendum' | 'assistance' | 'detail' | 'revision' | 'summaries';

export type ApiResponse<T> = {
	success: boolean;
	data: T;
	message: string;
};

export type RecipeSummary = {
	title: string;
	short_description: string;
	// estimated_time: string;
	// tags: string[];
};

export type Suggestion = RecipeSummary & {
	id: string;
	created_at: number;
};

export type FullRecipe = {
	title: string;
	short_description: string;
	description: string;
	ingredients: string; // markdown
	instructions: string; // markdown
	time: {
		prep: string;
		cook: string;
		total: string;
	};
	tags: string[];
	yield: string;
	notes?: string; // markdown
};

export type SavedRecipe = FullRecipe & {
	id: string;
	created_at: number;
	archived?: number;
	deleted_at?: number;
	last_opened: number;
	version: number;
	parent_id?: string;
	is_current: boolean;
	owner_id?: string;
	// shared_id?: string;
	synced?: boolean;
	last_synced_at?: number;
	sync_error?: string;
};

export type PantryItem = {
	id: string;
	name: string;
	added_at: number;
};

export type UserPreferences = {
	id: string;
	diet?: string[];
	allergies?: string[];
	dislikes?: string[];
	cuisinePreferences?: string[];
	equipment?: string[];
	skillLevel?: 'beginner' | 'intermediate' | 'advanced';
	preferredPrepTime?: 'under 30 minutes' | '30-60 minutes' | 'no time limit';
};
