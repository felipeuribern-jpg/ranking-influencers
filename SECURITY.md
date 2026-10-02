# Política de seguridad

## Cómo avisar de una vulnerabilidad

Escribe al responsable del proyecto por correo o abre un aviso privado en la pestaña **Security** de
este repositorio de GitHub. No publiques detalles en una incidencia pública hasta que esté corregido.

## Qué no debe estar nunca en el repositorio

Claves de API, tokens, la clave `service_role` de Supabase ni cualquier secreto: viven en GitHub Secrets
o en los secretos de las Edge Functions. Si una clave se expone, se revoca y se reemplaza de inmediato.

## Reglas técnicas vigentes

- Las tablas de Supabase tienen RLS; los tokens de TikTok solo los lee `service_role`.
- El vínculo con TikTok exige sesión, un reclamo de perfil aprobado y un `state` firmado que caduca
  (`supabase/functions/tiktok-start` y `tiktok-callback`).
- No se hace scraping: solo APIs oficiales y datos cargados a mano con su fuente.
