import { getSupabaseClient, corsHeaders, getUserIdFromRequest } from './_shared.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });

    const supabase = getSupabaseClient();
    const { data: inventoryData, error } = await supabase
        .from('inventories')
        .select('card_id, quantity, is_favorite, is_tradable')
        .eq('user_id', userId);
    if (error) throw error;

    const cardDetailPromises = inventoryData.map(async (item) => {
        try {
            const res = await fetch(`https://api.pokemontcg.io/v2/cards/${item.card_id}`);
            if (!res.ok) return null;
            const cardDetails = await res.json();
            return cardDetails.data ? { ...cardDetails.data, ...item } : null;
        } catch { return null; }
    });

    const resolvedCards = (await Promise.all(cardDetailPromises)).filter(Boolean);
    return new Response(JSON.stringify(resolvedCards), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});