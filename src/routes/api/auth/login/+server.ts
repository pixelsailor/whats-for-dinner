// src/routes/api/auth/login/+server.ts
// import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
// import { createClient } from '@supabase/supabase-js';
// import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ locals, request }) => {
  const { email, password } = await request.json();

  const { error } = await locals.supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return new Response(error.message, { status: 401 });
  }

  // Cookie is automatically set by auth-helpers
  return new Response('OK', { status: 200 });
};

// export const POST: RequestHandler = async ({ request, cookies }) => {
//   try {
//     const { email, password } = await request.json();

//     if (!email || !password) {
//       throw error(400, 'Email and password are required');
//     }

//     // Create Supabase client
//     const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

//     // Attempt to sign in
//     const { data, error: authError } = await supabase.auth.signInWithPassword({
//       email,
//       password
//     });

//     if (authError) {
//       console.error('Supabase auth error:', authError);
//       throw error(401, authError.message);
//     }

//     if (!data.session) {
//       throw error(401, 'No session created');
//     }

//     // Set session cookies if needed
//     // You might want to set httpOnly cookies here for security
//     cookies.set('sb-access-token', data.session.access_token, {
//       path: '/',
//       httpOnly: true,
//       secure: true,
//       sameSite: 'lax',
//       maxAge: 60 * 60 * 24 * 7 // 1 week
//     });

//     cookies.set('sb-refresh-token', data.session.refresh_token, {
//       path: '/',
//       httpOnly: true,
//       secure: true,
//       sameSite: 'lax',
//       maxAge: 60 * 60 * 24 * 30 // 30 days
//     });

//     return json({
//       success: true,
//       user: data.user,
//       message: 'Login successful'
//     });

//   } catch (err) {
//     console.error('Login API error:', err);

//     if (err instanceof Error && 'status' in err) {
//       throw err;
//     }

//     throw error(500, 'Internal server error');
//   }
// };
