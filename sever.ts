import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

// Define rutas básicas
router
  .get("/", async (context) => {
    await send(context, "index.html", {
      root: `${Deno.cwd()}`,
    });
  });

app.use(router.routes());
app.use(router.allowedMethods());

// Inicia el servidor
console.log("Servidor corriendo en http://localhost:8000");
await app.listen({ port: 8000 });