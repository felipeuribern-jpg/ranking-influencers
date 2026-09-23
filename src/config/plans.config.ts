// Planes y precios del modelo de negocios (docs/MODELO_DE_NEGOCIOS.md, sección 3).
// Solo configuración: sin lógica de cobro, sin secretos. La página de precios
// (src/pages/[lang]/precios.astro) es la única que lee este archivo.
//
// Los textos (nombre, descripción, features) viven en i18n bajo la clave
// `plan.<id>.*`, no acá, para mantener una sola fuente de traducciones.
// Los precios son orientativos (docs/MODELO_DE_NEGOCIOS.md §3) y están en
// dólares estadounidenses, sin impuestos — ver ese documento antes de publicar
// cifras definitivas.

export type PlanId =
  | "creatorVerified"
  | "creatorPro"
  | "brandStarter"
  | "agencyPro"
  | "enterprise";

export interface Plan {
  id: PlanId;
  /** USD/mes. `null` = "Desde $X" o "a medida" (Enterprise), ver `priceIsFrom`. */
  priceUsd: number;
  priceIsFrom: boolean;
  featureCount: number;
  highlighted: boolean;
}

export const plans: Plan[] = [
  { id: "creatorVerified", priceUsd: 9.9, priceIsFrom: false, featureCount: 3, highlighted: false },
  { id: "creatorPro", priceUsd: 19, priceIsFrom: false, featureCount: 3, highlighted: false },
  { id: "brandStarter", priceUsd: 99, priceIsFrom: false, featureCount: 3, highlighted: true },
  { id: "agencyPro", priceUsd: 249, priceIsFrom: false, featureCount: 3, highlighted: false },
  { id: "enterprise", priceUsd: 750, priceIsFrom: true, featureCount: 3, highlighted: false },
];
