// Fase 6.2 (docs/PLAN_DE_TRABAJO.md): alerta de caducidad del token de Meta.
// El token de larga duración de META_ACCESS_TOKEN dura ~60 días y no se
// renueva solo. Sin esta alerta, Instagram/Facebook dejarían de traer datos
// en silencio el día que caduque (run.ts simplemente cae a `baseline`).
//
// Uso: npx tsx pipeline/check-meta-token.ts
// Sale con código 1 si el token ya caducó, es inválido, o le quedan 7 días
// o menos — así update.yml puede abrir un issue cuando este paso falla.
import "dotenv/config";

const WARN_DAYS_BEFORE_EXPIRY = 7;

async function main(): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    console.log("META_ACCESS_TOKEN no está configurado: nada que revisar.");
    return;
  }

  const url = new URL("https://graph.facebook.com/v21.0/debug_token");
  url.searchParams.set("input_token", token);
  url.searchParams.set("access_token", token);

  const res = await fetch(url);
  const body = await res.json();

  if (!res.ok || body.data?.is_valid === false) {
    console.error(`El token de Meta ya no es válido: ${JSON.stringify(body)}`);
    process.exit(1);
  }

  const expiresAt: number = body.data?.expires_at ?? 0;
  if (expiresAt === 0) {
    console.log("El token de Meta no tiene fecha de caducidad (o no se pudo leer). Sin alerta.");
    return;
  }

  const daysLeft = Math.floor((expiresAt * 1000 - Date.now()) / (24 * 60 * 60 * 1000));
  const expiryDate = new Date(expiresAt * 1000).toISOString().slice(0, 10);

  if (daysLeft <= WARN_DAYS_BEFORE_EXPIRY) {
    console.error(`El token de Meta caduca el ${expiryDate} (en ${daysLeft} día(s)). Hay que renovarlo.`);
    process.exit(1);
  }

  console.log(`Token de Meta OK: caduca el ${expiryDate} (en ${daysLeft} días).`);
}

main().catch((err) => {
  console.error("No se pudo verificar el token de Meta:", err);
  process.exit(1);
});
