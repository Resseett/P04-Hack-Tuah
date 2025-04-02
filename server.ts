import { Application, Router, send } from "https://deno.land/x/oak@v12.6.1/mod.ts";

import { setCookie, getCookies } from "https://deno.land/std/http/cookie.ts";

// Cargar usuarios desde JSON
const users = JSON.parse(await Deno.readTextFile("users.json"));
console.log("Usuarios cargados:", users);

const app = new Application();
const router = new Router();

// Servir archivos estáticos
router.get("/components/:file", async (ctx) => {
    await send(ctx, `public/components/${ctx.params.file}`, { root: Deno.cwd() });
});

router.get("/js/:file", async (ctx) => {
    await send(ctx, `public/js/${ctx.params.file}`, { root: Deno.cwd() });
});

router.get("/", async (ctx) => {
    await send(ctx, "public/index.html", { root: Deno.cwd() });
});

router.get("/login", async (ctx) => {
    await send(ctx, "public/login.html", { root: Deno.cwd() });
});

router.get("/pokedex", async (ctx) => {
    await send(ctx, "public/pokedex.html", { root: Deno.cwd() });
});

// Actualización de la ruta /api/login con cookies
router.post("/api/login", async (ctx) => {
    try {
        console.log("Recibiendo petición de login...");

        if (!ctx.request.hasBody) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, message: "Cuerpo vacío en la solicitud" };
            return;
        }

        const body = ctx.request.body({ type: "json" });
        const data = await body.value;

        console.log("Datos recibidos:", data);

        const { username, password } = data;
        const user = users.find((u: any) => u.username === username && u.password === password);

        if (user) {
            console.log(`✅ Usuario ${username} autenticado`);

            // 🔥 Agregar cookie para sesión
            setCookie(ctx.response.headers, {
                name: "loggedInUser",
                value: username,
                httpOnly: true,
                maxAge: 60 * 60 * 24, // 1 día
            });

            ctx.response.status = 200;
            ctx.response.body = { success: true };
        } else {
            console.log("❌ Credenciales incorrectas");
            ctx.response.status = 401;
            ctx.response.body = { success: false, message: "Credenciales incorrectas" };
        }
    } catch (error) {
        console.error("🚨 Error en el login:", error);
        ctx.response.status = 500;
        ctx.response.body = { success: false, message: "Error en el servidor" };
    }
});

// Ruta para verificar sesión
router.get("/api/session", async (ctx) => {
    const cookies = getCookies(ctx.request.headers);
    ctx.response.body = { loggedInUser: cookies.loggedInUser || null };
});

// Ruta para cerrar sesión
router.post("/api/logout", async (ctx) => {
    console.log("Cerrando sesión...");

    // Eliminar la cookie de sesión
    setCookie(ctx.response.headers, {
        name: "loggedInUser",
        value: "",  // Borrar valor
        maxAge: 0,  // Establecer maxAge a 0 para eliminar la cookie
    });

    ctx.response.status = 200;
    ctx.response.body = { success: true };
});


app.use(router.routes());
app.use(router.allowedMethods());

console.log("🚀 Servidor corriendo en http://localhost:8000");
await app.listen({ port: 8000 });
