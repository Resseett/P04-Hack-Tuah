async function fetchInventory() {
    const res = await fetch("/api/inventory", { credentials: "include" }); // 🔥 Incluir credenciales
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

    const cards = await fetchInventory(); // Ahora devuelve objetos con id y quantity
    container.innerHTML = "";

    if (cards.length === 0) {
        container.innerHTML = "<p>No tienes cartas en tu inventario.</p>";
        return;
    }

    for (const card of cards) {
        try {
            const cardDetails = await fetchCardDetails(card.id); // card.id en lugar de id
            const cardHTML = `
                <div class="col">
                    <div class="card h-100">
                        <img src="${cardDetails.images.small}" class="card-img-top" alt="${cardDetails.name}">
                        <div class="card-body">
                            <h5 class="card-title">${cardDetails.name}</h5>
                            <p class="card-text">ID: ${cardDetails.id}</p>
                            <p class="card-text">Tipo: ${cardDetails.supertype}</p>
                            <div class="d-flex align-items-center">
                                <label for="quantity-${cardDetails.id}" class="me-2">Cantidad:</label>
                                <input type="number" id="quantity-${cardDetails.id}" class="form-control" style="width: 80px;" value="${card.quantity}" min="1">
                                <button class="btn btn-primary ms-2" onclick="saveQuantity('${cardDetails.id}')">Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        } catch (err) {
            console.error("Error al cargar carta:", card.id, err);
        }
    }
}

async function saveQuantity(cardId) {
    const quantityInput = document.getElementById(`quantity-${cardId}`);
    const quantity = parseInt(quantityInput.value, 10);

    if (isNaN(quantity) || quantity < 1) {
        alert("Por favor, ingresa una cantidad válida.");
        return;
    }

    try {
        const res = await fetch("/api/inventory/update", {
            method: "POST",
            credentials: "include", // 🔥 Incluir credenciales
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId, quantity }),
        });

        const data = await res.json();
        if (data.success) {
            alert("Cantidad guardada con éxito.");
        } else {
            alert("Error al guardar la cantidad: " + data.message);
        }
    } catch (err) {
        console.error("Error al guardar la cantidad:", err);
        alert("Hubo un error al guardar la cantidad.");
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
