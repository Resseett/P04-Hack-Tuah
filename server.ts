import { Application, Router, send } from "https://deno.land/x/oak@v12.6.1/mod.ts";

import { setCookie, getCookies } from "https://deno.land/std/http/cookie.ts";

import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";


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

router.get("/signup", async (ctx) => {
    await send(ctx, "public/signup.html", { root: Deno.cwd() });
  });

router.get("/pokedex", async (ctx) => {
    await send(ctx, "public/pokedex.html", { root: Deno.cwd() });
});

router.get("/scan", async (ctx) => {
    await send(ctx, "public/scan.html", { root: Deno.cwd() });
  });

// Ruta para registrar un nuevo usuario
router.post("/api/signup", async (ctx) => {
    try {
      const body = ctx.request.body({ type: "json" });
      const data = await body.value;
  
      const { username, password } = data;
  
      if (!username || !password) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "Usuario y contraseña requeridos." };
        return;
      }
  
      // ❌ Verificar que no tenga espacios
      if (/\s/.test(username)) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, message: "El nombre de usuario no puede contener espacios." };
        return;
      }
  
      // ❌ Verificar si ya existe (case insensitive)
      const exists = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        ctx.response.status = 409;
        ctx.response.body = { success: false, message: "Usuario ya registrado." };
        return;
      }
  
      // ✅ Cifrar la contraseña
      const hashedPassword = await bcrypt.hash(password);
  
      users.push({ username, password: hashedPassword });
      await Deno.writeTextFile("users.json", JSON.stringify(users, null, 2));
  
      ctx.response.status = 201;
      ctx.response.body = { success: true, message: "Usuario registrado exitosamente." };
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      ctx.response.status = 500;
      ctx.response.body = { success: false, message: "Error en el servidor." };
    }
  });
  
  

// /api/login con cookies

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

        const user = users.find((u: any) => u.username === username);

        if (user) {
            // ✅ Comparar contraseña cifrada con bcrypt
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
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
                console.log("❌ Contraseña incorrecta");
                ctx.response.status = 401;
                ctx.response.body = { success: false, message: "Credenciales incorrectas" };
            }
        } else {
            console.log("❌ Usuario no encontrado");
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