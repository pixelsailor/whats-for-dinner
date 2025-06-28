import { page, userEvent } from '@vitest/browser/context';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

// describe('/+page.svelte', () => {
// 	it('should render h1', async () => {
// 		render(Page);

// 		const heading = page.getByRole('heading', { level: 1 });
// 		await expect.element(heading).toBeInTheDocument();
// 	});
// });

// import { render, fireEvent, waitFor } from '@testing-library/svelte';
// import Page from './+page.svelte';

// Mock dependencies
vi.mock('$lib/api', () => ({
  recipesApiPostHandler: vi.fn().mockResolvedValue({
    success: true,
    data: {
      title: 'Test Recipe',
      description: 'A test recipe',
      estimated_time: '30 min',
      ingredients: ['Eggs', 'Flour'],
      instructions: ['Mix', 'Bake'],
    }
  })
}));
vi.mock('$lib/db.js', () => ({
  db: {
    recipes: {
      put: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    }
  }
}));

describe('Page', () => {
  it('renders the idle state and form', () => {
    const { getByText, getByRole } = render(Page, { props: { data: {}, form: {} } });
    expect(getByText('What are you hungry for?')).toBeInTheDocument();
    expect(getByRole('textbox')).toBeInTheDocument();
    expect(getByRole('button', { name: /get ideas/i })).toBeInTheDocument();
  });

  it('disables submit button when input is empty', async () => {
    const { getByRole } = render(Page, { props: { data: {}, form: {} } });
    const button = getByRole('button', { name: /get ideas/i });
    expect(button).toBeDisabled();
  });

  it.skip('shows loading state when app.view is loading', async () => {
    const { component, getByText } = render(Page, { props: { data: {}, form: {} } });
		console.log(component);
		
    component.app.view = 'loading';
    await vi.waitFor(() => {
      expect(getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('shows suggestions when app.view is suggestions', async () => {
    const form = { data: [{ title: 'Pizza', short_description: 'Cheesy' }] };
    const { getByText } = render(Page, { props: { data: {}, form } });
    // Simulate suggestions view
    // window.app = { view: 'suggestions' };
    // await vi.waitFor(() => {
    //   expect(getByText('Here are some ideas:')).toBeInTheDocument();
    //   expect(getByText('Pizza')).toBeInTheDocument();
    // });
		expect(getByText('Here are some ideas:')).toBeInTheDocument();
		expect(getByText('Pizza')).toBeInTheDocument();
  });

  it.skip('shows recipe details when app.view is detail', async () => {
    const { component, getByText } = render(Page, { props: { data: {}, form: {} } });
    // Simulate selecting a recipe
    component.app.selected = { title: 'Test Recipe', short_description: 'desc' };
    component.app.fullRecipes.set('Test Recipe', {
      title: 'Test Recipe',
      description: 'A test recipe',
      estimated_time: '30 min',
      ingredients: ['Eggs', 'Flour'],
      instructions: ['Mix', 'Bake'],
    });
    component.app.view = 'detail';
    await vi.waitFor(() => {
      expect(getByText('Test Recipe')).toBeInTheDocument();
      expect(getByText('A test recipe')).toBeInTheDocument();
      expect(getByText('Eggs')).toBeInTheDocument();
      expect(getByText('Mix')).toBeInTheDocument();
    });
  });

  it.skip('shows error state', async () => {
    const { component, getByText } = render(Page, { props: { data: {}, form: {} } });
    component.app.view = 'error';
    component.app.error = 'Something went wrong';
    await vi.waitFor(() => {
      expect(getByText(/there was a problem/i)).toBeInTheDocument();
      expect(getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  it.skip('calls selectRecipe when a suggestion is clicked', async () => {
    const form = { data: [{ title: 'Pizza', short_description: 'Cheesy' }] };
    const { getByText, component } = render(Page, { props: { data: {}, form } });
    // Simulate suggestions view
    component.app.view = 'suggestions';
    const spy = vi.spyOn(component, 'selectRecipe');
    await vi.waitFor(() => {
      userEvent.click(getByText('Pizza'));
      expect(spy).toHaveBeenCalled();
    });
  });
});