document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");

  form.addEventListener("submit", async (e) => {
      e.preventDefault(); // 🔥 Evitar comportamiento tradicional

      const username = document.getElementById("newUser").value;
      const password = document.getElementById("newPass").value;

      try {
          const res = await fetch("/api/signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
          });

          const data = await res.json();

          if (data.success) {
              showToast(data.message, "success");
              setTimeout(() => {
                  window.location.href = "/login";
              }, 1500);
          } else {
              showToast(data.message, "error");
          }
      } catch (error) {
          showToast("Error en el servidor", "error");
          console.error(error);
      }
  });
});

// Función para mostrar un toast (igual que en login.js)
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
