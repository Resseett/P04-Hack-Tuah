document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    form.addEventListener("submit", async (event) => {
        event.preventDefault(); // 🔥 ¡Evitar que se envíe el formulario tradicional!

        const username = document.getElementById("user").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // 🔥 Cookies para sesión
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Aquí deberías mostrar tu toast de éxito
                showToast("Inicio de sesión exitoso", "success");
                setTimeout(() => {
                    window.location.href = "/";
                }, 1500);
            } else {
                showToast(data.message || "Usuario o contraseña incorrectos", "error");
            }
        } catch (error) {
            showToast("Error en el servidor", "error");
            console.error(error);
        }
    });
});

// Función para mostrar un toast
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
