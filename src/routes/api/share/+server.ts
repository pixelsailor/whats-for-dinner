// import { json } from '@sveltejs/kit';
// import randomBytes from '$lib/utils/randombytes';
// import { supabase } from '$lib/supabaseClient';

// export async function POST({ request, params, locals }) {
// 	const { recipeId } = await request.json();
// 	const userId = locals.user?.id; // assuming you're setting this in hooks

// 	if (!userId) {
// 		return new Response('Unauthorized', { status: 401 });
// 	}

// 	// Generate a short token (Base58, 10 chars)
// 	const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
// 	const token = Array.from(randomBytes(8))
// 		.map((b) => alphabet[b % alphabet.length])
// 		.join('');

// 	const { error } = await supabase
// 		.from('shared_links')
// 		.insert([{ token, user_id: userId, recipe_id: recipeId }]);

// 	if (error) {
// 		return new Response(error.message, { status: 500 });
// 	}

// 	return json({ url: `/share/${token}` });
// }
