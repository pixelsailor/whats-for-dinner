import { VITE_OPENAI_API_KEY } from '$env/static/private';
import { OpenAI } from 'openai/client.js';

export const openai = new OpenAI({
	apiKey: VITE_OPENAI_API_KEY
});
