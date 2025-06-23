// filepath: netlify/functions/session.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCookies } from "https://deno.land/std@0.224.0/http/cookie.ts";

function handler(req: Request): Response {
    const cookies = getCookies(req.headers);
    const username = cookies.loggedInUser;

    if (username) {
        return new Response(JSON.stringify({ loggedIn: true, username }), {
            headers: { "Content-Type": "application/json" },
        });
    } else {
        return new Response(JSON.stringify({ loggedIn: false }), {
            headers: { "Content-Type": "application/json" },
        });
    }
}

serve(handler);