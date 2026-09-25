// Fase 7 (docs/PLAN_DE_TRABAJO.md): callback de OAuth de TikTok Login Kit.
// TikTok exige que el intercambio del "code" por el token ocurra en un servidor
// (necesita el client_secret), nunca en el navegador — por eso esto vive acá y
// no en el sitio estático. Ver docs/FUENTES_DE_DATOS.md > TikTok.
//
// Flujo: creador.astro arma la URL de autorización con state=<influencer_id>
// (el perfil que la persona ya seleccionó como "soy yo") -> TikTok redirige acá
// con ?code=...&state=... -> esto cambia el code por tokens, guarda el
// refresh_token cifrado en creator_tokens, y redirige de vuelta al sitio.
//
// Secretos de esta función (Supabase → Edge Functions → Secrets, no confundir
// con los GitHub Secrets del pipeline):
//   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI,
//   TIKTOK_TOKEN_KEY (clave AES-256-GCM en base64, compartida con
//   pipeline/sources/tiktok.ts para poder descifrar del otro lado),
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const SITE_URL = "https://fykin.com";

function redirectTo(path: string): Response {
  return new Response(null, { status: 302, headers: { Location: `${SITE_URL}${path}` } });
}

async function encrypt(plainText: string, keyB64: string): Promise<string> {
  const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plainText),
  );
  // iv + ciphertext, todo en un solo base64 (pipeline/sources/tiktok.ts lo separa igual).
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code || !state) {
    return redirectTo(`/es/creador/?tiktok=error`);
  }
  const influencerId = state;

  const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY")!;
  const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET")!;
  const redirectUri = Deno.env.get("TIKTOK_REDIRECT_URI")!;
  const tokenKey = Deno.env.get("TIKTOK_TOKEN_KEY")!;

  try {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      console.error("tiktok oauth/token failed", tokenRes.status, await tokenRes.text());
      return redirectTo(`/es/creador/?tiktok=error`);
    }
    const tokenData = await tokenRes.json();
    const refreshToken: string | undefined = tokenData.refresh_token;
    const accessToken: string | undefined = tokenData.access_token;
    if (!refreshToken || !accessToken) {
      return redirectTo(`/es/creador/?tiktok=error`);
    }

    const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=username", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = userRes.ok ? await userRes.json() : null;
    const username: string = userData?.data?.user?.username ?? "";

    const encryptedRefreshToken = await encrypt(refreshToken, tokenKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/creator_tokens`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        influencer_id: influencerId,
        platform: "tiktok",
        refresh_token_encrypted: encryptedRefreshToken,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!upsertRes.ok) {
      console.error("creator_tokens upsert failed", upsertRes.status, await upsertRes.text());
      return redirectTo(`/es/creador/?tiktok=error`);
    }

    return redirectTo(`/es/creador/?tiktok=linked&username=${encodeURIComponent(username)}`);
  } catch (err) {
    console.error("tiktok-callback unexpected error", err);
    return redirectTo(`/es/creador/?tiktok=error`);
  }
});
