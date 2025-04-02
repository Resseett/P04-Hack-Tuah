async function buscarCarta() {
    const cardId = document.getElementById("cardId").value.trim();
    if (!cardId) return;
  
    const res = await fetch(`/card/${cardId}`);
    const data = await res.json();
  
    const div = document.getElementById("resultado");
    if (data?.data?.name) {
      div.innerHTML = `
        <h2>${data.data.name}</h2>
        <img src="${data.data.images.large}" alt="${data.data.name}" />
        <p><strong>Tipo:</strong> ${data.data.types?.join(", ")}</p>
      `;
    } else {
      div.innerHTML = "<p>❌ Carta no encontrada</p>";
    }
  }