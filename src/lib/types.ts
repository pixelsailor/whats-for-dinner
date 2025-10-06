/**
 * Icon size tokens used across the UI components.
 * @example 'sm'
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Internal layout state used by the viewport helper.
 * Mobile/desktop and collapsed/expanded are represented as unique tokens.
 */
type Layout = 'mobile--collapsed' | 'mobile--expanded' | 'desktop--collapsed' | 'desktop--expanded';

/**
 * Viewport information derived from the current window size and app UI state.
 */
export type Viewport = {
	/** Window width in pixels. */
	width: number;
	/** Device category used for responsive logic. */
	device: 'desktop' | 'mobile';
	/** Layout token combining device and nav state. */
	layout: Layout;
	/** Navigation drawer state. */
	nav: 'collapsed' | 'expanded';
};

/**
 * Top-level page view states used by route components.
 */
export type ViewState = 'idle' | 'suggestions' | 'detail' | 'error' | 'loading';

/**
 * Context types for prompts sent to OpenAI (controls parsing/handlers).
 */
export type PromptContext = 'addendum' | 'assistance' | 'detail' | 'revision' | 'summaries';

/**
 * Generic API response envelope used by server routes.
 * @template T - payload type
 */
export type ApiResponse<T> = {
	/** Whether the request succeeded. */
	success: boolean;
	/** Payload returned by the API when successful. */
	data: T;
	/** Human readable message (errors or success info). */
	message: string;
};

/**
 * Minimal recipe metadata used for lists and suggestions.
 */
export type RecipeSummary = {
	/** Recipe title. */
	title: string;
	/** Short human-facing description. */
	short_description: string;
};

/**
 * Suggestion returned by the LLM or suggestion engine.
 */
export type Suggestion = RecipeSummary & {
	/** Unique identifier for the suggestion. */
	id: string;
	/** Unix epoch ms when suggestion was created. */
	created_at: number;
};

/**
 * Full recipe model used for storage and editing. Several fields contain markdown strings.
 */
export type FullRecipe = {
	/** Title of the recipe. */
	title: string;
	/** Short description used in lists and cards. */
	short_description: string;
	/** Longer description or notes for the recipe. */
	description: string;
	/** Ingredients as a markdown string (bullet list recommended). */
	ingredients: string; // markdown
	/** Instructions as a markdown string (numbered list recommended). */
	instructions: string; // markdown
	/** Estimated times for the recipe. Values are human readable (e.g., '30 min'). */
	time: {
		prep: string;
		cook: string;
		total: string;
	};
	/** Array of tag tokens (cuisine, diet, method, etc.). */
	tags: string[];
	/** Yield string (e.g., 'Serves 4'). */
	yield: string;
	/** Optional freeform notes (markdown). */
	notes?: string; // markdown
};

/**
 * Recipe as stored in the local DB (IndexedDB via Dexie). Extends `FullRecipe` with
 * metadata used by the app for syncing, versioning and UI.
 */
export type SavedRecipe = FullRecipe & {
	/** Primary id (UUID). */
	id: string;
	/** Creation timestamp (ms since epoch). */
	created_at: number;
	/** Optional archived timestamp. */
	archived?: number;
	/** Optional deletion timestamp. */
	deleted_at?: number;
	/** Timestamp (ms) indicating when the recipe was last opened. */
	last_opened: number;
	/** Monotonically increasing version number used for edits. */
	version: number;
	/** Parent id for version history (if applicable). */
	parent_id?: string;
	/** Marks whether this row is the current active version. */
	is_current: boolean;
	/** Whether the recipe is favorited in the UI. */
	is_favorite: boolean;
	/** Owner id when synced to the cloud (supabase). */
	owner_id?: string;
	/** Shared id for public/shared recipes. */
	shared_id?: string;
	/** Whether the recipe has been synced to remote. */
	synced?: boolean;
	/** Last sync timestamp (ms). */
	last_synced_at?: number;
	/** Error message from last sync attempt, if any. */
	sync_error?: string;
};

/**
 * Single pantry item stored locally.
 */
export type PantryItem = {
	id: string;
	name: string;
	added_at: number;
};

/**
 * Per-user preference object. Used to tailor prompts and suggestions.
 */
export type UserPreferences = {
	id: string;
	/** Dietary restrictions or preferences (e.g., ['vegetarian']). */
	diet?: string[];
	/** Allergies the user has (e.g., ['peanuts']). */
	allergies?: string[];
	/** Ingredients the user dislikes. */
	dislikes?: string[];
	/** Preferred cuisines (e.g., ['italian']). */
	cuisinePreferences?: string[];
	/** Available equipment (e.g., ['oven','instant-pot']). */
	equipment?: string[];
	/** Skill level to tune suggestions or instructions. */
	skillLevel?: 'beginner' | 'intermediate' | 'advanced';
	/** Preferred prep time bucket. */
	preferredPrepTime?: 'under 30 minutes' | '30-60 minutes' | 'no time limit';
};
