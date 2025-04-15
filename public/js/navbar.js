document.addEventListener('DOMContentLoaded', function () {
  fetch('/components/navbar.html')
    .then(response => response.text())
    .then(data => {
      document.getElementById('navbar').innerHTML = data;

      // Disparar evento para avisar que el navbar está listo
      document.dispatchEvent(new Event('navbar-ready'));
    });
});
