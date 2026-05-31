import { describe, expect, it } from 'vitest';

import { RECIPE_IMPORT_NO_RECIPE, RecipeImportError } from './recipe-import.errors';
import {
  extractJsonLdRecipes,
  hasRecipeSignal,
  htmlToText,
  prepareImportContent
} from './recipe-import.prepare';
import type { FetchedPage } from './recipe-import.types';

const JSON_LD_FIXTURE = `<!DOCTYPE html>
<html>
<head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Test Chocolate Chip Cookies",
  "description": "Crisp edges and chewy centers.",
  "recipeYield": "24 cookies",
  "recipeIngredient": ["2 cups all-purpose flour", "1 cup chocolate chips"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Mix dry ingredients." },
    { "@type": "HowToStep", "text": "Bake at 350F for 12 minutes." }
  ]
}
</script>
</head>
<body><p>Extra narrative should not be required when JSON-LD is present.</p></body>
</html>`;

const CSR_SHELL_FIXTURE = `<!DOCTYPE html>
<html><head><title>My Recipe Blog</title></head>
<body><div id="app"></div></body></html>`;

const HTML_RECIPE_FIXTURE = `<!DOCTYPE html>
<html><body>
<article>
<h1>Weeknight Pasta</h1>
<p>Servings: 4. Prep time: 10 minutes. Cook time: 20 minutes.</p>
<h2>Ingredients</h2>
<ul>
<li>8 oz pasta</li>
<li>2 tbsp olive oil</li>
<li>3 cloves garlic, minced</li>
</ul>
<h2>Instructions</h2>
<ol>
<li>Boil pasta in salted water until al dente.</li>
<li>Sauté garlic in olive oil, toss with pasta, and serve.</li>
</ol>
</article>
</body></html>`;

function page(html: string, url = 'https://example.com/recipe'): FetchedPage {
  return { url, contentType: 'text/html; charset=utf-8', html };
}

describe('extractJsonLdRecipes', () => {
  it('parses a Recipe object from application/ld+json', () => {
    const recipes = extractJsonLdRecipes(JSON_LD_FIXTURE);

    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.name).toBe('Test Chocolate Chip Cookies');
    expect(recipes[0]?.recipeIngredient).toHaveLength(2);
  });

  it('finds Recipe nodes inside @graph', () => {
    const html = `<script type="application/ld+json">
      {"@graph":[{"@type":"WebSite","name":"Blog"},{"@type":"Recipe","name":"Graph Recipe","recipeIngredient":["1 egg"],"recipeInstructions":["Whisk"]}]}
    </script>`;

    const recipes = extractJsonLdRecipes(html);

    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.name).toBe('Graph Recipe');
  });
});

describe('htmlToText', () => {
  it('strips scripts and tags', () => {
    const text = htmlToText('<html><script>alert(1)</script><p>Hello <b>world</b></p></html>');

    expect(text).toContain('Hello');
    expect(text).toContain('world');
    expect(text).not.toContain('alert');
    expect(text).not.toContain('<p>');
  });
});

describe('hasRecipeSignal', () => {
  it('accepts non-empty JSON-LD primary block', () => {
    expect(hasRecipeSignal('{"@type":"Recipe","name":"X","recipeIngredient":["a"]}', '')).toBe(true);
  });

  it('requires recipe-like supplemental text without JSON-LD', () => {
    expect(hasRecipeSignal('', 'short')).toBe(false);
    expect(hasRecipeSignal('', 'x'.repeat(300))).toBe(false);
    expect(
      hasRecipeSignal(
        '',
        `${'x'.repeat(280)} ingredients: flour. instructions: mix and bake for 20 minutes.`
      )
    ).toBe(true);
  });
});

describe('prepareImportContent', () => {
  it('prepares json_ld content from JSON-LD fixture', () => {
    const prepared = prepareImportContent(page(JSON_LD_FIXTURE));

    expect(prepared.preparationSource).toBe('json_ld');
    expect(prepared.primaryBlock).toContain('Test Chocolate Chip Cookies');
    expect(prepared.primaryBlock).toContain('recipeIngredient');
  });

  it('prepares html_text when article body has recipe cues', () => {
    const prepared = prepareImportContent(page(HTML_RECIPE_FIXTURE));

    expect(prepared.preparationSource).toBe('html_text');
    expect(prepared.primaryBlock).toBe('');
    expect(prepared.supplementalText.toLowerCase()).toContain('ingredients');
    expect(prepared.supplementalText.toLowerCase()).toContain('instructions');
  });

  it('throws when CSR shell has no recipe signal', () => {
    expect(() => prepareImportContent(page(CSR_SHELL_FIXTURE))).toThrow(RecipeImportError);

    try {
      prepareImportContent(page(CSR_SHELL_FIXTURE));
    } catch (err) {
      expect(err).toBeInstanceOf(RecipeImportError);
      expect((err as RecipeImportError).code).toBe(RECIPE_IMPORT_NO_RECIPE);
    }
  });
});
