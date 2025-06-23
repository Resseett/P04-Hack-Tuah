import { Application, Router, send } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { setCookie, getCookies } from "https://deno.land/std@0.224.0/http/cookie.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "supabase";

// --- Conexión a Supabase ---
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY"); 

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar definidos en el archivo .env");
}
const supabase = createClient(supabaseUrl, supabaseKey);

const app = new Application();
const router = new Router();

// --- Helper para obtener el ID de usuario ---
async function getUserIdFromCookie(ctx: any): Promise<string | null> {
    const cookies = getCookies(ctx.request.headers);
    const username = cookies.loggedInUser;
    if (!username) return null;
    const { data } = await supabase.from('users').select('id').eq('username', username).single();
    return data ? data.id : null;
}

// --- Rutas Estáticas ---
router.get("/components/:file", async (ctx) => { await send(ctx, `frontend/components/${ctx.params.file}`, { root: Deno.cwd() }); });
router.get("/js/:file", async (ctx) => { await send(ctx, `frontend/js/${ctx.params.file}`, { root: Deno.cwd() }); });
router.get("/", async (ctx) => { await send(ctx, "frontend/index.html", { root: Deno.cwd() }); });
router.get("/login", async (ctx) => { await send(ctx, "frontend/login.html", { root: Deno.cwd() }); });
router.get("/signup", async (ctx) => { await send(ctx, "frontend/signup.html", { root: Deno.cwd() }); });
router.get("/pokedex", async (ctx) => { await send(ctx, "frontend/pokedex.html", { root: Deno.cwd() }); });
router.get("/scan", async (ctx) => { await send(ctx, "frontend/scan.html", { root: Deno.cwd() }); });
router.get("/inventory", async (ctx) => { await send(ctx, "frontend/inventory.html", { root: Deno.cwd() }); });
router.get("/trade", async (ctx) => { await send(ctx, "frontend/trade.html", { root: Deno.cwd() }); });

// --- Rutas de Autenticación ---
router.post("/api/signup", async (ctx) => {
    const { username, password } = await ctx.request.body({ type: "json" }).value;
    if (!username || !password) { ctx.response.status = 400; return; }
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: `${username}@example.com`, password: password });
    if (authError) { ctx.response.status = 409; return; }
    if (authData.user) {
        await supabase.from('users').insert({ id: authData.user.id, username });
    }
    ctx.response.status = 201;
    ctx.response.body = { success: true };
});

router.post("/api/login", async (ctx) => {
    const { username, password } = await ctx.request.body({ type: "json" }).value;
    const { error } = await supabase.auth.signInWithPassword({ email: `${username}@example.com`, password: password });
    if (error) { ctx.response.status = 401; return; }
    setCookie(ctx.response.headers, { name: "loggedInUser", value: username, httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: "/" });
    ctx.response.body = { success: true };
});

router.get("/api/session", (ctx) => {
    const cookies = getCookies(ctx.request.headers);
    ctx.response.body = { loggedInUser: cookies.loggedInUser || null };
});

router.post("/api/logout", (ctx) => {
    setCookie(ctx.response.headers, { name: "loggedInUser", value: "", maxAge: 0 });
    ctx.response.body = { success: true };
});

// --- Rutas de Inventario (Versión Robusta y Completa) ---
router.get("/api/inventory", async (ctx) => {
    try {
        const userId = await getUserIdFromCookie(ctx);
        if (!userId) { ctx.response.status = 401; return; }

        const { data: inventoryData, error: dbError } = await supabase
            .from('inventories')
            .select('card_id, quantity, is_favorite, is_tradable') // Pedimos los nuevos campos
            .eq('user_id', userId);

        if (dbError) { ctx.response.status = 500; return; }
        if (!inventoryData) { ctx.response.body = []; return; }

        const cardDetailPromises = inventoryData.map(async (item) => {
            try {
                if (!item.card_id) return null;
                const res = await fetch(`https://api.pokemontcg.io/v2/cards/${item.card_id}`);
                if (!res.ok) return null;
                const cardDetails = await res.json();
                if (cardDetails && cardDetails.data) {
                    return { 
                        ...cardDetails.data, 
                        quantity: item.quantity,
                        is_favorite: item.is_favorite, // Pasamos los nuevos campos
                        is_tradable: item.is_tradable
                    };
                }
                return null;
            } catch { return null; }
        });

        const resolvedCards = await Promise.all(cardDetailPromises);
        ctx.response.body = resolvedCards.filter(card => card !== null);

    } catch (err) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
    }
});

router.post("/api/inventory/add", async (ctx) => {
    const userId = await getUserIdFromCookie(ctx);
    if (!userId) { ctx.response.status = 401; return; }
    const { cardId } = await ctx.request.body({ type: "json" }).value;
    if (!cardId) { ctx.response.status = 400; return; }
    const { data: existingCard } = await supabase.from('inventories').select('id, quantity').eq('user_id', userId).eq('card_id', cardId).single();
    if (existingCard) {
        await supabase.from('inventories').update({ quantity: existingCard.quantity + 1 }).eq('id', existingCard.id);
    } else {
        await supabase.from('inventories').insert({ user_id: userId, card_id: cardId, quantity: 1 });
    }
    ctx.response.body = { success: true };
});

