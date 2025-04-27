const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const previewContainer = document.getElementById("previewContainer");

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];
  if (!file) return;

  // Mostrar vista previa
  const reader = new FileReader();
  reader.onload = async () => {
    imagePreview.src = reader.result;
    imagePreview.style.display = "block";

    // OCR con Tesseract
    const result = await Tesseract.recognize(reader.result, 'eng', {
      logger: m => console.log(m)
    });

    const ocrText = result.data.text;
    console.log("Texto detectado:", ocrText);

    const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const probableName = lines[0] || "";

    if (!probableName) {
      return alert("No se detectó un nombre claro en la imagen.");
    }

    alert(`Nombre detectado: ${probableName}`);

    // Buscar en la API de Pokémon TCG
    const apiUrl = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(probableName)}"`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return alert("No se encontró ninguna carta con ese nombre.");
    }

    const card = data.data[0];
    console.log("Carta encontrada:", card);

    // Agregar al inventario
    const addRes = await fetch("/api/addCard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cardId: card.id })
    });

    if (addRes.ok) {
      alert(`Carta "${card.name}" agregada al inventario.`);
    } else {
      alert("Error al agregar la carta al inventario.");
    }
  };

  reader.readAsDataURL(file);
});
