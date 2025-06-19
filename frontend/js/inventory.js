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
                        <div class="d-flex align-items-center mt-2">
                          <button class="btn btn-outline-danger w-100" onclick="toggleFavorite('${card.id}', ${card.favorite ?? false})">
                            ${card.favorite ? "Quitar de favoritas ❤️" : "Marcar como favorita 🤍"}
                          </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
        document.getElementById(`detailBtn-${card.id}`).addEventListener('click', () => showCardDetails(cardDetails || card));
        // Cambiar aquí: usar removeCard como función global o definirla arriba
        document.getElementById(`removeBtn-${card.id}`).addEventListener('click', async () => {
            await removeCard(card.id);
        });
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
        updateTypeSetFilterOptions();
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
    updateTypeSetFilterOptions();
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
    renderTypeSetFilters();
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

async function toggleTradable(cardId, isCurrentlyTradable) {
    const newTradableState = !isCurrentlyTradable;

    try {
        const res = await fetch("/api/inventory/tradable", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId: String(cardId), tradable: newTradableState }),
        });

        const data = await res.json();

        if (data.success) {
            // Actualizar la carta en el array local
            const card = currentInventoryCards.find(c => c.id === cardId);
            if (card) {
                card.isTradable = newTradableState;
            }
            
            // Volver a renderizar la lista para reflejar el cambio.
            // Se usan los filtros actuales para mantener la vista.
            filterInventoryTypeSet();
        } else {
            alert(`Error al cambiar el estado de intercambio: ${data.message}`);
        }
    } catch (err) {
        console.error("Error de red:", err);
        alert("Error de red al cambiar el estado de intercambio.");
    }
}

// Elimina el botón de buscar y agrega búsqueda automática al input
const cardIdInput = document.getElementById("cardIdInput");
const addCardBtn = document.getElementById("addCardBtn");
if (addCardBtn) addCardBtn.remove();

cardIdInput.placeholder = "Buscar por nombre de carta...";

cardIdInput.addEventListener("input", async () => {
    const searchTerm = cardIdInput.value.trim().toLowerCase();
    if (!searchTerm) {
        renderInventory();
        return;
    }
    if (!currentInventoryCards.length) {
        await renderInventory();
    }
    const filtered = currentInventoryCards.filter(card => {
        const name = (card.cardDetails?.name || card.name || "").toLowerCase();
        return name.includes(searchTerm);
    });
    renderInventoryCards(filtered);
});

// --- Filtros por tipo, set y rareza debajo del input ---
function renderTypeSetFilters() {
    // Evita duplicados
    if (document.getElementById("typeSetFiltersRow")) return;

    const container = cardIdInput.parentElement;
    const filterRow = document.createElement("div");
    filterRow.className = "row mb-3";
    filterRow.id = "typeSetFiltersRow";
    filterRow.style.gap = "10px";
    filterRow.style.marginTop = "10px";

    filterRow.innerHTML = `
      <label for="typeFilterInv" class="form-label col-auto"><strong>Tipo:</strong></label>
      <select id="typeFilterInv" class="form-select col-auto" style="max-width:140px"><option value="">Todos</option></select>
      <label for="setFilterInv" class="form-label col-auto"><strong>Set:</strong></label>
      <select id="setFilterInv" class="form-select col-auto" style="max-width:180px"><option value="">Todos</option></select>
      <label for="rarityFilterInv" class="form-label col-auto"><strong>Rareza:</strong></label>
      <select id="rarityFilterInv" class="form-select col-auto" style="max-width:140px"><option value="">Todas</option></select>
      <label for="favoriteFilterInv" class="form-label col-auto"><strong>Favoritas:</strong></label>
      <select id="favoriteFilterInv" class="form-select col-auto" style="max-width:140px"><option value="">Todas</option><option value="true">Solo favoritas</option><option value="false">Solo no favoritas</option></select>
    `;

    container.appendChild(filterRow);

    updateTypeSetFilterOptions();

    document.getElementById("typeFilterInv").addEventListener("change", filterInventoryTypeSet);
    document.getElementById("setFilterInv").addEventListener("change", filterInventoryTypeSet);
    document.getElementById("rarityFilterInv").addEventListener("change", filterInventoryTypeSet);
    document.getElementById("favoriteFilterInv").addEventListener("change", filterInventoryTypeSet);
    cardIdInput.addEventListener("input", filterInventoryTypeSet);
}

function updateTypeSetFilterOptions() {
    // Siempre usar todas las cartas del inventario para poblar los filtros
    const typesSet = new Set();
    const setsSet = new Set();
    const raritiesSet = new Set();
    
    for (const card of currentInventoryCards) {
        const details = card.cardDetails || {};
        // Tipo
        if (Array.isArray(details.types)) details.types.forEach(t => typesSet.add(t));
        // Set
        if (details.set?.name) setsSet.add(details.set.name);
        else if (card.setName) setsSet.add(card.setName);
        // Rareza
        let rarity = details.rarity || card.rarity;
        if (!rarity || rarity === "" || rarity === undefined) rarity = "Desconocida";
        raritiesSet.add(rarity);
        
    }
    const types = Array.from(typesSet).sort();
    const sets = Array.from(setsSet).sort();
    const rarities = Array.from(raritiesSet).sort();
    

    const typeSelect = document.getElementById("typeFilterInv");
    const setSelect = document.getElementById("setFilterInv");
    const raritySelect = document.getElementById("rarityFilterInv");
    
    if (!typeSelect || !setSelect || !raritySelect) return;

    // Guardar selección previa
    const prevType = typeSelect.value;
    const prevSet = setSelect.value;
    const prevRarity = raritySelect.value;

    typeSelect.innerHTML = `<option value="">Todos</option>` + types.map(t => `<option value="${t}">${t}</option>`).join("");
    setSelect.innerHTML = `<option value="">Todos</option>` + sets.map(s => `<option value="${s}">${s}</option>`).join("");
    raritySelect.innerHTML = `<option value="">Todas</option>` + rarities.map(r => `<option value="${r}">${r}</option>`).join("");

    // Restaurar selección previa si existe
    typeSelect.value = prevType;
    setSelect.value = prevSet;
    raritySelect.value = prevRarity;
}

