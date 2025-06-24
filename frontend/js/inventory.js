// --- Variables Globales ---
let currentInventoryCards = [];
let deck = {}; // Estructura: { "card-id": { copies: N, data: {...} } }
let totalDeckCards = 0;
let currentDeckName = "Nuevo Mazo";

// --- Funciones de API (Inventario y Mazos) ---
async function fetchFromServer(url, options = {}) {
    const session = getSession(); // Función de auth.js
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (session && session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    try {
        const res = await fetch(url, { ...options, headers, credentials: 'omit' });
        if (!res.ok) {
            if (res.status === 401) { // Token inválido o expirado
                clearSession();
                window.location.href = '/login.html';
            }
            console.error(`Error en la petición a ${url}:`, res.status);
            return null;
        }
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return res.json();
        }
        return { success: true };
    } catch (err) {
        console.error(`Fallo de red en ${url}:`, err);
        return null;
    }
}

async function updateQuantity(cardId, quantity) {
    const newQuantity = parseInt(quantity, 10);
    if (isNaN(newQuantity) || newQuantity < 1) {
        alert("La cantidad debe ser un número mayor o igual a 1.");
        const card = currentInventoryCards.find(c => c.id === cardId);
        document.getElementById(`qty-${cardId}`).value = card.quantity;
        return;
    }
    await fetchFromServer('/api/inventory-update-quantity', {
        method: 'POST',
        body: JSON.stringify({ cardId, quantity: newQuantity })
    });
    const card = currentInventoryCards.find(c => c.id === cardId);
    if(card) card.quantity = newQuantity;
    alert("Cantidad actualizada.");
}

async function toggleFavorite(cardId, currentState) {
    await fetchFromServer('/api/inventory-toggle-favorite', {
        method: 'POST',
        body: JSON.stringify({ cardId, isFavorite: !currentState })
    });
    const card = currentInventoryCards.find(c => c.id === cardId);
    if(card) card.is_favorite = !currentState;
    applyFilters();
}

async function toggleTradable(cardId, currentState) {
    await fetchFromServer('/api/inventory-toggle-tradable', {
        method: 'POST',
        body: JSON.stringify({ cardId, isTradable: !currentState })
    });
    const card = currentInventoryCards.find(c => c.id === cardId);
    if(card) card.is_tradable = !currentState;
    applyFilters();
}

async function removeCard(cardId) {
    if (!confirm("¿Estás seguro de que quieres eliminar esta carta de tu inventario?")) return;
    await fetchFromServer('/api/inventory-remove', {
        method: 'POST',
        body: JSON.stringify({ cardId })
    });
    await renderAll();
}

// --- Funciones de Gestión de Mazos ---
function addToDeck(cardId) {
    const cardInInventory = currentInventoryCards.find(c => c.id === cardId);
    if (!cardInInventory) return;

    const copiesInDeck = deck[cardId]?.copies || 0;

    if (totalDeckCards >= 60) { alert("El mazo ya tiene 60 cartas."); return; }
    if (copiesInDeck >= 4) { alert("No puedes tener más de 4 copias de la misma carta."); return; }
    if (copiesInDeck >= cardInInventory.quantity) { alert("No tienes más copias de esta carta en tu inventario."); return; }

    if (!deck[cardId]) {
        deck[cardId] = { copies: 0, data: cardInInventory };
    }
    deck[cardId].copies++;
    totalDeckCards++;
    renderDeck();
}

function removeFromDeck(cardId) {
    if (!deck[cardId] || deck[cardId].copies <= 0) return;
    deck[cardId].copies--;
    totalDeckCards--;
    if (deck[cardId].copies === 0) delete deck[cardId];
    renderDeck();
}

function clearDeck() {
    if (!confirm("¿Estás seguro de que quieres limpiar el mazo actual? Los cambios no guardados se perderán.")) return;
    deck = {};
    totalDeckCards = 0;
    currentDeckName = "Nuevo Mazo";
    renderDeck();
    updateDeckNameDisplay();
}

