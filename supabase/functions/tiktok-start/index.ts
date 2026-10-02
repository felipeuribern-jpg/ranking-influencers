// Inicio del vínculo con TikTok (docs/AUDITORIA-2026-10-02.md, A2).
// Antes el navegador armaba la URL de autorización con state=<id del perfil>, así
// que cualquiera podía vincular su TikTok al perfil de otra persona. Ahora la URL
// la arma esta función y solo si (1) la persona inició sesión y (2) tiene un
// reclamo APROBADO sobre ese perfil (profile_claims, aprobación manual). El state
// va firmado y caduca (supabase/functions/_shared/state.ts).
//
// Secretos (Supabase → Edge Functions → Secrets):
//   TIKTOK_CLIENT_KEY, TIKTOK_REDIRECT_URI, TIKTOK_STATE_SECRET (cadena larga y
//   aleatoria, la misma que usa tiktok-callback), SUPABASE_URL,
//   SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY (estas tres las inyecta Supabase).

import { signState } from "../_shared/state.ts";

const SITE_URL = "https://fykin.com";

const cors = {
  "Access-Control-Allow-Origin": SITE_URL,
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stateSecret = Deno.env.get("TIKTOK_STATE_SECRET");
  const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
  const redirectUri = Deno.env.get("TIKTOK_REDIRECT_URI");
  if (!stateSecret || !clientKey || !redirectUri) return json({ error: "not_configured" }, 500);

  // 1. ¿Quién es? Se valida el JWT de la sesión contra Supabase Auth.
  const authorization = req.headers.get("Authorization") ?? "";
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  if (!userRes.ok) return json({ error: "unauthorized" }, 401);
  const user = (await userRes.json()) as { id?: string };
  if (!user.id) return json({ error: "unauthorized" }, 401);

  let influencerId = "";
  try {
    influencerId = String(((await req.json()) as { influencer_id?: string }).influencer_id ?? "");
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (!/^[a-z0-9-]{1,80}$/.test(influencerId)) return json({ error: "bad_request" }, 400);

  // 2. ¿Tiene un reclamo aprobado sobre ese perfil?
  const claimRes = await fetch(
    `${supabaseUrl}/rest/v1/profile_claims?claimant_id=eq.${user.id}&influencer_id=eq.${influencerId}&status=eq.approved&select=id&limit=1`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  );
  const claims = claimRes.ok ? ((await claimRes.json()) as unknown[]) : [];
  if (claims.length === 0) return json({ error: "claim_not_approved" }, 403);

  // 3. URL de autorización con el state firmado.
  const state = await signState({ influencerId, userId: user.id }, stateSecret);
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("scope", "user.info.basic,user.info.stats,video.list");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return json({ url: url.toString() });
});
