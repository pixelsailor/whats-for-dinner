import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'src/routes/recipes/new/+page.svelte'),
  'utf8'
);

describe('import from URL client boundary', () => {
  it('posts URL only to the import API without client fetch or DOMPurify', () => {
    expect(pageSource).not.toMatch(/dompurify|isomorphic-dompurify/i);
    expect(pageSource).not.toContain('fetchDomBodyContent');
    expect(pageSource).toContain("fetch('/api/import/url'");
    expect(pageSource).toContain('JSON.stringify({ url: recipeUrl })');
  });
});