async function saveDeckWithName() {
    const deckName = prompt("Introduce un nombre para tu mazo:", currentDeckName);
    if (!deckName || deckName.trim() === "") return;
    if (Object.keys(deck).length === 0) { alert("El mazo está vacío."); return; }

    const deckCardIds = Object.keys(deck).flatMap(cardId => Array(deck[cardId].copies).fill(cardId));
    const result = await fetchFromServer('/api/decks-save', {
        method: 'POST',
        body: JSON.stringify({ name: deckName.trim(), cards: deckCardIds })
    });

    if (result) {
        alert("Mazo guardado con éxito.");
        currentDeckName = deckName.trim();
        updateDeckNameDisplay();
        await loadSavedDecks();
    } else {
        alert("Error al guardar el mazo. Puede que el nombre ya exista.");
    }
}

async function loadSavedDecks() {
    const savedDecks = await fetchFromServer('/api/decks');
    renderSavedDecks(savedDecks || []);
}

async function loadDeck(deckName) {
    if (!confirm(`¿Cargar el mazo "${deckName}"? Los cambios no guardados en el mazo actual se perderán.`)) return;
    const deckData = await fetchFromServer('/api/decks-name/' + deckName);
    if (!deckData) { alert("Error al cargar el mazo."); return; }
    
    deck = {};
    totalDeckCards = 0;
    currentDeckName = deckData.name;

    for (const cardId of deckData.cards) {
        const cardInfo = currentInventoryCards.find(c => c.id === cardId);
        if (cardInfo) {
            if (!deck[cardId]) deck[cardId] = { copies: 0, data: cardInfo };
            deck[cardId].copies++;
            totalDeckCards++;
        }
    }
    renderDeck();
    updateDeckNameDisplay();
    new bootstrap.Tab(document.getElementById('deck-tab')).show();
}

async function deleteDeck(deckName) {
    if (!confirm(`¿Seguro que quieres eliminar el mazo "${deckName}"?`)) return;
    await fetchFromServer('/api/decks-name/' + deckName, { method: 'DELETE' });
    await loadSavedDecks();
}

// --- Funciones de Renderizado y UI ---
function renderDeck() {
    const deckContainer = document.getElementById("deckContainer");
    document.getElementById("deckCounter").textContent = `Cartas: ${totalDeckCards}/60`;
    deckContainer.innerHTML = "";
    if (Object.keys(deck).length === 0) {
        deckContainer.innerHTML = "<div class='list-group-item text-muted'>Mazo vacío</div>";
        return;
    }
    const sortedDeck = Object.entries(deck).sort(([, a], [, b]) => a.data.name.localeCompare(b.data.name));
    sortedDeck.forEach(([cardId, item]) => {
        deckContainer.innerHTML += `
            <div class="list-group-item d-flex justify-content-between align-items-center p-2">
                <span class="text-truncate"><span class="badge bg-secondary me-2">${item.copies}x</span>${item.data.name}</span>
                <button class="btn btn-danger btn-sm py-0 px-2" onclick="removeFromDeck('${cardId}')">X</button>
            </div>`;
    });
}

