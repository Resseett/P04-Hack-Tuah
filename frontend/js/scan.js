import Tesseract from 'https://esm.sh/tesseract.js@4.0.2';
import ColorThief from 'https://esm.sh/colorthief@2.3.2';

const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const resultBox = document.getElementById('scanResult');
const colorThief = new ColorThief();

let tipoCartaDetectado = null; // Guardar tipo predicho

imageInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    imagePreview.src = e.target.result;
    imagePreview.style.display = 'block';

    imagePreview.onload = async () => {
      resultBox.innerHTML = "<p class='scan-loading'>Procesando imagen...</p>";

      let uploadedColor;
      try {
        uploadedColor = colorThief.getColor(imagePreview);
      } catch {
        resultBox.innerHTML = `<p class="scan-error">No se pudo detectar el color.</p>`;
        return;
      }

      // 1. Preprocesamiento: binarización y contraste
      let nombreDetectado = await extraerNombreDesdeImagen(imagePreview);

      // 2. Predice el tipo de carta (Pokémon, Trainer, Energy)
      tipoCartaDetectado = await predecirTipoCarta(imagePreview);

      let cleanedName = limpiarNombre(nombreDetectado);

      // 3. Permitir corrección manual
      resultBox.innerHTML = `
        <label for="nombreManual"><strong>Nombre detectado:</strong></label>
        <input id="nombreManual" type="text" value="${cleanedName || ''}" style="width: 60%; margin: 0 8px;">
        <button id="buscarBtn">Buscar</button>
        <div id="sugerencias"></div>
      `;

      document.getElementById('buscarBtn').onclick = async () => {
        const nombreFinal = document.getElementById('nombreManual').value.trim();
        await mostrarResultados(nombreFinal, uploadedColor, tipoCartaDetectado);
      };

      // Búsqueda automática inicial
      await mostrarResultados(cleanedName, uploadedColor, tipoCartaDetectado);
    };
  };
  reader.readAsDataURL(file);
});

async function mostrarResultados(nombre, uploadedColor, tipoCarta) {
  const resultBox = document.getElementById('scanResult');
  let cards = await buscarCartas(nombre, tipoCarta);

  // Si no hay resultados, muestra sugerencias de nombres populares
  if (cards.length === 0) {
    resultBox.querySelector('#sugerencias').innerHTML = `
      <p class="scan-error">No se encontraron cartas con ese nombre.</p>
      <p><strong>Sugerencias:</strong></p>
      <div id="sugerencias-list"></div>
    `;
    const sugerencias = await sugerirNombres(nombre, tipoCarta);
    const lista = document.getElementById('sugerencias-list');
    sugerencias.forEach(sug => {
      const btn = document.createElement('button');
      btn.textContent = sug;
      btn.onclick = async () => {
        document.getElementById('nombreManual').value = sug;
        await mostrarResultados(sug, uploadedColor, tipoCarta);
      };
      lista.appendChild(btn);
    });
    return;
  }

  // Muestra las coincidencias
  resultBox.querySelector('#sugerencias').innerHTML = `<p class="scan-info"><strong>Coincidencias encontradas:</strong></p>`;
  const container = document.createElement('div');
  container.className = 'card-matches-container';
  resultBox.querySelector('#sugerencias').appendChild(container);

  const scoredCards = await Promise.all(cards.map(async (card) => {
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = card.images.small;
      await new Promise(resolve => img.onload = resolve);
      const cardColor = colorThief.getColor(img);
      const dist = Math.sqrt(
        (uploadedColor[0] - cardColor[0]) ** 2 +
        (uploadedColor[1] - cardColor[1]) ** 2 +
        (uploadedColor[2] - cardColor[2]) ** 2
      );
      return { card, dist };
    } catch {
      return null;
    }
  }));

  const matches = scoredCards.filter(Boolean).sort((a, b) => a.dist - b.dist).slice(0, 3);

  matches.forEach(({ card }) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card-suggestion";
    cardDiv.innerHTML = `
      <img src="${card.images.small}" alt="${card.name}" class="card-img"><br>
      <p class="card-name"><strong>Nombre:</strong> ${card.name}</p>
      <p class="card-id"><strong>ID:</strong> ${card.id}</p>
      <p class="card-set"><strong>Set:</strong> ${card.set?.name || 'Desconocido'}</p>
      <button id="add-${card.id}" class="add-btn">Añadir al inventario</button>
    `;

    cardDiv.querySelector('button').onclick = async () => {
      await agregarAlInventario(card.id, cardDiv);
    };

    container.appendChild(cardDiv);
  });
}

// --- Lógica de agregar al inventario (adaptada de script.js) ---
async function agregarAlInventario(cardId, cardDiv) {
  try {
    const res = await fetch("/api/inventory/add", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId })
    });

    const data = await res.json();

    if (data.success) {
      const boton = cardDiv.querySelector(`#add-${cardId}`);
      if (boton) {
        boton.textContent = "Agregado ✅";
        boton.classList.remove('btn-success');
        boton.classList.add('btn-secondary');
        boton.disabled = true;
      }
      mostrarToast("✅ Carta agregada al inventario.");
    } else {
      mostrarToast("❌ Error al agregar: " + data.message, false);
    }
  } catch (error) {
    console.error("Error al agregar carta:", error);
    mostrarToast("⚠️ Error de conexión.", false);
  }
}

