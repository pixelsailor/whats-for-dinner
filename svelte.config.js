import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// runtime: 'edge',
		}),
		experimental: {
			remoteFunctions: true,
		}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
