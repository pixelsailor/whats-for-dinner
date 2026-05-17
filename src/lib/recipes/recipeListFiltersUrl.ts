import { z } from 'zod';

const SortSchema = z.enum(['title', 'created_at', 'last_made']);
const DirSchema = z.enum(['asc', 'desc']);

export type RecipeListSort = z.infer<typeof SortSchema>;

const MAX_Q_LEN = 2000;

/** Default direction when changing sort in the list UI (`setSortOrder`). */
export function defaultSortDirection(sort: RecipeListSort): z.infer<typeof DirSchema> {
  return sort === 'title' ? 'asc' : 'desc';
}

export type RecipeListFiltersState = {
  search: string | undefined;
  tags: string[];
  sort: RecipeListSort;
  dir: z.infer<typeof DirSchema>;
};

function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const t of raw) {
    const s = t.trim().toLowerCase();
    if (s) seen.add(s);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/**
 * Read recipe list filters from URL search params. Invalid `sort` / `dir` fall back to defaults.
 */
export function parseRecipeListSearchParams(params: URLSearchParams): RecipeListFiltersState {
  const qRaw = params.get('q')?.trim() ?? '';
  const q = qRaw.length === 0 ? undefined : qRaw.length > MAX_Q_LEN ? qRaw.slice(0, MAX_Q_LEN) : qRaw;

  const tags = normalizeTags(params.getAll('tag'));

  const sortParsed = SortSchema.safeParse(params.get('sort'));
  const sort: RecipeListSort = sortParsed.success ? sortParsed.data : 'title';

  const dirParsed = DirSchema.safeParse(params.get('dir'));
  const dir = dirParsed.success ? dirParsed.data : defaultSortDirection(sort);

  return { search: q, tags, sort, dir };
}

/**
 * Build a URL with canonical query string for the given filters (pathname + search only).
 */
export function applyRecipeListFiltersToUrl(base: URL, state: RecipeListFiltersState): URL {
  const u = new URL(base);
  u.search = '';

  if (state.search != null && state.search.trim() !== '') {
    const trimmed = state.search.trim();
    u.searchParams.set('q', trimmed.length > MAX_Q_LEN ? trimmed.slice(0, MAX_Q_LEN) : trimmed);
  }

  for (const t of normalizeTags(state.tags)) {
    u.searchParams.append('tag', t);
  }

  u.searchParams.set('sort', state.sort);
  u.searchParams.set('dir', state.dir);

  return u;
}
