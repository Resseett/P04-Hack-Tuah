import Tesseract from 'https://esm.sh/tesseract.js@4.0.2';
import ColorThief from 'https://esm.sh/colorthief@2.3.2';

const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const resultBox = document.getElementById('scanResult');
const colorThief = new ColorThief();

imageInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    imagePreview.src = e.target.result;
    imagePreview.style.display = 'block';

    // Esperar a que se cargue la imagen para detectar el color
    imagePreview.onload = async () => {
      resultBox.innerHTML = "<p class='scan-loading'>Procesando imagen...</p>";

      // Obtener color dominante
      let uploadedColor;
      try {
        uploadedColor = colorThief.getColor(imagePreview);
      } catch (err) {
        resultBox.innerHTML = `<p class="scan-error">No se pudo detectar el color.</p>`;
        return;
      }

      // OCR
      const { data: { text } } = await Tesseract.recognize(imagePreview, 'eng');
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      let rawName = lines[0] || '';
      let cleanedName = rawName.replace(/[^a-zA-Z\s]/g, '').trim();

// Eliminar prefijos comunes tipo "L", "EX", "GX", "P", etc.
      cleanedName = cleanedName.replace(/\b(?:EX|GX|V|VSTAR|VMAX|L|P|1P|Lv|LvX|Mega)\b/gi, '').trim();

// Fallback: última palabra significativa
      const fallbackName = cleanedName.split(" ").pop();

      resultBox.innerHTML = `
        <p class="scan-info"><strong>Nombre detectado:</strong> ${cleanedName || '(sin detectar)'}</p>
      `;

      // Búsqueda por nombre
      let cards = await buscarCartas(cleanedName);
      if (cards.length === 0 && fallbackName.length > 2) {
        cards = await buscarCartas(fallbackName);
      }

      if (cards.length === 0) {
        resultBox.innerHTML += `<p class="scan-error">No se encontraron cartas con ese nombre.</p>`;
        return;
      }

      // Ordenar por similitud de color
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

      resultBox.innerHTML += `<p class="scan-info"><strong>Coincidencias encontradas:</strong></p>`;
      const container = document.createElement('div');
      container.className = 'card-matches-container';
      resultBox.appendChild(container);
      matches.forEach(({ card }) => {
        const cardDiv = document.createElement("div");
        cardDiv.className = "card-suggestion";
        cardDiv.innerHTML = `
          <img src="${card.images.small}" alt="${card.name}" class="card-img"><br>
          <p class="card-name"><strong>Nombre:</strong> ${card.name}</p>
          <p class="card-id"><strong>ID:</strong> ${card.id}</p>
          <p class="card-set"><strong>Set:</strong> ${card.set?.name || 'Desconocido'}</p>
          <button class="add-btn" data-id="${card.id}">Añadir al inventario</button>
          `;
        cardDiv.querySelector('button').onclick = async () => {
          const res = await fetch('/api/add-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: card.id })
          });
          if (res.ok) {
            cardDiv.innerHTML += `<p class="scan-success">¡Añadida al inventario!</p>`;
          } else {
            cardDiv.innerHTML += `<p class="scan-error">Error al añadir.</p>`;
          }
        };
        container.appendChild(cardDiv);
      });
    };
  };
  reader.readAsDataURL(file);
});

async function buscarCartas(nombre) {
  const query = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(nombre)}"`;
  const res = await fetch(query);
  const data = await res.json();
  return data.data || [];
}
