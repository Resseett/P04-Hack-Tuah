document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("user").value;
        const password = document.getElementById("password").value;

        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" }, // 🔥 Asegurar que sea JSON
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            alert("Inicio de sesión exitoso");
            window.location.href = "/";
        } else {
            alert("Usuario o contraseña incorrectos");
        }
    });
});