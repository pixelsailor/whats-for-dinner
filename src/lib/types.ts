export type ViewState = 'idle' | 'suggestions' | 'recipe-detail';

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
	instructions: string;
};
