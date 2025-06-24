import { getSupabaseClient, corsHeaders, getUserIdFromRequest } from './_shared.ts';

async function fetchCardData(cardId: string) {
    const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
    if (!response.ok) return null;
    const { data } = await response.json();
    return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });

    const supabase = getSupabaseClient();
    const { data: wishes, error } = await supabase.from('trade_wishes').select('card_id').eq('user_id', userId);
    if (error) throw error;

    const cardDetailsPromises = wishes.map(wish => fetchCardData(wish.card_id));
    const wishedCards = (await Promise.all(cardDetailsPromises)).filter(Boolean);

    return new Response(JSON.stringify(wishedCards), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});