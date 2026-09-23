// Cliente de Supabase con la clave anónima (nunca la service_role, esa es solo
// del pipeline). Ver docs/ARQUITECTURA.md y PLAN_DE_TRABAJO.md Fase 5.
//
// Todavía no hay proyecto de Supabase conectado (paso [usuario] pendiente), así
// que este módulo no importa `@supabase/supabase-js` hasta que se agregue en esa
// fase — mientras tanto solo expone si la votación está disponible, para que los
// componentes puedan mostrar «Disponible próximamente» sin romper el build.
export function votingConfigured(): boolean {
  return Boolean(import.meta.env.PUBLIC_SUPABASE_URL) && Boolean(import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
}
