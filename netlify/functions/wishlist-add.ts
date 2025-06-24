import { getSupabaseClient, corsHeaders, getUserIdFromRequest } from './_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });

    const { cardId } = await req.json();
    if (!cardId) throw new Error("cardId es requerido");

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('trade_wishes').insert({ user_id: userId, card_id: cardId });
    if (error && error.code !== '23505') { // Ignora error de duplicado
        throw error;
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});