async function buscarCarta() {
  const setId = document.getElementById("cardId").value.trim().toLowerCase();
  if (!setId) return;

  const div = document.getElementById("resultado");
  div.innerHTML = ""; // Limpiar resultados anteriores

  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}`);
    const data = await res.json();

    if (data?.data?.length > 0) {
      data.data.forEach(carta => {
        const cartaDiv = document.createElement("div");
        cartaDiv.className = "carta";

        cartaDiv.innerHTML = `
          <h3>${carta.name}</h3>
          <img src="${carta.images.large}" alt="${carta.name}" />
          <p><strong>Tipo:</strong> ${carta.types?.join(", ") || "Desconocido"}</p>
        `;

        div.appendChild(cartaDiv);
      });
    } else {
      div.innerHTML = "<p>❌ No se encontraron cartas para ese set.</p>";
    }
  } catch (error) {
    console.error("Error al buscar cartas:", error);
    div.innerHTML = "<p>⚠️ Hubo un error al cargar las cartas.</p>";
  }
}