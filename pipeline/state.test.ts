import { describe, expect, it } from "vitest";
import { signState, verifyState } from "../supabase/functions/_shared/state.js";

// Estado firmado del OAuth de TikTok (docs/AUDITORIA-2026-10-02.md, A2).
describe("estado firmado de TikTok", () => {
  const secret = "secreto-de-prueba";
  const input = { influencerId: "auronplay", userId: "usuario-1" };

  it("acepta un estado recién firmado y devuelve perfil y persona", async () => {
    const token = await signState(input, secret, 1_000);
    const state = await verifyState(token, secret, 2_000);
    expect(state?.influencerId).toBe("auronplay");
    expect(state?.userId).toBe("usuario-1");
  });

  it("rechaza un state en claro (el formato anterior, solo el id del perfil)", async () => {
    expect(await verifyState("auronplay", secret)).toBeNull();
  });

  it("rechaza un estado firmado con otro secreto", async () => {
    const token = await signState(input, "otro-secreto", 1_000);
    expect(await verifyState(token, secret, 2_000)).toBeNull();
  });

  it("rechaza un estado manipulado: cambiar el perfil invalida la firma", async () => {
    const token = await signState(input, secret, 1_000);
    const [, signature] = token.split(".");
    const forged = btoa(JSON.stringify({ ...input, influencerId: "otra-persona", expiresAt: 9e15, nonce: "x" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifyState(`${forged}.${signature}`, secret, 2_000)).toBeNull();
  });

  it("rechaza un estado caducado (más de 10 minutos)", async () => {
    const token = await signState(input, secret, 1_000);
    expect(await verifyState(token, secret, 1_000 + 10 * 60 * 1000 + 1)).toBeNull();
  });

  it("no firma ni verifica sin secreto", async () => {
    await expect(signState(input, "")).rejects.toThrow();
    const token = await signState(input, secret);
    expect(await verifyState(token, "")).toBeNull();
  });
});
