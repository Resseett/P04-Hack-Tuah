// Variable global para almacenar las cartas del inventario
let currentInventoryCards = [];

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

// Función para ordenar el inventario
function ordenarInventario(criteria) {
    if (currentInventoryCards.length === 0) return;

    let sortedCards = [...currentInventoryCards];

    switch (criteria) {
        case 'name':
            sortedCards.sort((a, b) => {
                const nameA = (a.cardDetails?.name || a.name || '').toLowerCase();
                const nameB = (b.cardDetails?.name || b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;
        
        case 'rarity':
          const rarityOrder = {
            // Básicas
            'Common'                       :  1,
            'Uncommon'                     :  2,
            'Classic Collection'           :  3,
            'Promo'                        :  4,

            // Raras «simples»
            'Rare'                         : 10,
            'Radiant Rare'                 : 11,
            'Amazing Rare'                 : 12,
            'LEGEND'                       : 13,

            // Holo y derivados
            'Rare Holo'                    : 20,
            'Trainer Gallery Rare Holo'    : 21,
            'Rare Holo EX'                 : 22,
            'Rare Holo GX'                 : 23,
            'Rare Holo LVX'                : 24,
            'Rare Holo Star'               : 25,
            'Rare Holo V'                  : 26,
            'Rare Holo VMAX'               : 27,
            'Rare Holo VSTAR'              : 28,

            // Otras rarezas de la era BW-XY
            'Rare Prime'                   : 30,
            'Rare BREAK'                   : 31,
            'Rare Prism Star'              : 32,
            'Rare Shining'                 : 33,
            'Rare ACE'                     : 34,
            'ACE SPEC Rare'                : 35,

            // Brillantes y shinies
            'Rare Shiny'                   : 40,
            'Rare Shiny GX'                : 41,
            'Shiny Rare'                   : 42,
            'Shiny Ultra Rare'             : 43,

            // Sistema Scarlet & Violet
            'Double Rare'                  : 50,
            'Illustration Rare'            : 60,
            'Special Illustration Rare'    : 70,
            'Ultra Rare'                   : 80,
            'Rare Ultra'                   : 81,   // (etiqueta antigua equivalente)
            'Hyper Rare'                   : 90,

            // Final de tabla
            'Rare Rainbow'                 : 95,
            'Rare Secret'                  : 96,

            // Valor por defecto
            'Desconocida'                  : 999
          };

          sortedCards.sort((a, b) => {
            const rarityA = a.cardDetails?.rarity || 'Desconocida';
            const rarityB = b.cardDetails?.rarity || 'Desconocida';
            const orderA  = rarityOrder[rarityA] ?? 999;
            const orderB  = rarityOrder[rarityB] ?? 999;
            return orderA - orderB;
          });
          break;

        
        case 'set':
          sortedCards.sort((a, b) => {
            // Tomamos el nombre del set desde donde esté disponible
            const setA = (
              a.cardDetails?.set?.name ||   // fuente principal
              a.setName ||                  // por si lo guardas aparte
              a.set ||                      // fallback genérico
              ''
            ).toLowerCase();

            const setB = (
              b.cardDetails?.set?.name ||
              b.setName ||
              b.set ||
              ''
            ).toLowerCase();

            // Comparación alfabética insensible a tildes y mayúsculas
            return setA.localeCompare(setB, undefined, { sensitivity: 'base' });
          });
          break;
    }

    // Renderizar las cartas ordenadas
    renderInventoryCards(sortedCards);
    
    // Actualizar botones activos
    updateSortButtons(criteria);
}

// Función para actualizar el estado visual de los botones
function updateSortButtons(activeCriteria) {
    const buttons = document.querySelectorAll('.btn-group button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('btn-outline-primary');
        btn.classList.remove('btn-primary');
    });
    
    const activeButton = document.querySelector(`button[onclick="ordenarInventario('${activeCriteria}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.classList.remove('btn-outline-primary');
        activeButton.classList.add('btn-primary');
    }
}

// Función separada para renderizar las cartas
async function renderInventoryCards(cards) {
    const container = document.getElementById("inventoryContainer");
    container.innerHTML = "";

    if (cards.length === 0) {
        container.innerHTML = "<p>No tienes cartas en tu inventario.</p>";
        return;
    }

    for (const card of cards) {
        const cardDetails = card.cardDetails;
        
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
                        <div class="d-flex align-items-center mb-2">
                            <input type="number" id="quantity-${card.id}" class="form-control me-2 quantity-input" value="${quantity}" min="1">
                            <button class="btn btn-primary" onclick="saveQuantity('${card.id}')">Guardar</button>
                            <span id="savedMsg-${card.id}" class="text-success ms-2" style="display: none;">Guardado</span>
                        </div>
                        <div class="d-flex align-items-center mb-2">
                            <button id="detailBtn-${card.id}" class="btn btn-primary w-50 me-1">
                                Ver Detalles
                            </button>
                            <button id="removeBtn-${card.id}" class="btn btn-danger w-50 ms-1" title="Eliminar carta">
                                Eliminar
                            </button>
                        </div>
                        <div class="d-flex align-items-center mt-2">
                            <button class="btn btn-warning w-100" onclick="toggleTradable('${card.id}', ${card.isTradable ?? false})">
                                ${card.isTradable ? "Quitar de intercambio" : "Marcar como intercambiable"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
        document.getElementById(`detailBtn-${card.id}`).addEventListener('click', () => showCardDetails(cardDetails || card));
        document.getElementById(`removeBtn-${card.id}`).addEventListener('click', () => removeCard(card.id));
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

// filepath: c:\Users\manue\OneDrive\Documentos\GitHub\P04-Hack-Tuah\public\js\inventory.js
async function renderInventory() {
    const container = document.getElementById("inventoryContainer");
    container.innerHTML = "Cargando...";

    const cards = await fetchInventory();
    container.innerHTML = "";

    if (cards.length === 0) {
        container.innerHTML = "<p>No tienes cartas en tu inventario.</p>";
        currentInventoryCards = [];
        return;
    }

    // Cargar detalles de todas las cartas y almacenarlas globalmente
    currentInventoryCards = [];
    for (const card of cards) {
        let cardDetails = null;
        try {
            cardDetails = await fetchCardDetails(card.id);
        } catch (err) {
            cardDetails = null;
        }
        
        currentInventoryCards.push({
            ...card,
            cardDetails: cardDetails
        });
    }

    // Renderizar las cartas inicialmente
    await renderInventoryCards(currentInventoryCards);
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

document.addEventListener("DOMContentLoaded", () => {
    renderInventory();
});

async function saveQuantity(cardId) {
    console.log("Guardando cantidad para carta:", cardId);
    
    const quantityInput = document.getElementById(`quantity-${cardId}`);
    const quantity = parseInt(quantityInput.value, 10);

    console.log("Cantidad a guardar:", quantity);

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
            body: JSON.stringify({ cardId: String(cardId), quantity: quantity }),
        });

        const data = await res.json();
        console.log("Respuesta del servidor:", data);

        const savedMsg = document.getElementById(`savedMsg-${cardId}`);
        if (data.success) {
            if (savedMsg) {
                savedMsg.style.display = "inline";
                setTimeout(() => savedMsg.style.display = "none", 1200);
            }
            
            // Actualizar la cantidad en currentInventoryCards
            const cardIndex = currentInventoryCards.findIndex(c => c.id === cardId);
            if (cardIndex !== -1) {
                currentInventoryCards[cardIndex].quantity = quantity;
            }
        } else {
            console.error("Error del servidor:", data.message);
            quantityInput.classList.add("is-invalid");
            setTimeout(() => quantityInput.classList.remove("is-invalid"), 1200);
        }
    } catch (err) {
        console.error("Error de red:", err);
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

async function removeCard(cardId) {
    if (!confirm("¿Seguro que quieres eliminar esta carta del inventario?")) return;
    try {
        const res = await fetch("/api/inventory/remove", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Carta eliminada del inventario", "success");
            renderInventory();
        } else {
            showToast("Error: " + data.message, "error");
        }
    } catch (err) {
        showToast("Error de conexión", "error");
    }
}

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

async function toggleTradable(cardId, currentValue) {
  const res = await fetch("/api/inventory/tradable", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, tradable: !currentValue })
  });

  const data = await res.json();
  if (data.success) {
    showToast("Estado de intercambio actualizado", "success");
    renderInventory(); // Vuelve a renderizar para reflejar el nuevo estado
  } else {
    showToast("Error al actualizar: " + data.message, "danger");
  }
}

document.getElementById("statsBtn").addEventListener("click", async () => {
  const cards = await fetchInventory();
  const typeCounts = {};
  const setCounts = {};
  const setCards = {};
  let totalCards = 0;
  const setIdMap = {};

  // 1. Agrupar cartas por set y contar
  for (const card of cards) {
    let details = null;
    try {
      details = await fetchCardDetails(card.id);
    } catch (e) {
      details = card; // fallback
    }

    const types = details.types || [details.supertype || "Desconocido"];
    types.forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + (card.quantity || 1);
    });

    const setName = details.set?.name || "Desconocido";
    const setId = details.set?.id || "";
    setCounts[setName] = (setCounts[setName] || 0) + (card.quantity || 1);

    // Guardar el setId para cada setName
    if (setId && !setIdMap[setName]) setIdMap[setName] = setId;

    // Agrupar cartas por set
    if (!setCards[setName]) setCards[setName] = [];
    setCards[setName].push({
      name: details.name || card.name || card.id,
      image: details.images?.small || card.image || "",
      id: card.id,
      quantity: card.quantity || 1
    });

    totalCards += card.quantity || 1;
  }

  // 2. Obtener el total de cartas por set consultando la API
  const setTotals = {};
  const setNames = Object.keys(setCards);
  await Promise.all(setNames.map(async setName => {
    const setId = setIdMap[setName];
    if (!setId) {
      setTotals[setName] = null;
      return;
    }
    try {
      const res = await fetch(`https://api.pokemontcg.io/v2/sets/${setId}`);
      const data = await res.json();
      setTotals[setName] = data?.data?.total || null;
    } catch {
      setTotals[setName] = null;
    }
  }));

  // Renderizar tipos
  const typesContainer = document.getElementById("typesStats");
  typesContainer.innerHTML = "";

  const typeIcons = {
    "Water": "💧", "Fire": "🔥", "Grass": "🍃", "Electric": "⚡", "Psychic": "🔮",
    "Fighting": "🥊", "Darkness": "🌑", "Metal": "⚙️", "Fairy": "✨", "Dragon": "🐉",
    "Colorless": "⚪", "Lightning": "⚡", "Ice": "❄️", "Trainer": "🎓", "Supporter": "🧑‍🤝‍🧑", 
    "Item": "🎒", "Stadium": "🏟️", "Desconocido": "❓"
  };

  for (const [type, count] of Object.entries(typeCounts)) {
    const percentage = ((count / totalCards) * 100).toFixed(1);
    const icon = typeIcons[type] || "❓";
    typesContainer.innerHTML += `
      <p>${icon} <strong>${type}:</strong> ${percentage}%</p>
      <div class="progress mb-3">
        <div class="progress-bar bg-info" role="progressbar" style="width: ${percentage}%;" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    `;
  }

  // Renderizar sets con cartas y barra de progreso
  const setsContainer = document.getElementById("setsStats");
  setsContainer.innerHTML = "";

  for (const [setName, count] of Object.entries(setCounts)) {
    const total = setTotals[setName];
    let percent = null;
    if (total && total > 0) {
      // Contar cartas únicas del set en el inventario
      const uniqueCount = setCards[setName].length;
      percent = ((uniqueCount / total) * 100).toFixed(1);
    }
    setsContainer.innerHTML += `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <p style="margin:0;"><strong>${setName}:</strong> ${count} carta(s)</p>
          ${
            percent !== null
              ? `<div style="flex:1;">
                  <div class="progress" style="height: 18px;">
                    <div class="progress-bar bg-success" role="progressbar" style="width: ${percent}%;" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
                      ${percent}%
                    </div>
                  </div>
                </div>`
              : ""
          }
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${setCards[setName].map(card => `
            <div style="text-align: center; width: 90px;">
              <img src="${card.image}" alt="${card.name}" style="width: 60px; height: 84px; object-fit: contain; border-radius: 6px; border: 1px solid #ddd; background: #fff;">
              <div style="font-size: 0.85em; margin-top: 2px;">${card.name}</div>
              <div style="font-size: 0.8em; color: #888;">x${card.quantity}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Mostrar modal
  new bootstrap.Modal(document.getElementById('statsModal')).show();
});