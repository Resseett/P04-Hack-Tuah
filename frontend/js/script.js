let currentPage = 1;
let totalPages = 1;
let lastQuery = "";

async function buscarCarta(page = 1) {
  const cardName = document.getElementById("cardId").value.trim();
  const setId = document.getElementById("setSelect")?.value || "";
  const supertype = document.getElementById("supertypeSelect")?.value || "";
  const type = document.getElementById("typeSelect")?.value || "";
  const subtype = document.getElementById("subtypeSelect")?.value || "";
  const rarity = document.getElementById("raritySelect")?.value || "";

  if (!cardName && !setId && !supertype && !subtype && !type && !rarity) return;

  const div = document.getElementById("resultado");
  const pagDiv = document.getElementById("paginacion");
  div.innerHTML = "<p>🔎 Buscando cartas...</p>";
  if (pagDiv) pagDiv.innerHTML = "";

  try {
    let query = [];
    if (cardName) query.push(`name:${cardName}`);
    if (setId) query.push(`set.id:${setId}`);
    if (supertype) query.push(`supertype:${supertype}`);
    if (subtype) query.push(`subtypes:${subtype}`);
    if (type) query.push(`types:${type}`);
    if (rarity) query.push(`rarity:${rarity}`);
    const q = query.join(" ");
    lastQuery = q;

    const pageSize = 30;
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`);
    const data = await res.json();

    currentPage = page;
    totalPages = Math.ceil((data.totalCount || 0) / pageSize);

    if (data?.data?.length > 0) {
      div.innerHTML = "";

      data.data.forEach(carta => {
        const cartaDiv = document.createElement("div");
        cartaDiv.className = "carta";

        const precio = carta.cardmarket?.prices?.averageSellPrice
          ? `$${carta.cardmarket.prices.averageSellPrice.toFixed(2)}`
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

      renderPaginacion(currentPage, totalPages);
    } else {
      div.innerHTML = "<p>❌ No se encontraron cartas con ese nombre.</p>";
    }
  } catch (error) {
    console.error("Error al buscar carta:", error);
    div.innerHTML = "<p>⚠️ Hubo un error al cargar las cartas.</p>";
  }
}

function renderPaginacion(page, total) {
  let pagDiv = document.getElementById("paginacion");
  if (!pagDiv) {
    pagDiv = document.createElement("div");
    pagDiv.id = "paginacion";
    document.getElementById("resultado").after(pagDiv);
  }

  pagDiv.innerHTML = "";

  const prevBtn = crearBotonNav("Anterior", page > 1, () => buscarCarta(page - 1));
  pagDiv.appendChild(prevBtn);

  let start = Math.max(1, page - 3);
  let end = Math.min(total, page + 3);

  if (start > 1) {
    pagDiv.appendChild(crearBotonPagina(1, page));
    if (start > 2) pagDiv.appendChild(crearElipsis());
  }

  for (let i = start; i <= end; i++) {
    pagDiv.appendChild(crearBotonPagina(i, page));
  }

  if (end < total) {
    if (end < total - 1) pagDiv.appendChild(crearElipsis());
    pagDiv.appendChild(crearBotonPagina(total, page));
  }

  const nextBtn = crearBotonNav("Siguiente", page < total, () => buscarCarta(page + 1));
  pagDiv.appendChild(nextBtn);
}

function crearBotonNav(texto, enabled, onClick) {
  const btn = document.createElement("button");
  btn.textContent = texto;
  btn.className = "paginacion-btn";
  btn.disabled = !enabled;
  if (enabled) btn.onclick = onClick;
  return btn;
}

function crearBotonPagina(num, actual) {
  const btn = document.createElement("button");
  btn.textContent = num;
  btn.className = "paginacion-btn";
  if (num === actual) {
    btn.disabled = true;
    btn.classList.add("active");
    btn.setAttribute("aria-current", "page");
  } else {
    btn.onclick = () => buscarCarta(num);
  }
  return btn;
}

function crearElipsis() {
  const span = document.createElement("span");
  span.className = "elipsis";
  span.textContent = "...";
  return span;
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

function showToast(mensaje, success = true) {
  let toastRoot = document.getElementById("toast-root");
  if (!toastRoot) {
    toastRoot = document.createElement("div");
    toastRoot.id = "toast-root";
    toastRoot.style.position = "fixed";
    toastRoot.style.bottom = "10px";
    toastRoot.style.right = "10px";
    toastRoot.style.zIndex = "9999";
    document.body.appendChild(toastRoot);
  }

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white ${success ? 'bg-success' : 'bg-danger'} border-0 m-2`;
  toast.role = "alert";
  toast.style.display = "block";
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
