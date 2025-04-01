export function add(a: number, b: number): number {
  return a + b;
}

if (import.meta.main) {
  console.log("Add 2 + 3 =", add(2, 3));

  const cardId = "xy7-54";
  console.log(`Buscando carta con ID: ${cardId}...`);

  try {
    const url = `https://api.pokemontcg.io/v2/cards/${cardId}`;
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": "", // Podés dejarlo vacío, o agregar tu API key si tenés una.
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Carta obtenida sin SDK:");
    console.log(data);
  } catch (error) {
    console.error("❌ Error al obtener la carta:", error);
  }
}