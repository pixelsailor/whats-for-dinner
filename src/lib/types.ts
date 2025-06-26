export type ViewState = 'idle' | 'suggestions' | 'detail' | 'error' | 'loading';

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

export type FullRecipe = {
	title: string;
	description: string;
	ingredients: string[];
	instructions: string[];
  estimated_time: string;
  tags: string[];
};

export type SavedRecipe = FullRecipe & {
	id: string;
	short_description: string;
	created_at: number;
}

export type PantryItem = {
	id: string;
	name: string;
	added_at: number;
}