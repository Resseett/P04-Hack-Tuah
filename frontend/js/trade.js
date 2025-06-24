document.addEventListener("DOMContentLoaded", () => {
    loadMyTradableCards();
    loadWishlist();

    const addBtn = document.getElementById('addWishlistBtn');
    const cardInput = document.getElementById('wishlistCardInput');

    addBtn.addEventListener('click', addToWishlist);
    cardInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addToWishlist();
        }
    });
});

async function fetchFromServer(url, options = {}) {
    try {
        const defaultOptions = { credentials: 'include' };
        const res = await fetch(url, { ...defaultOptions, ...options });
        if (!res.ok) {
            console.error(`Error en la petición a ${url}:`, res.status);
            return null;
        }
        return res.json();
    } catch (err) {
        console.error(`Fallo de red en ${url}:`, err);
        return null;
    }
}

// Carga y muestra las cartas que el usuario ha marcado como intercambiables
async function loadMyTradableCards() {
    const container = document.getElementById('myTradableCardsContainer');
    container.innerHTML = '<p>Cargando tus cartas...</p>';

    const inventory = await fetchFromServer('/api/inventory');
    if (!inventory) {
        container.innerHTML = '<p class="text-danger">Error al cargar tu inventario.</p>';
        return;
    }

    const tradableCards = inventory.filter(card => card.is_tradable);

    if (tradableCards.length === 0) {
        container.innerHTML = '<p>No tienes ninguna carta marcada como intercambiable.</p>';
        return;
    }

    container.innerHTML = '';
    tradableCards.forEach(card => {
        container.innerHTML += `
            <div class="col">
                <div class="card h-100">
                    <img src="${card.images.small}" class="card-img-top" alt="${card.name}">
                    <div class="card-body p-2">
                        <h6 class="card-title small">${card.name}</h6>
                        <p class="card-text small text-muted">Cantidad: ${card.quantity}</p>
                    </div>
                </div>
            </div>
        `;
    });
}

// Carga y muestra la wishlist del usuario
async function loadWishlist() {
    const container = document.getElementById('wishlistContainer');
    container.innerHTML = '<p>Cargando tu wishlist...</p>';

    const wishedCards = await fetchFromServer('/api/wishlist');
    if (!wishedCards) {
        container.innerHTML = '<p class="text-danger">Error al cargar tu wishlist.</p>';
        return;
    }

    if (wishedCards.length === 0) {
        container.innerHTML = '<p>Tu wishlist está vacía.</p>';
        return;
    }

    container.innerHTML = '';
    wishedCards.forEach(card => {
        container.innerHTML += `
            <div class="col">
                <div class="card h-100">
                    <img src="${card.images.small}" class="card-img-top" alt="${card.name}">
                    <div class="card-body p-2">
                        <h6 class="card-title small">${card.name}</h6>
                        <button class="btn btn-danger btn-sm w-100" onclick="removeFromWishlist('${card.id}')">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// Añade una carta a la wishlist
async function addToWishlist() {
    const cardInput = document.getElementById('wishlistCardInput');
    const cardId = cardInput.value.trim();
    if (!cardId) return;

    const result = await fetchFromServer('/api/wishlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId })
    });

    if (result && result.success) {
        cardInput.value = '';
        await loadWishlist(); // Recarga la wishlist para mostrar la nueva carta
    } else {
        alert('Error al añadir la carta. Verifica que el ID sea correcto.');
    }
}

// Elimina una carta de la wishlist
async function removeFromWishlist(cardId) {
    if (!confirm(`¿Seguro que quieres eliminar "${cardId}" de tu wishlist?`)) return;

    const result = await fetchFromServer('/api/wishlist/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId })
    });

    if (result && result.success) {
        await loadWishlist(); // Recarga la wishlist
    } else {
        alert('Error al eliminar la carta.');
    }
}