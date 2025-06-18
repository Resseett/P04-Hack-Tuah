// trade.js

// Ejecutar al cargar la página: cargar listados y configurar formularios
window.addEventListener("DOMContentLoaded", () => {
  cargarCartasDeseadas();
  cargarCartasIntercambiables();

  // Formulario: añadir carta deseada ("Quiero obtener")
  const formDeseadas = document.getElementById("formDeseadas");
  if (formDeseadas) {
    formDeseadas.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("cardDeseada");
      const cardId = input.value.trim();
      if (!cardId) return;

      try {
        const res = await fetch("/api/trade/add", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId }),
        });
        const data = await res.json();
        if (data.success) {
          showToast("Carta añadida a tu colección deseada", "success");
          input.value = "";
          cargarCartasDeseadas();
        } else {
          showToast(`Error: ${data.message}`, "error");
        }
      } catch (err) {
        console.error("Error al añadir carta deseada:", err);
        showToast("Error al añadir carta deseada.", "error");
      }
    });
  }
});

// Sección "Quiero obtener": listar cartas deseadas
async function cargarCartasDeseadas() {
  const container = document.getElementById("coleccionContainer");
  container.innerHTML = "Cargando…";

  try {
    const res = await fetch("/api/trade/list", { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { success, cards } = await res.json();
    if (!success) {
      container.innerHTML = "Error al cargar colección deseada.";
      return;
    }
    container.innerHTML = cards.length
      ? ""
      : "<p>No tienes cartas deseadas.</p>";

    for (const cardId of cards) {
      let details;
      try {
        const r2 = await fetch(`/card/${cardId}`, { credentials: "include" });
        const json2 = await r2.json();
        details = json2.data;
      } catch {
        details = { images: { small: "" }, set: { name: "" }, number: cardId };
      }

      const col = document.createElement("div");
      col.className = "col-6 col-md-4 col-lg-3 col-xl-2 mb-3";
      col.innerHTML = `
        <div class="card h-100 inventory-card text-center shadow-sm">
          <img src="${details.images.small}" class="card-img-top p-1" alt="${details.name}" style="height:100px; object-fit:contain;">
          <div class="card-body p-1">
            <p class="card-text mb-1"><strong>Set:</strong> ${details.set.name}</p>
            <p class="card-text"><strong>N°:</strong> ${details.number}</p>
          </div>
        </div>`;
      container.appendChild(col);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = "Error al cargar colección deseada.";
  }
}

// Sección "Para intercambio": listar cartas disponibles para intercambiar
async function cargarCartasIntercambiables() {
  const container = document.getElementById("cartasIntercambiablesContainer");
  container.innerHTML = "Cargando…";

  try {
    const res = await fetch("/api/inventory", { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { success, cards } = await res.json();
    if (!success) {
      container.innerHTML = "Error al cargar cartas intercambiables.";
      return;
    }

    const tradables = cards.filter(c => c.isTradable === true);
    container.innerHTML = tradables.length
      ? ""
      : "<p>No tienes cartas disponibles para intercambio.</p>";

    for (const card of tradables) {
      let details;
      try {
        const r2 = await fetch(`/card/${card.id}`, { credentials: "include" });
        const json2 = await r2.json();
        details = json2.data;
      } catch {
        details = { images: { small: "" }, set: { name: "" }, number: card.id };
      }

      const col = document.createElement("div");
      col.className = "col-6 col-md-4 col-lg-3 col-xl-2 mb-3";
      col.innerHTML = `
        <div class="card h-100 inventory-card text-center shadow-sm">
          <img src="${details.images.small}" class="card-img-top p-1" alt="${details.name}" style="height:100px; object-fit:contain;">
          <div class="card-body p-1">
            <p class="card-text mb-1"><strong>Set:</strong> ${details.set.name}</p>
            <p class="card-text"><strong>N°:</strong> ${details.number}</p>
          </div>
        </div>`;
      container.appendChild(col);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = "Error al cargar cartas intercambiables.";
  }
}

// Función de feedback (puede cambiarse por un toast)
function showToast(message, type = "success") {
  const toastRoot = document.getElementById("toast-root");
  if (!toastRoot) {
    alert(message); // Fallback
    return;
  }

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
  toastRoot.appendChild(toast);

  setTimeout(() => {
      toast.remove();
  }, 3000);
}
