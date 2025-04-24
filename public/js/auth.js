document.addEventListener("navbar-ready", async () => {
    async function waitForUserSession(retries = 10, delay = 100) {
        for (let i = 0; i < retries; i++) {
            const res = await fetch("/api/session", { credentials: "include" }); // 🔥 Incluir credenciales
            const data = await res.json();
            if (data.loggedInUser) return data.loggedInUser;
            await new Promise((r) => setTimeout(r, delay));
        }
        return null;
    }

    try {
        const username = await waitForUserSession();

        const userStatusElement = document.getElementById("userStatus");
        const welcomeText = document.getElementById("welcomeText");
        const loginBtn = document.getElementById("loginBtn");
        const logoutBtn = document.getElementById("logoutBtn");

        const indexLoginBtn = document.querySelector(".btn-primary[href='/login']");
        const indexSignupBtn = document.querySelector(".btn-secondary[href='/signup']");

        const loggedIn = !!username;

        if (userStatusElement) {
            userStatusElement.textContent = loggedIn
                ? `Bienvenido, ${username}`
                : "No has iniciado sesión";
        }

        if (welcomeText) {
            welcomeText.textContent = loggedIn
                ? `Bienvenido, ${username}, ¿Qué carta buscas hoy día?`
                : "¿Qué carta buscas hoy día?";
        }

        if (loginBtn) loginBtn.style.display = loggedIn ? "none" : "inline";
        if (logoutBtn) logoutBtn.style.display = loggedIn ? "inline" : "none";

        if (indexLoginBtn) indexLoginBtn.style.display = loggedIn ? "none" : "inline-block";
        if (indexSignupBtn) indexSignupBtn.style.display = loggedIn ? "none" : "inline-block";

        if (logoutBtn) {
            logoutBtn.addEventListener("click", async () => {
                await fetch("/api/logout", { method: "POST", credentials: "include" });
                window.location.reload();
            });
        }
    } catch (err) {
        console.error("Error verificando sesión:", err);
    }
});
