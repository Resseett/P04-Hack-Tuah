import { getSupabaseClient, corsHeaders, getUserIdFromRequest } from './_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });
    
    const { cardId } = await req.json();
    if (!cardId) throw new Error("cardId es requerido");

    const supabase = getSupabaseClient();
    const { data: existing } = await supabase.from('inventories').select('id, quantity').match({ user_id: userId, card_id: cardId }).single();

    if (existing) {
      await supabase.from('inventories').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
    } else {
      await supabase.from('inventories').insert({ user_id: userId, card_id: cardId, quantity: 1 });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});