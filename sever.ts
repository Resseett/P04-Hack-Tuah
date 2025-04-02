import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

// Servir archivos estáticos
router.get("/components/:file", async (ctx) => {
    const file = ctx.params.file;
    await send(ctx, `components/${file}`, { root: `${Deno.cwd()}/public` });
});

router.get("/js/:file", async (ctx) => {
    const file = ctx.params.file;
    await send(ctx, `js/${file}`, { root: `${Deno.cwd()}/public` });
});

// Rutas existentes
router.get("/", async (ctx) => {
    await send(ctx, "index.html", { root: `${Deno.cwd()}/public` });
});

router.get("/login", async (ctx) => {
    await send(ctx, "login.html", { root: `${Deno.cwd()}/public` });
});

router.get("/pokedex", async (ctx) => {
    await send(ctx, "pokedex.html", { root: `${Deno.cwd()}/public` });
});

// Ruta para obtener cartas por ID desde la API externa
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

console.log("Servidor corriendo en http://localhost:8000");
await app.listen({ port: 8000 });