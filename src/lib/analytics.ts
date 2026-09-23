// Instrumentación documentada por docs/MODELO_DE_NEGOCIOS.md §5, sin proveedor
// conectado todavía. Conectar un proveedor real (Plausible/Fathom/GA/...) es una
// decisión de servicio externo que requiere aprobación explícita del propietario
// (CLAUDE.md: "Pregunta antes de añadir un servicio de pago o cambiar el stack").
// Hasta entonces, `track` solo deja rastro en consola durante desarrollo.
export type AnalyticsEvent =
  | "view_profile"
  | "vote_submitted"
  | "claim_started"
  | "claim_completed"
  | "pricing_viewed"
  | "checkout_started"
  | "checkout_activated"
  | "list_created"
  | "export_requested";

export function track(event: AnalyticsEvent, props?: Record<string, string | number>): void {
  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${event}`, props ?? {});
  }
  // Sin proveedor conectado: no se envía nada a ningún servicio externo.
}
