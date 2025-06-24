import { getSupabaseClient, corsHeaders } from './_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { username, password } = await req.json();
    if (!username || !password) throw new Error("Usuario y contraseña requeridos");

    const supabase = getSupabaseClient();
    const email = `${username}@example.com`; // Usamos un email ficticio

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw authError;

    if (authData.user) {
      const { error: userError } = await supabase.from('users').insert({ id: authData.user.id, username });
      if (userError) throw userError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});