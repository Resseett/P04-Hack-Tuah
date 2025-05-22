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

// filepath: c:\Users\manue\OneDrive\Documentos\GitHub\P04-Hack-Tuah\public\js\inventory.js
async function renderInventory() {
    const container = document.getElementById("inventoryContainer");
    container.innerHTML = "Cargando...";

    const cards = await fetchInventory();
    container.innerHTML = "";

    if (cards.length === 0) {
        container.innerHTML = "<p>No tienes cartas en tu inventario.</p>";
        return;
    }

    for (const card of cards) {
        let cardDetails = null;
        try {
            cardDetails = await fetchCardDetails(card.id);
        } catch (err) {
            cardDetails = null;
        }

        // Si la API externa falla, usar los datos locales
        const name     = cardDetails?.name    || card.name;
        const image    = cardDetails?.images?.small || card.image;
        const setName  = cardDetails?.set?.name || 'Desconocido';        
        const setId    = cardDetails?.set?.id   || '';
        const types    = cardDetails?.types?.join(', ') || 'Desconocido'; 
        const rarity   = cardDetails?.rarity     || 'Desconocida';       
        const quantity = card.quantity || 1;

        const cardHTML = `
            <div class="col inventory-card-col">
                <div class="card h-100 inventory-card">
                    <img src="${image}" class="card-img-top" alt="${name}">
                    <div class="card-body">
                        <h5 class="card-title">${name}</h5>
                        <p class="card-text">ID: ${card.id}</p>
                        <p class="card-text"><strong>Set:</strong> ${setName} (${setId})</p>           
                        <p class="card-text"><strong>Tipo:</strong> ${types}</p>                
                        <p class="card-text"><strong>Rareza:</strong> ${rarity}</p>            
                        <div class="d-flex align-items-center …">
                            <input type="number" id="quantity-${card.id}" class="form-control me-2" value="${quantity}" min="1">
                            <button class="btn btn-primary" onclick="saveQuantity(${card.id})">Guardar</button>
                            <span id="savedMsg-${card.id}" class="text-success ms-2" style="display: none;">Guardado</span>
                            <button id="detailBtn-${card.id}" class="btn btn-primary ms-2">
                                Ver Detalles
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
        document.getElementById(`detailBtn-${card.id}`).addEventListener('click', () => showCardDetails(cardDetails || card)
        );        
        

    }

    // Permitir guardar con Enter y feedback visual
    cards.forEach(card => {
        const input = document.getElementById(`quantity-${card.id}`);
        if (input) {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    saveQuantity(card.id);
                }
            });
        }
        
    });
}

function showCardDetails(info) {
  // 1) Construir el contenido
  const body = document.getElementById('detalleCartaBody');
  body.innerHTML = `
    <div class="row">
      <div class="col-md-4">
        <img
          src="${info.images?.large || info.image}"
          alt="${info.name}"
          class="img-fluid"
        >
      </div>
      <div class="col-md-8">
        <h5>${info.name}</h5>
        <p><strong>Set:</strong> ${info.set?.name || '—'} (${info.set?.id || '—'})</p>
        <p><strong>Tipo:</strong> ${info.types?.join(', ') || '—'}</p>
        <p><strong>Rareza:</strong> ${info.rarity || '—'}</p>
      </div>
    </div>
  `;

  // 2) Abrir el modal con Bootstrap
  new bootstrap.Modal(
    document.getElementById('detalleCartaModal')
  ).show();
}


document.addEventListener("DOMContentLoaded", renderInventory);



async function saveQuantity(cardId) {
    const quantityInput = document.getElementById(`quantity-${cardId}`);
    const quantity = parseInt(quantityInput.value, 10);

    if (isNaN(quantity) || quantity < 1) {
        quantityInput.classList.add("is-invalid");
        setTimeout(() => quantityInput.classList.remove("is-invalid"), 1200);
        return;
    }

    try {
        const res = await fetch("/api/inventory/update", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId, quantity }),
        });

        const data = await res.json();
        const savedMsg = document.getElementById(`savedMsg-${cardId}`);
        if (data.success) {
            if (savedMsg) {
                savedMsg.style.display = "inline";
                setTimeout(() => savedMsg.style.display = "none", 1200);
            }
        } else {
            quantityInput.classList.add("is-invalid");
            setTimeout(() => quantityInput.classList.remove("is-invalid"), 1200);
        }
    } catch (err) {
        quantityInput.classList.add("is-invalid");
        setTimeout(() => quantityInput.classList.remove("is-invalid"), 1200);
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
        showToast("Carta añadida con éxito");
        document.getElementById("cardIdInput").value = "";
        renderInventory();
    } else {
        showToast("Error: " + data.message);
    }
});

function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-bg-${type === "success" ? "success" : "danger"} border-0 show`;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.zIndex = "9999";
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toast);
  
    setTimeout(() => {
        toast.remove();
    }, 3000);
  }

document.addEventListener("DOMContentLoaded", () => {
    renderInventory();
});