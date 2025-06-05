async function buscarCarta() {
  const cardName = document.getElementById("cardId").value.trim();
  const setId = document.getElementById("setSelect")?.value || "";
  const supertype = document.getElementById("supertypeSelect")?.value || "";
  const type = document.getElementById("typeSelect")?.value || "";
  const subtype= document.getElementById("subtypeSelect")?.value || "";
  const rarity = document.getElementById("raritySelect")?.value || "";

  
  if (!cardName && !setId && !supertype && !subtype && !type && !rarity) return;

  const div = document.getElementById("resultado");
  div.innerHTML = "<p>🔎 Buscando cartas...</p>";

  try {
    // Construir query para la API
    let query = [];
    if (cardName) query.push(`name:${cardName}`);
    if (setId) query.push(`set.id:${setId}`);
    if (supertype) query.push(`supertype:${supertype}`);
    if (subtype) query.push(`subtypes:${subtype}`);
    if (type) query.push(`types:${type}`);
    if (rarity) query.push(`rarity:${rarity}`);
    const q = query.join(" ");

    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}`);
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
          <button id="add-${carta.id}" class="btn btn-success mt-2" onclick="agregarAlInventario('${carta.id}')">
            ➕ Agregar al Inventario
          </button>
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
async function agregarAlInventario(cardId) {
  try {
    const res = await fetch("/api/inventory/add", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId })
    });

    const data = await res.json();

    if (data.success) {
      const boton = document.getElementById(`add-${cardId}`);
      if (boton) {
        boton.textContent = "Agregado ✅";
        boton.classList.remove('btn-success');
        boton.classList.add('btn-secondary');
        boton.disabled = true;
      }
      showToast("✅ Carta agregada al inventario.");
    } else {
      showToast("❌ Error al agregar: " + data.message);
    }
  } catch (error) {
    console.error("Error al agregar carta:", error);
    showToast("⚠️ Error de conexión.");
  }
}
function mostrarToast(mensaje, success = true) {
  const toastRoot = document.getElementById("toast-root");
  if (!toastRoot) return;

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white ${success ? 'bg-success' : 'bg-danger'} border-0 m-2`;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${mensaje}</div>
    </div>
  `;

  toastRoot.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}