import { getSupabaseClient, corsHeaders } from './_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { username, password } = await req.json();
    const supabase = getSupabaseClient();
    const email = `${username}@example.com`;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }
});