document.addEventListener('DOMContentLoaded', function () {
  fetch('/components/navbar.html')
    .then(response => response.text())
    .then(data => {
      document.getElementById('navbar').innerHTML = data;

      // Disparar evento para avisar que el navbar está listo
      document.dispatchEvent(new Event('navbar-ready'));

      const searchInput = document.getElementById('navbarSearch');
      const searchButton = document.getElementById('navbarSearchBtn');

      searchButton.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (query) {
          try {
            const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data?.data?.length > 0) {
              // Save results to sessionStorage and redirect to Pokedex
              sessionStorage.setItem('searchResults', JSON.stringify(data.data));
              window.location.href = '/pokedex';
            } else {
              alert("❌ No se encontraron cartas con ese nombre.");
            }
          } catch (error) {
            console.error("Error al buscar cartas:", error);
            alert("⚠️ Hubo un error al buscar las cartas.");
          }
        }
      });

      searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          searchButton.click();
        }
      });
    });
});
