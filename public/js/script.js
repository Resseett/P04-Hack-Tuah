async function buscarCarta() {
  const cardName = document.getElementById("cardId").value.trim();
  if (!cardName) return;

  const div = document.getElementById("resultado");
  div.innerHTML = "<p>🔎 Buscando cartas...</p>";

  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:${cardName}`);
    const data = await res.json();

    if (data?.data?.length > 0) {
      div.innerHTML = ""; // Limpiar resultados previos

      data.data.forEach(carta => {
        const cartaDiv = document.createElement("div");
        cartaDiv.className = "carta";

        const precio = carta.tcgplayer?.prices?.normal?.market
          ? `$${carta.tcgplayer.prices.normal.market.toFixed(2)}`
          : "No disponible";

        cartaDiv.innerHTML = `
          <h3>${carta.name}</h3>
          <img src="${carta.images.large}" alt="${carta.name}" />
          <p><strong>Tipo:</strong> ${carta.types?.join(", ") || "Desconocido"}</p>
          <p><strong>Precio:</strong> ${precio}</p>
        `;

        div.appendChild(cartaDiv);
      });
    } else {
      div.innerHTML = "<p>❌ No se encontraron cartas con ese nombre.</p>";
    }
  } catch (error) {
    console.error("Error al buscar carta:", error);
    div.innerHTML = "<p>⚠️ Hubo un error al cargar las cartas.</p>";
  }
}