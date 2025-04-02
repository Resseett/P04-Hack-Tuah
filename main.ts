import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Ruta: /card/xy7-54
  const match = pathname.match(/^\/card\/(.+)$/);

  if (match) {
    const cardId = match[1];

    try {
      const apiUrl = `https://api.pokemontcg.io/v2/cards/${cardId}`;
      const response = await fetch(apiUrl, {
        headers: {
          "X-Api-Key": "", // Opcional
        },
      });

      if (!response.ok) {
        return new Response("Error buscando la carta", { status: 500 });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response("Error interno", { status: 500 });
    }
  }

  // Ruta por defecto
  return new Response("¡Bienvenido a la PokéAPI en Deno! Usa /card/xy7-54");
});