function filterInventoryTypeSet() {
    const searchTerm = cardIdInput.value.trim().toLowerCase();
    const typeValue = document.getElementById("typeFilterInv").value;
    const setValue = document.getElementById("setFilterInv").value;
    const rarityValue = document.getElementById("rarityFilterInv").value;
    const favFilter = document.getElementById("favoriteFilterInv").value;

    let filtered = currentInventoryCards;

    if (favFilter === "true") {
      filtered = filtered.filter(card => card.favorite === true);
    } else if (favFilter === "false") {
        filtered = filtered.filter(card => card.favorite !== true);
    }

    if (searchTerm) {
        filtered = filtered.filter(card => {
            const name = (card.cardDetails?.name || card.name || "").toLowerCase();
            return name.includes(searchTerm);
        });
    }
    if (typeValue) {
        filtered = filtered.filter(card => {
            const types = card.cardDetails?.types || [];
            return types.includes(typeValue);
        });
    }
    if (setValue) {
        filtered = filtered.filter(card => {
            const setName = card.cardDetails?.set?.name || card.setName || "";
            return setName === setValue;
        });
    }
    if (rarityValue) {
        filtered = filtered.filter(card => {
            let rarity = card.cardDetails?.rarity || card.rarity;
            if (!rarity || rarity === "" || rarity === undefined) rarity = "Desconocida";
            return rarity === rarityValue;
        });
    }
    renderInventoryCards(filtered);
}

// --- Estadísticas ---
document.getElementById("statsBtn").addEventListener("click", async () => {
  const cards = await fetchInventory();
  const typeCounts = {};
  const setCounts = {};
  const setCards = {};
  const rarityCounts = {};
  let totalCards = 0;
  const setIdMap = {}

  // 1. Agrupar cartas por set, tipo y rareza y contar
  for (const card of cards) {
    let details = null;
    try {
      details = await fetchCardDetails(card.id);
    } catch (e) {
      details = card; // fallback
    }

    // Tipos
    const types = details.types || [details.supertype || "Desconocido"];
    types.forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + (card.quantity || 1);
    });

    // Sets
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

    // Rarezas
    let rarity = details.rarity || card.rarity;
    if (!rarity || rarity === "" || rarity === undefined) rarity = "Desconocida";
    rarityCounts[rarity] = (rarityCounts[rarity] || 0) + (card.quantity || 1);

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

  // Renderizar rarezas en su propia pestaña
  let rarityStats = document.getElementById("rarityStats");
  if (!rarityStats) {
    rarityStats = document.createElement("div");
    rarityStats.id = "rarityStats";
    // Si el tab no existe, lo creamos (esto es para compatibilidad con el HTML actual)
    const statsTabs = document.getElementById("statsTabs");
    if (statsTabs && !document.getElementById("rarity-tab")) {
      const li = document.createElement("li");
      li.className = "nav-item";
      li.role = "presentation";
      li.innerHTML = `<button class="nav-link" id="rarity-tab" data-bs-toggle="tab" data-bs-target="#rarity" type="button" role="tab">Por Rareza</button>`;
      statsTabs.appendChild(li);

      // Agregar el tab-pane
      const tabContent = document.querySelector(".tab-content");
      const rarityPane = document.createElement("div");
      rarityPane.className = "tab-pane fade";
      rarityPane.id = "rarity";
      rarityPane.role = "tabpanel";
      rarityPane.innerHTML = `<div id="rarityStats"></div>`;
      tabContent.appendChild(rarityPane);
    }
  }

  // Llenar rarezas
  rarityStats = document.getElementById("rarityStats");
  if (rarityStats) {
    rarityStats.innerHTML = "";
    for (const [rarity, count] of Object.entries(rarityCounts)) {
      const percentage = ((count / totalCards) * 100).toFixed(1);
      rarityStats.innerHTML += `
        <p><strong>${rarity}:</strong> ${percentage}%</p>
        <div class="progress mb-3">
          <div class="progress-bar bg-warning" role="progressbar" style="width: ${percentage}%;" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      `;
    }
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

// Agrega la función removeCard global si no existe
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
            // Elimina la carta del array local y vuelve a renderizar
            currentInventoryCards = currentInventoryCards.filter(c => c.id !== cardId);
            await renderInventoryCards(currentInventoryCards);
            updateTypeSetFilterOptions();
        } else {
            alert(data.message || "No se pudo eliminar la carta.");
        }
    } catch (err) {
        alert("Error al eliminar la carta.");
        console.error(err);
    }
    
}

async function toggleFavorite(cardId, isCurrentlyFavorite) {
    const newFavoriteState = !isCurrentlyFavorite;

    try {
        const res = await fetch("/api/inventory/favorite", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId: String(cardId), favorite: newFavoriteState }),
        });

        const data = await res.json();

        if (data.success) {
            // Actualizar localmente
            const card = currentInventoryCards.find(c => c.id === cardId);
            if (card) card.favorite = newFavoriteState;
            // Re-renderizar inventario filtrado si corresponde
            filterInventoryTypeSet();
        } else {
            alert(`Error al cambiar favorito: ${data.message}`);
        }
    } catch (err) {
        console.error("Error al guardar favorito:", err);
        alert("Error de red.");
    }
}
