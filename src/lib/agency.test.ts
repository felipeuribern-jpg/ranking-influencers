import { describe, expect, it } from "vitest";
import { agencyMetrics, maxFreshFollowers, type AgencyInput } from "./agency.js";

const p = (followers: number, extra: Partial<{ followers30: number; er: number; stale: boolean; points: number }> = {}) => ({
  followers,
  followers30: extra.followers30 ?? null,
  er: extra.er ?? null,
  points: extra.points ?? 1000,
  stale: extra.stale ?? false,
});

describe("agencyMetrics", () => {
  const messi: AgencyInput = { instagram: p(516_000_000) };
  const nicki: AgencyInput = { youtube: p(5_580_000, { er: 5.16 }), tiktok: p(16_000_000), instagram: p(22_000_000) };
  const max = maxFreshFollowers([messi, nicki]);

  it("el alcance usa la red vigente más grande, con escala logarítmica", () => {
    expect(max).toBe(516_000_000);
    expect(agencyMetrics(messi, {}, max).reach?.index).toBe(100);
    expect(agencyMetrics(nicki, {}, max).reach).toMatchObject({ platform: "instagram", index: 71 });
  });

  it("sin tasa de interacción o sin mediana no se inventa dato", () => {
    expect(agencyMetrics(messi, { youtube: 3 }, max).interaction).toBeNull();
    expect(agencyMetrics({ youtube: p(1_000_000, { er: 4 }) }, {}, max).interaction).toBeNull();
  });

  it("interacción: 1,67 veces la mediana es alta y solo cuenta las redes con dato", () => {
    const m = agencyMetrics(nicki, { youtube: 3.09 }, max).interaction!;
    expect(m.level).toBe("high");
    expect(m.platforms).toEqual(["youtube"]);
    expect(m.ratio).toBeCloseTo(1.67, 1);
  });

  it("el crecimiento exige datos de hace 30 días", () => {
    expect(agencyMetrics(nicki, {}, max).growth).toBeNull();
    const g = agencyMetrics({ tiktok: p(1_100_000, { followers30: 1_000_000 }) }, {}, max).growth!;
    expect(g.value).toBeCloseTo(0.1, 5);
    expect(g.index).toBe(43);
  });

  it("la confianza cuenta las 3 redes principales con dato vigente", () => {
    expect(agencyMetrics(nicki, {}, max).confidence).toEqual({ level: "good", fresh: 3 });
    expect(agencyMetrics(messi, {}, max).confidence).toEqual({ level: "partial", fresh: 1 });
    expect(agencyMetrics({ ...messi, tiktok: p(1_000_000) }, {}, max).confidence.level).toBe("medium");
  });

  it("una red vencida (stale) no cuenta como dato vigente", () => {
    const old: AgencyInput = { youtube: p(10_000_000, { stale: true, points: 0 }), instagram: p(2_000_000) };
    const m = agencyMetrics(old, {}, max);
    expect(m.reach?.platform).toBe("instagram");
    expect(m.confidence.fresh).toBe(1);
  });
});
