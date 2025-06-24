ue\OneDrive\Documentos\GitHub\P04-Hack-Tuah\frontend\js\signup.js
document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("user").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm_password").value;

        if (password !== confirmPassword) {
            showToast("Las contraseñas no coinciden", "error");
            return;
        }

        try {
            const response = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                showToast("¡Registro exitoso! Serás redirigido para iniciar sesión.", "success");
                setTimeout(() => {
                    window.location.href = "/login.html"; // Redirige a la página de login
                }, 2000);
            } else {
                showToast(data.error || "Error en el registro. El usuario puede que ya exista.", "error");
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