import { Application, Router, send } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { setCookie, getCookies } from "https://deno.land/std@0.224.0/http/cookie.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";


// Cargar usuarios desde JSON
const users = JSON.parse(await Deno.readTextFile("backend/users.json"));
console.log("Usuarios cargados:", users);

let tradeWishes = {};
try {
  tradeWishes = JSON.parse(await Deno.readTextFile("backend/trade_wishlist.json"));
} catch {
  tradeWishes = {};
}

async function saveTradeWishes() {
  await Deno.writeTextFile("backend/trade_wishlist.json", JSON.stringify(tradeWishes, null, 2));
}

const app = new Application();
const router = new Router();

// Servir archivos estáticos
router.get("/components/:file", async (ctx) => {
    await send(ctx, `frontend/components/${ctx.params.file}`, { root: Deno.cwd() });
});

router.get("/js/:file", async (ctx) => {
    await send(ctx, `frontend/js/${ctx.params.file}`, { root: Deno.cwd() });
});

router.get("/", async (ctx) => {
    await send(ctx, "frontend/index.html", { root: Deno.cwd() });
});

router.get("/login", async (ctx) => {
    await send(ctx, "frontend/login.html", { root: Deno.cwd() });
});

router.get("/signup", async (ctx) => {
    await send(ctx, "frontend/signup.html", { root: Deno.cwd() });
});

router.get("/pokedex", async (ctx) => {
    await send(ctx, "frontend/pokedex.html", { root: Deno.cwd() });
});

router.get("/scan", async (ctx) => {
    await send(ctx, "frontend/scan.html", { root: Deno.cwd() });
});

router.get("/inventory", async (ctx) => {
    await send(ctx, "frontend/inventory.html", { root: Deno.cwd() });
});

router.get("/trade", async (ctx) => {
  await send(ctx, "frontend/trade.html", { root: Deno.cwd() });
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
      await Deno.writeTextFile("backend/users.json", JSON.stringify(users, null, 2));
  
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
                    sameSite: "Lax", // Permitir navegación entre páginas del mismo dominio
                    secure: false, // Cambiar a true si usas HTTPS
                    maxAge: 60 * 60 * 24 * 7, // 7 días
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
router.post("/api/inventory/update", async (ctx) => {
  try {
    const { cardId, quantity } = await ctx.request.body({ type: "json" }).value;

    console.log("Actualizando inventario:", { cardId, quantity, type: typeof quantity });

    if (!cardId || typeof quantity !== "number" || quantity < 1) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Datos inválidos." };
      return;
    }

    const cookies = getCookies(ctx.request.headers);
    const username = cookies.loggedInUser;

    if (!username || !inventories[username]) {
      ctx.response.status = 401;
      ctx.response.body = { success: false, message: "Usuario no autenticado." };
      return;
    }

    // Buscar la carta y actualizar la cantidad directamente
    let updated = false;
    for (const card of inventories[username]) {
      if (typeof card === "object" && card !== null && String(card.id) === String(cardId)) {
        console.log("Actualizando carta:", card.id, "de", card.quantity, "a", quantity);
        card.quantity = quantity;
        updated = true;
        break;
      }
    }

    if (!updated) {
      console.log("Carta no encontrada:", cardId, "en inventario de", username);
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Carta no encontrada en el inventario." };
      return;
    }

    await saveInventories();
    console.log("Inventario guardado correctamente.");

    ctx.response.body = { success: true };
  } catch (err) {
    console.error("Error al actualizar el inventario:", err);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Error interno del servidor." };
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

let inventories = {};
try {
  inventories = JSON.parse(await Deno.readTextFile("backend/inventories.json"));
} catch {
  inventories = {};
}

// Guardar inventarios en disco
async function saveInventories() {
  try {
    await Deno.writeTextFile("backend/inventories.json", JSON.stringify(inventories, null, 2));
    console.log("Inventario guardado correctamente.");
  } catch (err) {
    console.error("Error al guardar el inventario:", err);
  }
}

// Ruta para obtener inventario del usuario current
router.get("/api/inventory", async (ctx) => {
  const cookies = getCookies(ctx.request.headers);
  const username = cookies.loggedInUser;

  if (!username) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No autenticado." };
    return;
  }

  // Normalizar inventario: asegurar que cada carta tenga al menos id y quantity
  const userInventory = (inventories[username] || []).map((card: any) => {
    if (typeof card === "string") {
      return { id: card, quantity: 1 };
    }
    // Si no tiene quantity, poner 1 por defecto
    return { ...card, quantity: card.quantity ?? 1 };
  });

  ctx.response.body = { success: true, cards: userInventory };
});

router.get("/api/inventory/list", async (ctx) => {
  const cookies = getCookies(ctx.request.headers);
  const username = cookies.loggedInUser;

  if (!username) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No autenticado." };
    return;
  }

  const userInventory = inventories[username] || [];

  ctx.response.body = {
    success: true,
    inventory: userInventory,
  };
});

// Ruta para agregar carta al inventario
router.post("/api/inventory/add", async (ctx) => {
  const cookies = getCookies(ctx.request.headers);
  const username = cookies.loggedInUser;

  if (!username) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No autenticado." };
    return;
  }

  const body = ctx.request.body({ type: "json" });
  const { cardId } = await body.value;

  if (!cardId) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "ID de carta requerido." };
    return;
  }

  if (!inventories[username]) inventories[username] = [];

  // 🔥 Consultar la API de Pokémon TCG para obtener datos reales
  try {
    const response = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
    const data = await response.json();
    const cardData = data.data;

    if (!cardData) {
      ctx.response.status = 404;
      ctx.response.body = { success: false, message: "Carta no encontrada en la API." };
      return;
    }

    // Verificar si ya existe la carta
    const existingCard = inventories[username].find((card) => card.id === cardId);

    if (existingCard) {
      // Si ya existe, aumentar la cantidad
      existingCard.quantity += 1;
    } else {
      // Agregar la carta nueva con datos reales
      inventories[username].push({
        id: cardData.id,
        name: cardData.name,
        image: cardData.images?.large || cardData.images?.small || "",
        types: cardData.types || ["Desconocido"],
        price: cardData.tcgplayer?.prices?.normal?.market || "No disponible",
        quantity: 1,
      });
    }

    // Guardar cambios en inventories.json
    await saveInventories();

    ctx.response.body = { success: true, message: "Carta añadida al inventario." };

  } catch (error) {
    console.error("Error al consultar la API de Pokémon:", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Error al consultar la API." };
  }
});

