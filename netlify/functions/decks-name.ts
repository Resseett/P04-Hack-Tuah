import { getSupabaseClient, corsHeaders, getUserIdFromRequest } from './_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const name = decodeURIComponent(pathParts.pop() || '');
    if (!name) throw new Error("Nombre del mazo no especificado");

    const supabase = getSupabaseClient();

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('decks').select('*').match({ user_id: userId, name: name }).single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (req.method === 'DELETE') {
      const { error } = await supabase.from('decks').delete().match({ user_id: userId, name: name });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response('Método no permitido', { status: 405, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});