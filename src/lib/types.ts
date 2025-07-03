export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Layout =
	| 'mobile--collapsed'
	| 'mobile--expanded'
	| 'desktop--collapsed'
	| 'desktop--expanded';

export type Viewport = {
	width: number;
	device: 'desktop' | 'mobile';
	layout: Layout;
	nav: 'collapsed' | 'expanded';
}

export type ViewState = 'idle' | 'suggestions' | 'detail' | 'error' | 'loading';

export type PromptContext = 'assistance' | 'detail' | 'revision' | 'summaries';

export type ApiResponse<T> = {
	success: boolean;
	data: T;
	message: string;
}

export type RecipeSummary = {
	title: string;
	short_description: string;
	estimated_time: string;
	tags: string[];
};

export type Suggestion = RecipeSummary & {
	id: string;
	created_at: number;
}

export type FullRecipe = {
	title: string;
	description: string;
	ingredients: string; // markdown
	instructions: string; // markdown
	estimated_time?: string; // deprecated
  time: {
		prep: string;
		cook: string;
		total: string;
		chill?: string;
	}
  tags: string[];
	yield: string;
	notes?: string; // markdown
};

export type SavedRecipe = FullRecipe & {
	id: string;
	short_description: string;
	created_at: number;
	archived?: number;
	last_opened: number;
	version: number;
	parent_id?: string;
	is_current: boolean;
}

export type PantryItem = {
	id: string;
	name: string;
	added_at: number;
}