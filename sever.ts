import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

router.get("/", async (ctx) => {
    await send(ctx, "index.html", { root: `${Deno.cwd()}/public` });
});

router.get("/login", async (ctx) => {
    await send(ctx, "login.html", { root: `${Deno.cwd()}/public` });
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Servidor corriendo en http://localhost:8000");
await app.listen({ port: 8000 });