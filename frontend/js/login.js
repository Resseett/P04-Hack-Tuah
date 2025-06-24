document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("user").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Ya no se usa 'credentials: include', la sesión se maneja con tokens.
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            // La respuesta de Supabase es 'ok' y contiene un access_token en caso de éxito.
            if (response.ok && data.access_token) {
                saveSession(data); // Guarda la sesión completa en localStorage (función de auth.js)
                showToast("Inicio de sesión exitoso", "success");
                setTimeout(() => {
                    window.location.href = "/inventory.html"; // Redirige al inventario
                }, 1500);
            } else {
                showToast(data.error_description || data.error || "Usuario o contraseña incorrectos", "error");
            }
        } catch (error) {
            showToast("Error en el servidor", "error");
            console.error(error);
        }
    });
});

// Función para mostrar un toast (debe estar disponible o importada)
function showToast(message, type) {
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
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}