router.post("/api/inventory/remove", async (ctx) => {
    const userId = await getUserIdFromCookie(ctx);
    if (!userId) { ctx.response.status = 401; return; }
    const { cardId } = await ctx.request.body({ type: "json" }).value;
    if (!cardId) { ctx.response.status = 400; return; }
    await supabase.from('inventories').delete().match({ user_id: userId, card_id: cardId });
    ctx.response.body = { success: true };
});

// NUEVO: Endpoint para actualizar cantidad
router.post("/api/inventory/update-quantity", async (ctx) => {
    const userId = await getUserIdFromCookie(ctx);
    if (!userId) { ctx.response.status = 401; return; }
    const { cardId, quantity } = await ctx.request.body({ type: "json" }).value;
    if (!cardId || typeof quantity !== 'number' || quantity < 1) { ctx.response.status = 400; return; }
    await supabase.from('inventories').update({ quantity }).match({ user_id: userId, card_id: cardId });
    ctx.response.body = { success: true };
});

// NUEVO: Endpoint para marcar/desmarcar favorito
router.post("/api/inventory/toggle-favorite", async (ctx) => {
    const userId = await getUserIdFromCookie(ctx);
    if (!userId) { ctx.response.status = 401; return; }
    const { cardId, isFavorite } = await ctx.request.body({ type: "json" }).value;
    if (!cardId || typeof isFavorite !== 'boolean') { ctx.response.status = 400; return; }
    await supabase.from('inventories').update({ is_favorite: isFavorite }).match({ user_id: userId, card_id: cardId });
    ctx.response.body = { success: true };
});

// NUEVO: Endpoint para marcar/desmarcar intercambiable
router.post("/api/inventory/toggle-tradable", async (ctx) => {
    const userId = await getUserIdFromCookie(ctx);
    if (!userId) { ctx.response.status = 401; return; }
    const { cardId, isTradable } = await ctx.request.body({ type: "json" }).value;
    if (!cardId || typeof isTradable !== 'boolean') { ctx.response.status = 400; return; }
    await supabase.from('inventories').update({ is_tradable: isTradable }).match({ user_id: userId, card_id: cardId });
    ctx.response.body = { success: true };
});


// --- Resto de Rutas (sin cambios) ---
router.get("/api/trade/list", async (ctx) => {
    const userId = await getUserIdFromCookie(ctx);
    if (!userId) { ctx.response.status = 401; return; }
    const { data } = await supabase.from('trade_wishes').select('card_id').eq('user_id', userId);
    ctx.response.body = data ? data.map(item => item.card_id) : [];
});

router.post("/api/trade/add", async (ctx) => {
    const userId = await getUserIdFromCookie(ctx);
    if (!userId) { ctx.response.status = 401; return; }
    const { cardId } = await ctx.request.body({ type: "json" }).value;
    if (!cardId) { ctx.response.status = 400; return; }
    await supabase.from('trade_wishes').insert({ user_id: userId, card_id: cardId });
    ctx.response.body = { success: true };
});

router.post("/api/decks/save", async (ctx) => {
  const userId = await getUserIdFromCookie(ctx);
  if (!userId) { ctx.response.status = 401; return; }
  const { name, cards } = await ctx.request.body({ type: "json" }).value;
  await supabase.from('decks').insert({ user_id: userId, name: name, cards: cards, total_cards: cards.length });
  ctx.response.body = { success: true };
});

router.get("/api/decks", async (ctx) => {
  const userId = await getUserIdFromCookie(ctx);
  if (!userId) { ctx.response.status = 401; return; }
  const { data } = await supabase.from('decks').select('*').eq('user_id', userId);
  ctx.response.body = data || [];
});

router.get("/api/decks/:name", async (ctx) => {
  const userId = await getUserIdFromCookie(ctx);
  if (!userId) { ctx.response.status = 401; return; }
  const name = ctx.params.name!;
  const { data } = await supabase.from('decks').select('*').eq('user_id', userId).eq('name', name).single();
  ctx.response.body = data;
});

router.delete("/api/decks/:name", async (ctx) => {
  const userId = await getUserIdFromCookie(ctx);
  if (!userId) { ctx.response.status = 401; return; }
  const name = ctx.params.name!;
  await supabase.from('decks').delete().match({ user_id: userId, name: name });
  ctx.response.body = { success: true };
});

router.get("/card/:id", async (ctx) => {
    const cardId = ctx.params.id;
    const apiUrl = `https://api.pokemontcg.io/v2/cards/${cardId}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        ctx.response.headers.set("Content-Type", "application/json");
        ctx.response.body = data;
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Error al obtener la carta" };
    }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("🚀 Servidor corriendo en http://localhost:8000");
await app.listen({ port: 8000 });