function renderSavedDecks(decks) {
    const container = document.getElementById("savedDecksContainer");
    container.innerHTML = decks.length === 0 ? "<div class='list-group-item text-muted'>No tienes mazos guardados.</div>" : "";
    decks.forEach(d => {
        container.innerHTML += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">${d.name}</span>
                    <span class="badge bg-info ms-2">${d.total_cards} cartas</span>
                </div>
                <div>
                    <button class="btn btn-primary btn-sm" onclick="loadDeck('${d.name}')">Cargar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteDeck('${d.name}')">Borrar</button>
                </div>
            </div>`;
    });
}

function updateDeckNameDisplay() {
    document.getElementById("currentDeckName").textContent = currentDeckName;
}

function renderDeckBuilderInventory() {
    const container = document.getElementById("deckBuilderInventoryContainer");
    container.innerHTML = "";
    currentInventoryCards.forEach(card => {
        container.innerHTML += `
            <div class="col">
                <div class="card h-100">
                    <img src="${card.images.small}" class="card-img-top" alt="${card.name}">
                    <div class="card-body p-1">
                        <button class="btn btn-primary btn-sm w-100" onclick="addToDeck('${card.id}')">Añadir</button>
                    </div>
                </div>
            </div>`;
    });
}

function renderInventoryCards(cards) {
    const inventoryContainer = document.getElementById("inventoryContainer");
    inventoryContainer.innerHTML = "";
    if (cards.length === 0) {
        inventoryContainer.innerHTML = "<p class='text-center col-12'>No se encontraron cartas con los filtros seleccionados.</p>";
        return;
    }
    cards.forEach(card => {
        const cardElement = document.createElement("div");
        cardElement.className = "col";
        cardElement.innerHTML = `
            <div class="card h-100 inventory-card ${card.is_favorite ? 'border-warning border-2' : ''}">
                <img src="${card.images.small}" class="card-img-top" alt="${card.name}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${card.name}</h5>
                    <div class="input-group input-group-sm my-2">
                        <span class="input-group-text">Cant:</span>
                        <input type="number" class="form-control" value="${card.quantity}" min="1" id="qty-${card.id}">
                        <button class="btn btn-outline-secondary" type="button" onclick="updateQuantity('${card.id}', document.getElementById('qty-${card.id}').value)">💾</button>
                    </div>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-info" onclick="showDetails('${card.id}')">Detalles</button>
                        <button class="btn ${card.is_tradable ? 'btn-success' : 'btn-outline-success'}" onclick="toggleTradable('${card.id}', ${card.is_tradable})">Trade</button>
                        <button class="btn ${card.is_favorite ? 'btn-warning' : 'btn-outline-warning'}" onclick="toggleFavorite('${card.id}', ${card.is_favorite})">⭐</button>
                    </div>
                    <button class="btn btn-danger btn-sm mt-2" onclick="removeCard('${card.id}')">Eliminar</button>
                </div>
            </div>`;
        inventoryContainer.appendChild(cardElement);
    });
}

// --- Funciones de Filtros, Estadísticas y Detalles ---
function showDetails(cardId) {
    const card = currentInventoryCards.find(c => c.id === cardId);
    if (!card) return;
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.textContent = `${card.name} (${card.id})`;
    let pricesHtml = '<li>No hay precios de mercado disponibles.</li>';
    if (card.tcgplayer && card.tcgplayer.prices) {
        pricesHtml = Object.entries(card.tcgplayer.prices)
            .map(([rarity, price]) => `<li><strong>${rarity.charAt(0).toUpperCase() + rarity.slice(1)}:</strong> $${price.market?.toFixed(2) || 'N/A'}</li>`)
            .join('');
    }
    modalBody.innerHTML = `<div class="row"><div class="col-md-5"><img src="${card.images.large}" class="img-fluid rounded" alt="${card.name}"></div><div class="col-md-7"><ul class="list-group"><li class="list-group-item"><strong>Tipo:</strong> ${card.types ? card.types.join(', ') : 'N/A'}</li><li class="list-group-item"><strong>Rareza:</strong> ${card.rarity || 'No especificada'}</li><li class="list-group-item"><strong>Precios (TCGPlayer):</strong><ul>${pricesHtml}</ul></li><li class="list-group-item"><strong>Set:</strong> ${card.set.name}</li></ul></div></div>`;
    const detailsModal = new bootstrap.Modal(document.getElementById('cardDetailsModal'));
    detailsModal.show();
}

function showStatistics() {
    const statsModalBody = document.getElementById('statsModalBody');
    if (!statsModalBody) return;
    if (currentInventoryCards.length === 0) {
        statsModalBody.innerHTML = "<p>No hay cartas para mostrar estadísticas.</p>";
        return;
    }
    const typeCounts = {}, setCounts = {};
    let totalCards = 0;
    currentInventoryCards.forEach(card => {
        const quantity = card.quantity || 1;
        totalCards += quantity;
        if (card.types) card.types.forEach(type => { typeCounts[type] = (typeCounts[type] || 0) + quantity; });
        if (card.set && card.set.name) setCounts[card.set.name] = (setCounts[card.set.name] || 0) + quantity;
    });
    let statsHtml = `<h5>Total de Cartas: ${totalCards}</h5><hr>`;
    statsHtml += '<h6>Distribución por Tipo</h6>';
    Object.entries(typeCounts).sort(([, a], [, b]) => b - a).forEach(([type, count]) => {
        const percentage = ((count / totalCards) * 100).toFixed(1);
        statsHtml += `<div class="mb-2"><span>${type} (${count})</span><div class="progress" style="height: 20px;"><div class="progress-bar" role="progressbar" style="width: ${percentage}%;">${percentage}%</div></div></div>`;
    });
    statsHtml += '<hr class="my-4"><h6>Distribución por Set</h6>';
    Object.entries(setCounts).sort(([, a], [, b]) => b - a).forEach(([set, count]) => {
        const percentage = ((count / totalCards) * 100).toFixed(1);
        statsHtml += `<div class="mb-2"><span>${set} (${count})</span><div class="progress" style="height: 20px;"><div class="progress-bar bg-success" role="progressbar" style="width: ${percentage}%;">${percentage}%</div></div></div>`;
    });
    statsModalBody.innerHTML = statsHtml;
    new bootstrap.Modal(document.getElementById('statsModal')).show();
}

function populateFilters() {
    const types = new Set(), sets = new Set(), rarities = new Set();
    currentInventoryCards.forEach(card => {
        if (card.types) card.types.forEach(t => types.add(t));
        if (card.set && card.set.name) sets.add(card.set.name);
        if (card.rarity) rarities.add(card.rarity);
    });
    const typeFilter = document.getElementById('typeFilter'), setFilter = document.getElementById('setFilter'), rarityFilter = document.getElementById('rarityFilter');
    typeFilter.innerHTML = '<option value="">Todos los Tipos</option>';
    [...types].sort().forEach(type => typeFilter.innerHTML += `<option value="${type}">${type}</option>`);
    setFilter.innerHTML = '<option value="">Todos los Sets</option>';
    [...sets].sort().forEach(set => setFilter.innerHTML += `<option value="${set}">${set}</option>`);
    rarityFilter.innerHTML = '<option value="">Todas las Rarezas</option>';
    [...rarities].sort().forEach(rarity => rarityFilter.innerHTML += `<option value="${rarity}">${rarity}</option>`);
}

function applyFilters() {
    const nameQuery = document.getElementById('nameSearchInput').value.toLowerCase();
    const typeQuery = document.getElementById('typeFilter').value;
    const setQuery = document.getElementById('setFilter').value;
    const rarityQuery = document.getElementById('rarityFilter').value;
    const favoritesQuery = document.getElementById('favoritesFilter').checked;
    let filteredCards = currentInventoryCards;
    if (nameQuery) filteredCards = filteredCards.filter(c => c.name.toLowerCase().includes(nameQuery));
    if (typeQuery) filteredCards = filteredCards.filter(c => c.types && c.types.includes(typeQuery));
    if (setQuery) filteredCards = filteredCards.filter(c => c.set && c.set.name === setQuery);
    if (rarityQuery) filteredCards = filteredCards.filter(c => c.rarity === rarityQuery);
    if (favoritesQuery) filteredCards = filteredCards.filter(c => c.is_favorite === true);
    renderInventoryCards(filteredCards);
}

// --- Inicialización General ---
async function renderAll() {
    document.getElementById("inventoryContainer").innerHTML = "<p class='text-center p-5'>Cargando inventario...</p>";
    currentInventoryCards = await fetchFromServer('/api/inventory') || [];
    populateFilters();
    applyFilters();
    renderDeckBuilderInventory();
    renderDeck();
    await loadSavedDecks();
}

document.addEventListener("DOMContentLoaded", () => {
    renderAll();
    document.getElementById('nameSearchInput').addEventListener('input', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('setFilter').addEventListener('change', applyFilters);
    document.getElementById('rarityFilter').addEventListener('change', applyFilters);
    document.getElementById('favoritesFilter').addEventListener('change', applyFilters);
    document.getElementById('statsBtn').addEventListener('click', showStatistics);
});