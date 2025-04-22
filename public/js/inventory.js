async function fetchInventory() {
    const res = await fetch("/api/inventory", { credentials: "include" });
    const data = await res.json();
    if (data.success) return data.cards;
    return [];
  }
  
  async function fetchCardDetails(id) {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`);
    const data = await res.json();
    return data.data; // card data
  }
  
  async function renderInventory() {
    const container = document.getElementById("inventoryContainer");
    container.innerHTML = "Cargando...";
  
    const cardIds = await fetchInventory();
    container.innerHTML = "";
  
    if (cardIds.length === 0) {
      container.innerHTML = "<p>No tienes cartas en tu inventario.</p>";
      return;
    }
  
    for (const id of cardIds) {
      try {
        const card = await fetchCardDetails(id);
        const cardHTML = `
          <div class="col">
            <div class="card h-100">
              <img src="${card.images.small}" class="card-img-top" alt="${card.name}">
              <div class="card-body">
                <h5 class="card-title">${card.name}</h5>
                <p class="card-text">ID: ${card.id}</p>
                <p class="card-text">Tipo: ${card.supertype}</p>
              </div>
            </div>
          </div>
        `;
        container.innerHTML += cardHTML;
      } catch (err) {
        console.error("Error al cargar carta:", id, err);
      }
    }
  }
  
  document.getElementById("addCardBtn").addEventListener("click", async () => {
    const cardId = document.getElementById("cardIdInput").value.trim();
    if (!cardId) return alert("Ingresa un ID de carta");
  
    const res = await fetch("/api/inventory/add", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId })
    });
  
    const data = await res.json();
    if (data.success) {
      alert("Carta añadida con éxito");
      document.getElementById("cardIdInput").value = "";
      renderInventory();
    } else {
      alert("Error: " + data.message);
    }
  });
  
  document.addEventListener("DOMContentLoaded", () => {
    renderInventory();
  });
  