// filepath: netlify/functions/login.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { setCookie } from "https://deno.land/std@0.224.0/http/cookie.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { MongoClient } from "mongodb";

const client = new MongoClient(Deno.env.get("MONGO_URI") || "");

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(null, { status: 405, statusText: "Method Not Allowed" });
  }

  try {
    const { username, password } = await req.json();
    await client.connect();
    const usersCollection = client.db("Usuarios").collection("usuarios");
    const user = await usersCollection.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
      const headers = new Headers();
      setCookie(headers, {
        name: "loggedInUser",
        value: username,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ success: true }), { headers });
    } else {
      return new Response(JSON.stringify({ success: false, message: "Credenciales incorrectas" }), { status: 401 });
    }
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ success: false, message: "Error interno del servidor" }), { status: 500 });
  } finally {
    await client.close();
  }
}

serve(handler);