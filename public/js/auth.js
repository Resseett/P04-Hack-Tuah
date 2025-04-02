document.addEventListener("DOMContentLoaded", async () => {
    const response = await fetch("/api/session", { credentials: "include" });
    const data = await response.json();

    const userStatusElement = document.getElementById("userStatus");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (data.loggedInUser) {
        userStatusElement.textContent = `Bienvenido, ${data.loggedInUser}`;
        loginBtn.style.display = "none";  // Ocultar botón de login
        logoutBtn.style.display = "inline";  // Mostrar botón de logout
    } else {
        userStatusElement.textContent = "No has iniciado sesión";
        loginBtn.style.display = "inline";  // Mostrar botón de login
        logoutBtn.style.display = "none";  // Ocultar botón de logout
    }

    logoutBtn.addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST", credentials: "include" });

        // Redirigir a la página principal
        window.location.reload();
    });
});
