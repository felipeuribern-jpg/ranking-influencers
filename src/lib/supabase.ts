// Cliente de Supabase con la clave anónima (nunca la service_role, esa es solo
// del pipeline). Ver docs/ARQUITECTURA.md y supabase/schema.sql.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function votingConfigured(): boolean {
  return Boolean(import.meta.env.PUBLIC_SUPABASE_URL) && Boolean(import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
}

let client: SupabaseClient | null = null;

// Una sola instancia por pestaña: crear varios clientes duplica el manejo de
// sesión (GoTrueClient) y Supabase emite advertencias en consola por eso.
export function getSupabaseClient(): SupabaseClient {
  if (!votingConfigured()) {
    throw new Error("Supabase no está configurado (faltan PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY)");
  }
  if (!client) {
    client = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
