import { describe, expect, it } from 'vitest';

import { sanitizeRecipePageBody } from './recipe-import.sanitize';

describe('sanitizeRecipePageBody', () => {
  it('strips scripts and event handlers from body innerHTML', () => {
    const html = `<!DOCTYPE html><html><head></head><body>
      <script>alert(1)</script>
      <p onclick="evil()">Hello <b>world</b></p>
    </body></html>`;

    const { sanitizedBodyHtml, bodyText } = sanitizeRecipePageBody(html);

    expect(sanitizedBodyHtml).not.toContain('<script');
    expect(sanitizedBodyHtml).not.toContain('onclick');
    expect(sanitizedBodyHtml).toContain('<p>');
    expect(sanitizedBodyHtml).toContain('<b>');
    expect(bodyText).toContain('Hello');
    expect(bodyText).toContain('world');
  });

  it('preserves article markup in sanitized body HTML', () => {
    const html = `<!DOCTYPE html><html><body>
      <article>
        <h1>Weeknight Pasta</h1>
        <h2>Ingredients</h2>
        <ul><li>8 oz pasta</li></ul>
      </article>
    </body></html>`;

    const { sanitizedBodyHtml, bodyText } = sanitizeRecipePageBody(html);

    expect(sanitizedBodyHtml).toContain('<article>');
    expect(sanitizedBodyHtml).toContain('<h2>');
    expect(bodyText.toLowerCase()).toContain('ingredients');
  });

  it('returns empty strings when body is missing', () => {
    const { sanitizedBodyHtml, bodyText } = sanitizeRecipePageBody('');

    expect(sanitizedBodyHtml).toBe('');
    expect(bodyText).toBe('');
  });

  it('returns empty strings for malformed HTML without throwing', () => {
    const { sanitizedBodyHtml, bodyText } =
      sanitizeRecipePageBody('<<<not html>>>');

    expect(typeof sanitizedBodyHtml).toBe('string');
    expect(typeof bodyText).toBe('string');
  });
});
