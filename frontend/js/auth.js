// filepath: c:\Users\manue\OneDrive\Documentos\GitHub\P04-Hack-Tuah\frontend\js\auth.js
const SUPABASE_SESSION_KEY = 'supabase.auth.token';

function getSession() {
    const sessionData = localStorage.getItem(SUPABASE_SESSION_KEY);
    if (!sessionData) return null;
    try {
        return JSON.parse(sessionData);
    } catch {
        return null;
    }
}

function saveSession(session) {
    localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem(SUPABASE_SESSION_KEY);
}

async function checkAuth() {
    const session = getSession();
    const userIsLoggedIn = session && session.access_token;
    const currentPage = window.location.pathname.split('/').pop();
    const authPages = ['login.html', 'signup.html'];

    if (userIsLoggedIn && authPages.includes(currentPage)) {
        // Si el usuario está logueado y en una página de login/signup, lo redirige al inventario
        window.location.href = '/inventory.html';
    } else if (!userIsLoggedIn && !authPages.includes(currentPage)) {
        // Si el usuario NO está logueado y NO está en una página de login/signup, lo redirige al login
        window.location.href = '/login.html';
    }
}

// Ejecuta la comprobación de autenticación en cada carga de página
document.addEventListener('DOMContentLoaded', checkAuth);