import { getSupabaseClient, corsHeaders, getUserIdFromRequest } from './_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });

    const { name, cards } = await req.json();
    if (!name || !Array.isArray(cards)) throw new Error("Parámetros inválidos");

    const supabase = getSupabaseClient();
    // Upsert: actualiza si existe, inserta si no.
    const { error } = await supabase.from('decks').upsert({
        user_id: userId,
        name: name,
        cards: cards,
        total_cards: cards.length
    }, { onConflict: 'user_id, name' });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});