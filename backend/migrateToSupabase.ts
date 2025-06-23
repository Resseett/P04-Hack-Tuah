import { createClient } from "supabase";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

// --- Configuración ---
const SUPABASE_URL = "https://qwmhfihybrewljgwxhzn.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bWhmaWh5YnJld2xqZ3d4aHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDcwMjIzNywiZXhwIjoyMDY2Mjc4MjM3fQ.MHUeYjtWjHagGEPJKcPxLTyqcBmBzUtdsxW7dNveWkQ"; 
const TEMP_PASSWORD = "password123";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log("🚀 Iniciando migración a Supabase con permisos de administrador...");

async function migrate() {
  try {
    // --- Limpiar datos antiguos para que el script sea re-ejecutable ---
    console.log("🧹 Limpiando datos antiguos de las tablas públicas...");
    await supabase.from('decks').delete().neq('id', -1); // Limpiar decks
    await supabase.from('inventories').delete().neq('id', -1);
    await supabase.from('trade_wishes').delete().neq('id', -1);
    await supabase.from('users').delete().neq('username', 'nonexistentuser');
    console.log("✅ Tablas públicas limpiadas. Procediendo con la migración...");

    // 1. Cargar datos de usuarios desde los archivos JSON
    const inventoriesData = JSON.parse(await Deno.readTextFile("./backend/inventories.json"));
    const tradeWishesData = JSON.parse(await Deno.readTextFile("./backend/trade_wishlist.json"));

    // 2. Obtener una lista única de todos los nombres de usuario
    const allUsernames = [...new Set([
        ...Object.keys(inventoriesData), 
        ...Object.keys(tradeWishesData)
    ])];

    console.log(`👥 Encontrados ${allUsernames.length} usuarios únicos para migrar.`);

    // 3. Iterar y migrar cada usuario y sus datos asociados
    for (const username of allUsernames) {
      console.log(`\n--- Migrando usuario: ${username} ---`);
      const email = `${username}@example.com`;
      let userId: string | undefined;

      // A. Crear o encontrar usuario en Auth
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: TEMP_PASSWORD,
        email_confirm: true,
      });

      if (createError) {
        if (createError.message.includes('A user with this email address has already been registered')) {
          console.warn(`⚠️ Usuario ${username} ya existe en Auth. Obteniendo su ID...`);
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
          if (listError || !listData) {
            console.error(`❌ No se pudo listar los usuarios existentes.`, listError?.message);
            continue;
          }
          const foundUser = listData.users.find(u => u.email === email);
          if (!foundUser) {
            console.error(`❌ No se pudo encontrar el ID del usuario existente ${username}.`);
            continue;
          }
          userId = foundUser.id;
          console.log(`🆔 ID de usuario existente obtenido.`);
        } else {
          console.error(`❌ Error al crear usuario ${username}:`, createError.message);
          continue;
        }
      } else {
        userId = createData.user.id;
        console.log(`✅ Usuario de autenticación creado.`);
      }

      if (!userId) {
        console.error(`❌ Fallo crítico: no se pudo obtener el ID para ${username}.`);
        continue;
      }

      // B. Insertar perfil en tabla 'users'
      await supabase.from("users").upsert({ id: userId, username: username });
      console.log(`👤 Perfil para ${username} asegurado.`);

      // C. Migrar inventario
      if (inventoriesData[username] && inventoriesData[username].length > 0) {
        const inventoryToInsert = inventoriesData[username]
          .filter((card: any) => card && typeof card.id === 'string' && card.id.trim() !== '')
          .map((card: { id: string, quantity: number }) => ({
            user_id: userId,
            card_id: card.id,
            quantity: card.quantity || 1,
          }));
        if (inventoryToInsert.length > 0) {
          await supabase.from("inventories").insert(inventoryToInsert);
          console.log(`📦 Inventario de ${username} migrado.`);
        }
      }

      // D. Migrar lista de deseos
      if (tradeWishesData[username] && tradeWishesData[username].length > 0) {
        const wishesToInsert = tradeWishesData[username]
          .filter((cardId: any) => typeof cardId === 'string' && cardId.trim() !== '')
          .map((cardId: string) => ({ user_id: userId, card_id: cardId }));
        if (wishesToInsert.length > 0) {
          await supabase.from("trade_wishes").insert(wishesToInsert);
          console.log(`❤️ Lista de deseos de ${username} migrada.`);
        }
      }
    }

    // --- NUEVO: E. Migrar Mazos (Decks) ---
    console.log("\n--- 🃏 Migrando Mazos (Decks) ---");
    const deckOwnerUsername = "cris"; // <-- CAMBIA ESTO si quieres asignar los mazos a otro usuario
    const decksDirPath = join(Deno.cwd(), "backend", "data");

    try {
      const { data: ownerData, error: ownerError } = await supabase.from('users').select('id').eq('username', deckOwnerUsername).single();
      if (ownerError || !ownerData) {
        throw new Error(`No se pudo encontrar al usuario '${deckOwnerUsername}' para asignarle los mazos.`);
      }
      const ownerId = ownerData.id;
      console.log(`ℹ️ Todos los mazos se asignarán al usuario: ${deckOwnerUsername} (ID: ${ownerId})`);

      const decksToInsert = [];
      for await (const dirEntry of Deno.readDir(decksDirPath)) {
        if (dirEntry.isFile && dirEntry.name.startsWith("decks_") && dirEntry.name.endsWith(".json")) {
          const deckName = dirEntry.name.replace("decks_", "").replace(".json", "");
          const filePath = join(decksDirPath, dirEntry.name);
          const fileContent = await Deno.readTextFile(filePath);
          const deckCards = JSON.parse(fileContent);

          decksToInsert.push({
            user_id: ownerId,
            name: deckName,
            cards: deckCards,
            total_cards: deckCards.length,
          });
          console.log(`  - Mazo encontrado: '${deckName}'`);
        }
      }

      if (decksToInsert.length > 0) {
        const { error: deckError } = await supabase.from('decks').insert(decksToInsert);
        if (deckError) {
          console.error("❌ Error al insertar los mazos:", deckError.message);
        } else {
          console.log(`✅ ${decksToInsert.length} mazos migrados exitosamente.`);
        }
      } else {
        console.log("ℹ️ No se encontraron archivos de mazos para migrar.");
      }
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        console.warn(`⚠️ No se encontró el directorio de mazos en '${decksDirPath}'. Saltando migración de mazos.`);
      } else {
        console.error("❌ Error durante la migración de mazos:", err.message);
      }
    }

    console.log("\n🎉 ¡Migración completada!");
    console.log("🔒 Recuerda volver a activar Row Level Security (RLS) en tus tablas de Supabase.");

  } catch (err) {
    console.error("\n💥 Ha ocurrido un error fatal durante la migración:", err);
  }
}

await migrate();