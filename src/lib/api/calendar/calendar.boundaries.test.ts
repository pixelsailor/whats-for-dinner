// UNIT/INTG (server project): static boundary checks for the calendar feature.
// They read source text through Vite's `import.meta.glob(..., { query: '?raw' })`, so they guard
// architecture rules (AC-23, AC-24, AC-25, AC-26, AC-34) with no Node typings, no browser, and no
// dependence on git state.
import { describe, expect, it } from 'vitest';

type Sources = Record<string, string>;

/** Non-test calendar source, keyed by project-root-relative path (leading `/`). */
const calendarSources: Sources = {
  ...import.meta.glob<string>(
    [
      '/src/lib/api/calendar/**/*.{ts,svelte}',
      '/src/lib/ui/calendar/**/*.{ts,svelte}',
      '/src/routes/calendar/**/*.{ts,svelte}',
      '/src/lib/stores/calendar.ts',
      '!**/*.test.ts',
      '!**/__tests__/**'
    ],
    { query: '?raw', import: 'default', eager: true }
  )
};

const cloudSources: Sources = import.meta.glob<string>(
  '/src/lib/api/cloud/**/*.ts',
  { query: '?raw', import: 'default', eager: true }
);
const dbSource = import.meta.glob<string>('/src/lib/db.ts', {
  query: '?raw',
  import: 'default',
  eager: true
});
const docs = import.meta.glob<string>(
  [
    '/docs/calendar/README.md',
    '/README.md',
    '/adrs/ADR-012-feature-roadmap-boundaries.md',
    '/src/lib/api/calendar/README.md'
  ],
  { query: '?raw', import: 'default', eager: true }
);
const calendarRoutes = Object.keys(
  import.meta.glob(['/src/routes/calendar/**', '/src/routes/api/calendar/**'], {
    query: '?url',
    import: 'default'
  })
);
const migrations = Object.keys(
  import.meta.glob('/supabase/**/*.sql', { query: '?url', import: 'default' })
);

/** Removes block, line, and HTML comments so prose cannot trip the checks. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const entries = Object.entries(calendarSources);

describe('calendar feature boundaries', () => {
  it('finds the calendar source files it is meant to guard', () => {
    const paths = Object.keys(calendarSources);
    expect(paths.length).toBeGreaterThanOrEqual(9);
    for (const expected of [
      '/src/lib/api/calendar/calendar.model.ts',
      '/src/lib/stores/calendar.ts',
      '/src/lib/ui/calendar/MonthGrid.svelte',
      '/src/lib/ui/calendar/MonthNav.svelte',
      '/src/routes/calendar/+page.svelte'
    ]) {
      expect(paths).toContain(expected);
    }
    expect(paths.some((p) => /\.test\.ts$|__tests__/.test(p))).toBe(false);
  });

  it('imports nothing from cloud, server, AI, or recommendations modules (AC-23)', () => {
    const forbidden =
      /from\s+['"][^'"]*(\$lib\/api\/cloud|\$lib\/server|\$lib\/openai|\$lib\/recommendations|\$env\/static\/private|\$env\/dynamic\/private)[^'"]*['"]/;
    for (const [file, source] of entries) {
      expect(stripComments(source), file).not.toMatch(forbidden);
    }
  });

  it('adds no server route or API route for the calendar (AC-23)', () => {
    const routeFiles = calendarRoutes.map((p) => p.split('/').pop());
    expect(routeFiles.filter((f) => f?.startsWith('+server'))).toEqual([]);
    expect(routeFiles.filter((f) => f?.startsWith('+page.server'))).toEqual([]);
    expect(calendarRoutes.some((p) => p.startsWith('/src/routes/api/'))).toBe(
      false
    );
    expect(calendarRoutes).toContain('/src/routes/calendar/+page.svelte');
  });

  it('never parses a date string with new Date() or serializes via toISOString (AC-24)', () => {
    for (const [file, source] of entries) {
      const code = stripComments(source);
      expect(code, file).not.toMatch(/toISOString\s*\(/);
      for (const match of code.matchAll(/new Date\(([^)]*)\)/g)) {
        // `new Date(0)` is the epoch seed for UTC day math; anything else could parse a string.
        expect(match[1].trim(), `${file}: ${match[0]}`).toBe('0');
      }
    }
  });

  it('keeps the Dexie schema, cloud layer, and Supabase free of calendar state (AC-25)', () => {
    const db = Object.values(dbSource)[0];
    expect(db).toBeTruthy();
    expect(db).not.toMatch(/checkout|calendar/i);
    for (const [file, source] of Object.entries(cloudSources)) {
      expect(source, file).not.toMatch(/calendar/i);
    }
    expect(migrations.filter((f) => /calendar|checkout/i.test(f))).toEqual([]);
  });

  it('keeps recipe documents out of the store and components out of Dexie (AC-26)', () => {
    const store = stripComments(calendarSources['/src/lib/stores/calendar.ts']);
    expect(store).toMatch(
      /buildCheckoutIndex\(\s*await db\.recipes\.toArray\(\)/
    );
    expect(store).not.toContain('unsortedRecipesStore');

    for (const [file, source] of entries) {
      if (!/^\/src\/(lib\/ui|routes)\/calendar\//.test(file)) continue;
      const code = stripComments(source);
      expect(code, file).not.toContain('checkoutIndexStore');
      expect(code, file).not.toMatch(/\$lib\/db['"]/);
    }
  });

  it('documents the feature where ADR-012 and the README point (AC-34)', () => {
    expect(Object.keys(docs).sort()).toEqual([
      '/README.md',
      '/adrs/ADR-012-feature-roadmap-boundaries.md',
      '/docs/calendar/README.md',
      '/src/lib/api/calendar/README.md'
    ]);
    expect(docs['/docs/calendar/README.md']).toMatch(/E1 trigger not fired/i);
    expect(docs['/docs/calendar/README.md']).toMatch(/local-only/i);
    expect(docs['/README.md']).toContain('docs/calendar/README.md');
    expect(docs['/adrs/ADR-012-feature-roadmap-boundaries.md']).toContain(
      '../docs/calendar/README.md'
    );
  });
});