// Ruta para eliminar carta del inventario
router.post("/api/inventory/remove", async (ctx) => {
  const cookies = getCookies(ctx.request.headers);
  const username = cookies.loggedInUser;

  if (!username) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No autenticado." };
    return;
  }

  const body = ctx.request.body({ type: "json" });
  const { cardId } = await body.value;

  if (!cardId) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "ID de carta requerido." };
    return;
  }

  if (!inventories[username]) inventories[username] = [];

  // Eliminar la carta del inventario
  const prevLength = inventories[username].length;
  inventories[username] = inventories[username].filter((card: any) => card.id !== cardId);

  if (inventories[username].length === prevLength) {
    ctx.response.status = 404;
    ctx.response.body = { success: false, message: "Carta no encontrada en el inventario." };
    return;
  }

  // Guardar el inventario actualizado en el archivo JSON
  await saveInventories();

  ctx.response.body = { success: true, message: "Carta eliminada del inventario." };
});


// Agregar carta deseada
router.post("/api/trade/add", async (ctx) => {
  const cookies = getCookies(ctx.request.headers);
  const username = cookies.loggedInUser;

  if (!username) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No autenticado" };
    return;
  }

  const { cardId } = await ctx.request.body({ type: "json" }).value;
  if (!cardId) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "ID de carta requerido" };
    return;
  }

  if (!tradeWishes[username]) tradeWishes[username] = [];

  if (!tradeWishes[username].includes(cardId)) {
    tradeWishes[username].push(cardId);
    await saveTradeWishes();
  }

  ctx.response.body = { success: true, message: "Carta añadida a la lista de intercambio" };
});

// Obtener cartas deseadas
router.get("/api/trade/list", async (ctx) => {
  const cookies = getCookies(ctx.request.headers);
  const username = cookies.loggedInUser;

  if (!username) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No autenticado" };
    return;
  }

  const wishes = tradeWishes[username] || [];
  ctx.response.body = { success: true, cards: wishes };
});


router.post("/api/inventory/toggle-trade", async (ctx) => {
  const cookies = getCookies(ctx.request.headers);
  const username = cookies.loggedInUser;

  if (!username) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No autenticado" };
    return;
  }

  const { cardId } = await ctx.request.body({ type: "json" }).value;
  if (!cardId) {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "ID de carta requerido" };
    return;
  }

  const userInventory = inventories[username] || [];

  const card = userInventory.find((c: any) => c.id === cardId);
  if (!card) {
    ctx.response.status = 404;
    ctx.response.body = { success: false, message: "Carta no encontrada" };
    return;
  }

  card.trade = !card.trade; // Toggle estado

  await saveInventories();
  ctx.response.body = { success: true, trade: card.trade };
});


router.post("/api/inventory/tradable", async (ctx) => {
  const cookies = getCookies(ctx.request.headers);
  const username = cookies.loggedInUser;

  if (!username) {
    ctx.response.status = 401;
    ctx.response.body = { success: false, message: "No autenticado." };
    return;
  }

  const { cardId, tradable } = await ctx.request.body({ type: "json" }).value;

  if (!cardId || typeof tradable !== "boolean") {
    ctx.response.status = 400;
    ctx.response.body = { success: false, message: "Datos inválidos." };
    return;
  }

  const userInventory = inventories[username];
  if (!userInventory) {
    ctx.response.status = 404;
    ctx.response.body = { success: false, message: "Inventario no encontrado." };
    return;
  }

  const card = userInventory.find((c) => c.id === cardId);
  if (!card) {
    ctx.response.status = 404;
    ctx.response.body = { success: false, message: "Carta no encontrada." };
    return;
  }

  card.isTradable = tradable;
  await saveInventories();

  ctx.response.body = { success: true };
});


app.use(router.routes());
app.use(router.allowedMethods());

console.log("🚀 Servidor corriendo en http://localhost:8000");
await app.listen({ port: 8000 });