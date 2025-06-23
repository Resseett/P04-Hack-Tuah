import type { Context } from "@netlify/functions";
import { getCookies } from "https://deno.land/std@0.224.0/http/cookie.ts";

export default (req: Request, context: Context): Response => {
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
};