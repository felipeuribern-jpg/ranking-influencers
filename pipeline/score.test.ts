import { describe, expect, it } from "vitest";
import {
  comparePeople,
  engagementFactor,
  growthFactor,
  platformPoints,
  publicPoints,
} from "./score.js";
import { PLATFORM_WEIGHTS } from "./config.js";

// Los 8 casos de la sección «Pruebas» de docs/FORMULA.md.
describe("FORMULA.md — pruebas", () => {
  it("1. 1.000.000 seguidores, er y crecimiento nulos, Instagram ≈ 2004,3", () => {
    const points = platformPoints(
      PLATFORM_WEIGHTS.instagram,
      { followers: 1_000_000, followers30: null, er: null },
      null,
    );
    expect(points).toBeCloseTo(2004.3, 1);
  });

  it("2. mismo caso en YouTube ≈ 2405,2", () => {
    const points = platformPoints(
      PLATFORM_WEIGHTS.youtube,
      { followers: 1_000_000, followers30: null, er: null },
      null,
    );
    expect(points).toBeCloseTo(2405.2, 1);
  });

  it("3. er = 4×mediana → f_interac = 2; er = 0,01×mediana → 0,5 (tope)", () => {
    expect(engagementFactor(4, 1)).toBeCloseTo(2, 10);
    expect(engagementFactor(0.01, 1)).toBeCloseTo(0.5, 10);
  });

  it("4. crecimiento +80% → f_impulso = 1,5; −50% → 0,8", () => {
    expect(growthFactor(180, 100)).toBeCloseTo(1.5, 10);
    expect(growthFactor(50, 100)).toBeCloseTo(0.8, 10);
  });

  it("5. puntos_redes=10.000 y 1.000.000 de votos → puntos_publico = 1.000 (tope 10%)", () => {
    expect(publicPoints(10_000, 1_000_000)).toBeCloseTo(1000, 6);
  });

  it("6. 0 votos → puntos_publico = 0", () => {
    expect(publicPoints(10_000, 0)).toBe(0);
  });

  it("7. desempate por nombre funciona con acentos (localeCompare sensitivity base)", () => {
    const base = { total: 100, networkPoints: 100, totalFollowers: 1000 };
    const a = { ...base, name: "Álvaro" };
    const b = { ...base, name: "Bruno" };
    expect(comparePeople(a, b)).toBeLessThan(0);

    const c = { ...base, name: "úrsula" };
    const d = { ...base, name: "Ursula" };
    expect(comparePeople(c, d)).toBe(0);
  });

  it("8. red stale hace 31 días → aporta 0 puntos", () => {
    const points = platformPoints(
      PLATFORM_WEIGHTS.tiktok,
      { followers: 1_000_000, followers30: null, er: null, daysSinceUpdate: 31 },
      null,
    );
    expect(points).toBe(0);
  });
});

// docs/MODELO_DE_NEGOCIOS.md: "ningún plan, suscripción, reclamo o patrocinio
// puede alterar el ranking". Candado automático: si alguien agrega un campo de
// pago al input y accidentalmente lo usa dentro de score.ts, este test lo detecta.
describe("MODELO_DE_NEGOCIOS.md — el pago nunca puede tocar el puntaje", () => {
  it("platformPoints ignora cualquier propiedad ajena a la fórmula (p. ej. `sponsored`)", () => {
    const sample = { followers: 5_000_000, followers30: 4_500_000, er: 3.2 };
    const sampleWithPaymentField = { ...sample, sponsored: true, plan: "agencyPro" };

    const withoutPayment = platformPoints(PLATFORM_WEIGHTS.instagram, sample, 3);
    const withPayment = platformPoints(
      PLATFORM_WEIGHTS.instagram,
      sampleWithPaymentField as typeof sample,
      3,
    );

    expect(withPayment).toBe(withoutPayment);
  });
});