function mostrarToast(mensaje, success = true) {
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

// --- Resto de funciones sin cambios ---
async function buscarCartas(nombre, tipoCarta) {
  if (!nombre) return [];
  let query = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(nombre)}"`;
  if (tipoCarta && tipoCarta !== 'Desconocido') {
    query += `+supertype:"${encodeURIComponent(tipoCarta)}"`;
  }
  let res = await fetch(query);
  let data = await res.json();
  if (data.data && data.data.length > 0) return data.data;
  // Si no hay resultados, busca solo por el nombre base (sin sufijo)
  let base = nombre.replace(/\s?(EX|GX|VMAX|VSTAR|V)\s?/gi, '').trim();
  if (base !== nombre) {
    query = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(base)}"`;
    if (tipoCarta && tipoCarta !== 'Desconocido') {
      query += `+supertype:"${encodeURIComponent(tipoCarta)}"`;
    }
    res = await fetch(query);
    data = await res.json();
    return data.data || [];
  }
  return [];
}

function limpiarNombre(texto) {
  let linea = texto.split('\n')[0];
  linea = linea.replace(/[^a-zA-Z0-9\s\-EXVMAXGXSTAR]+/gi, '').replace(/\s+/g, ' ').trim();
  linea = linea.replace(/ex/gi, 'EX').replace(/gx/gi, 'GX').replace(/vmax/gi, 'VMAX').replace(/vstar/gi, 'VSTAR').replace(/v/gi, 'V');
  return linea;
}

let listaNombres = null;
async function sugerirNombres(nombre, tipoCarta) {
  if (!listaNombres) {
    let nombres = [];
    let page = 1;
    let totalPages = 1;
    do {
      let url = `https://api.pokemontcg.io/v2/cards?pageSize=250&page=${page}`;
      if (tipoCarta && tipoCarta !== 'Desconocido') {
        url += `&q=supertype:"${encodeURIComponent(tipoCarta)}"`;
      }
      const res = await fetch(url);
      const data = await res.json();
      nombres = nombres.concat(data.data.map(card => card.name));
      if (data.totalCount) {
        totalPages = Math.ceil(data.totalCount / 250);
      }
      page++;
    } while (page <= totalPages && page <= 4);
    listaNombres = [...new Set(nombres)];
  }
  // Fuzzy match con los nombres
  let scores = listaNombres.map(n => ({ n, score: similitud(nombre.toLowerCase(), n.toLowerCase()) }));
  scores = scores.sort((a, b) => b.score - a.score).slice(0, 5);
  return scores.map(s => s.n);
}

async function predecirTipoCarta(img) {
  const regionTipo = cropImageRegion(img, { x: 0.02, y: 0.01, width: 0.25, height: 0.08 }, 2.0);
  const canvas = binarizarCanvas(regionTipo);
  try {
    const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    });
    const t = text.trim().toLowerCase();
    if (t.includes('pokémon') || t.includes('pokemon')) return 'Pokémon';
    if (t.includes('trainer')) return 'Trainer';
    if (t.includes('energy')) return 'Energy';
    return 'Desconocido';
  } catch {
    return 'Desconocido';
  }
}

function binarizarCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const avg = (imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) / 3;
    const val = avg > 128 ? 255 : 0;
    imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = val;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function cropImageRegion(img, region, scale = 1.5) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  canvas.width = region.width * w;
  canvas.height = region.height * h;
  ctx.drawImage(
    img,
    region.x * w, region.y * h, region.width * w, region.height * h,
    0, 0, region.width * w, region.height * h
  );
  return canvas;
}

async function extraerNombreDesdeImagen(img) {
  const regionNombre = cropImageRegion(img, { x: 0.05, y: 0.03, width: 0.7, height: 0.20 }, 1.6);
  const regionSufijo = cropImageRegion(img, { x: 0.75, y: 0.03, width: 0.18, height: 0.20 }, 1.6);

  const runOCR = async (canvas) => {
    const binCanvas = binarizarCanvas(canvas);
    try {
      const { data: { text } } = await Tesseract.recognize(binCanvas, 'eng', {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -:'
      });
      return text.trim();
    } catch {
      return '';
    }
  };

  let nombre = await runOCR(regionNombre);
  let sufijo = await runOCR(regionSufijo);

  let sufijoDetectado = '';
  if (/EX/i.test(sufijo)) sufijoDetectado = 'EX';
  if (/GX/i.test(sufijo)) sufijoDetectado = 'GX';
  if (/VMAX/i.test(sufijo)) sufijoDetectado = 'VMAX';
  if (/VSTAR/i.test(sufijo)) sufijoDetectado = 'VSTAR';
  if (/V/i.test(sufijo)) sufijoDetectado = 'V';

  if (sufijoDetectado && !nombre.toUpperCase().includes(sufijoDetectado)) {
    nombre = `${nombre} ${sufijoDetectado}`;
  }

  if (!nombre || nombre.length < 2) {
    const fullCanvas = cropImageRegion(img, { x: 0, y: 0, width: 1, height: 1 }, 1);
    nombre = await runOCR(fullCanvas);
  }
  return nombre;
}

function similitud(a, b) {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const inter = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return inter.size / union.size;
}