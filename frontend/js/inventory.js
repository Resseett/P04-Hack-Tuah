// Variable global para almacenar las cartas del inventario
let currentInventoryCards = [];

// --- Funciones de la API del Frontend ---

async function fetchInventory() {
    try {
        const res = await fetch("/api/inventory", { credentials: "include" });
        if (!res.ok) return [];
        return await res.json();
    } catch (err) {
        console.error("Fallo al obtener el inventario:", err);
        return [];
    }
}

async function updateQuantity(cardId, quantity) {
    const res = await fetch('/api/inventory/update-quantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cardId, quantity: parseInt(quantity, 10) })
    });
    if (res.ok) alert("Cantidad actualizada.");
    else alert("Error al actualizar la cantidad.");
    await renderInventory();
}

async function toggleFavorite(cardId, currentState) {
    await fetch('/api/inventory/toggle-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cardId, isFavorite: !currentState })
    });
    await renderInventory();
}

async function toggleTradable(cardId, currentState) {
    await fetch('/api/inventory/toggle-tradable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cardId, isTradable: !currentState })
    });
    await renderInventory();
}

async function removeCard(cardId) {
    if (!confirm("¿Estás seguro de que quieres eliminar esta carta de tu inventario?")) return;
    const res = await fetch('/api/inventory/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cardId })
    });
    if (res.ok) alert("Carta eliminada.");
    else alert("Error al eliminar la carta.");
    await renderInventory();
}

// --- Funciones de Renderizado ---

function ordenarInventario(criteria) {
    currentInventoryCards.sort((a, b) => {
        let valA, valB;
        if (criteria === 'name') valA = a.name.toLowerCase();
        else if (criteria === 'rarity') valA = a.rarity || 'z';
        else if (criteria === 'set') valA = a.set.name.toLowerCase();
        
        if (criteria === 'name') valB = b.name.toLowerCase();
        else if (criteria === 'rarity') valB = b.rarity || 'z';
        else if (criteria === 'set') valB = b.set.name.toLowerCase();

        if (valA < valB) return -1;
        if (valA > valB) return 1;
        return 0;
    });
    renderInventoryCards(currentInventoryCards);
}

async function renderInventoryCards(cards) {
    const inventoryContainer = document.getElementById("inventoryContainer");
    inventoryContainer.innerHTML = "";

    if (cards.length === 0) {
        inventoryContainer.innerHTML = "<p>No tienes cartas en tu inventario.</p>";
        return;
    }

    cards.forEach(card => {
        const cardElement = document.createElement("div");
        cardElement.className = "col";
        // Plantilla HTML completa con todos los botones y funcionalidades
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
                        <button class="btn btn-info" onclick="alert('Mostrar detalles de ${card.name}')">Ver</button>
                        <button class="btn ${card.is_tradable ? 'btn-success' : 'btn-outline-success'}" onclick="toggleTradable('${card.id}', ${card.is_tradable})">Trade</button>
                        <button class="btn ${card.is_favorite ? 'btn-warning' : 'btn-outline-warning'}" onclick="toggleFavorite('${card.id}', ${card.is_favorite})">⭐</button>
                    </div>
                    <button class="btn btn-danger btn-sm mt-2" onclick="removeCard('${card.id}')">Eliminar</button>
                </div>
            </div>
        `;
        inventoryContainer.appendChild(cardElement);
    });
}

async function renderInventory() {
    const inventoryContainer = document.getElementById("inventoryContainer");
    inventoryContainer.innerHTML = "<p>Cargando inventario...</p>";
    currentInventoryCards = await fetchInventory();
    await renderInventoryCards(currentInventoryCards);
}

// --- Inicialización ---

if (typeof document !== 'undefined') {
    document.addEventListener("DOMContentLoaded", renderInventory);

    document.getElementById("addCardBtn").addEventListener("click", async () => {
        const cardId = document.getElementById("cardIdInput").value.trim();
        if (!cardId) return;
        const res = await fetch('/api/inventory/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cardId })
        });
        if (res.ok) {
            alert("Carta añadida con éxito.");
            document.getElementById("cardIdInput").value = "";
            await renderInventory();
        } else {
            alert("Error al añadir la carta.");
        }
    });
}