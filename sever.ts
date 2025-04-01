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

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Servidor corriendo en http://localhost:8000");
await app.listen({ port: 8000 });