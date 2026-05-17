import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // runtime: 'edge',
    }),
    experimental: {
      remoteFunctions: true
    }
  },
  compilerOptions: {
    runes: true,
    experimental: {
      async: true
    }
  }
};

export default config;
