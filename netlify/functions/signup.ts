import type { Context } from "@netlify/functions";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { MongoClient } from "npm:mongodb@6.17.0";

const client = new MongoClient(Deno.env.get("MONGO_URI") || "");

export default async (req: Request, context: Context): Promise<Response> => {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ success: false, message: "Method Not Allowed" }), { status: 405 });
    }
    try {
        const { username, password } = await req.json();
        if (!username || !password) {
            return new Response(JSON.stringify({ success: false, message: "Usuario y contraseña requeridos" }), { status: 400 });
        }
        await client.connect();
        const usersCollection = client.db("Usuarios").collection("usuarios");
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return new Response(JSON.stringify({ success: false, message: "El usuario ya existe" }), { status: 409 });
        }
        const hashedPassword = await bcrypt.hash(password);
        await usersCollection.insertOne({ username, password: hashedPassword, inventory: [] });
        return new Response(JSON.stringify({ success: true, message: "Usuario registrado" }), { status: 201 });
    } catch (error) {
        console.error("An error occurred in the signup function:", error);
        return new Response(JSON.stringify({ success: false, message: "Error interno del servidor" }), { status: 500 });
    } finally {
        await client.close();
    }
};