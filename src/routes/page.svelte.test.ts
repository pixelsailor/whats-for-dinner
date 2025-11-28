import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PageHarness from './__tests__/PageHarness.svelte';
import { goto } from '$app/navigation';
import { deriveAICapability } from '$lib/utils/capabilities';
import { getGreeting } from '$lib/greetings';

const PROMPT_PLACEHOLDER =
	'Ask for event ideas, regional recipes, or just list ingredients';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/stores/network', () => ({
	networkStore: {
		subscribe: (run: (value: { online: boolean }) => void) => {
			run({ online: true });
			return () => {};
		}
	}
}));

vi.mock('$lib/utils/capabilities', () => ({
	deriveAICapability: vi.fn()
}));

vi.mock('$lib/greetings', () => ({
	getGreeting: vi.fn()
}));

const mockedGoto = vi.mocked(goto);
const mockedCapability = vi.mocked(deriveAICapability);
const mockedGreeting = vi.mocked(getGreeting);

const createPageData = (): App.PageData => ({
	session: null,
	permissions: {
		cloudSync: { allowed: false },
		aiAssistedRecipe: { allowed: true }
	},
	featureFlags: {
		openai: true
	}
});

beforeEach(() => {
	vi.clearAllMocks();
	mockedCapability.mockReturnValue({
		canUseAI: true,
		reason: null
	});
	mockedGreeting.mockReturnValue('Howdy there');
	mockedGoto.mockResolvedValue(undefined);
});

describe('/+page.svelte', () => {
	it('renders greeting and AI prompt when available', async () => {
		const screen = render(PageHarness, { data: createPageData() });

		const heading = screen.getByRole('heading', {
			level: 1,
			name: 'Howdy there'
		});
		await expect.element(heading).toBeInTheDocument();

		const promptInput = screen.getByPlaceholder(PROMPT_PLACEHOLDER);
		await expect.element(promptInput).toBeInTheDocument();

		const submitButton = screen.getByRole('button', { name: 'Submit request' });
		await expect.element(submitButton).toBeDisabled();

		expect(mockedGreeting).toHaveBeenCalled();
		expect(mockedCapability).toHaveBeenCalled();
	});

	it('submits prompt and navigates to suggestions list', async () => {
		const screen = render(PageHarness, { data: createPageData() });

		const promptInput = screen.getByPlaceholder(PROMPT_PLACEHOLDER);
		await promptInput.fill('chili + rice');

		const submitButton = screen.getByRole('button', { name: 'Submit request' });
		await expect.element(submitButton).toBeEnabled();

		await submitButton.click();

		expect(mockedGoto).toHaveBeenCalledWith('/suggestions?prompt=chili%20%2B%20rice');

		await expect.element(submitButton).toBeDisabled();
		const workingLabel = screen.getByText('Thinking...');
		await expect.element(workingLabel).toBeInTheDocument();
	});

	it('shows restriction message when AI is unavailable', async () => {
		mockedCapability.mockReturnValue({
			canUseAI: false,
			reason: 'disabled'
		});

		const screen = render(PageHarness, { data: createPageData() });

		const message = screen.getByText('AI suggestions are unavailable in this build.');
		await expect.element(message).toBeInTheDocument();
	});
});
