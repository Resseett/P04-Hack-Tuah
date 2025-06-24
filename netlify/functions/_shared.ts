import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Headers para permitir peticiones desde tu frontend (Cross-Origin Resource Sharing)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // En producción, cámbialo a tu dominio de Netlify
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
};

// Función para crear un cliente de Supabase
export function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_KEY')!
  );
}

// Helper para obtener el ID de usuario desde la cookie de autenticación de Supabase
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;

    try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_KEY')!, {
            global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || null;
    } catch (e) {
        console.error("Error getting user from token:", e);
        return null;
    }
}