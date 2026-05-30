import { describe, it, expect } from "vitest";
import {
  CHALLENGES,
  getChallenge,
  evalChallenge,
  isUnlocked,
  totalStars,
  MAX_STARS,
  MAX_STARS_PER_LEVEL,
  type Progress,
} from "./challenges";
import type { Category } from "./types";

const sel = (...cats: Category[]) => cats.map((category) => ({ category }));

describe("evalChallenge — niveles de 3 estrellas progresivas", () => {
  const casual = getChallenge("casual")!;

  it("sin prendas: 0 estrellas y no completado", () => {
    const r = evalChallenge(casual, []);
    expect(r.stars).toBe(0);
    expect(r.complete).toBe(false);
  });

  it("blusa → 1★; +pantalón → 2★; +zapatos → 3★", () => {
    expect(evalChallenge(casual, sel("top")).stars).toBe(1);
    expect(evalChallenge(casual, sel("top", "bottom")).stars).toBe(2);
    expect(evalChallenge(casual, sel("top", "bottom", "shoes")).stars).toBe(3);
    expect(evalChallenge(casual, sel("top")).complete).toBe(true);
  });

  it("minimalista: respeta el máximo de prendas", () => {
    const mini = getChallenge("mini")!;
    expect(evalChallenge(mini, sel("top")).stars).toBe(1); // 1 prenda (max 2)
    expect(evalChallenge(mini, sel("top", "bottom")).stars).toBe(2); // exacto 2
    // 3 prendas rompe "máximo 2" -> 0 estrellas
    expect(evalChallenge(mini, sel("top", "bottom", "shoes")).stars).toBe(0);
  });

  it("cada nivel define exactamente 3 metas", () => {
    for (const ch of CHALLENGES) {
      expect(ch.tiers).toHaveLength(3);
    }
  });
});

describe("desbloqueo (modo historia)", () => {
  it("el primer nivel siempre está desbloqueado", () => {
    expect(isUnlocked(0, {})).toBe(true);
  });

  it("el segundo se desbloquea al completar el primero", () => {
    expect(isUnlocked(1, {})).toBe(false);
    const progress: Progress = {
      [CHALLENGES[0].id]: { stars: 1, completedAt: 0 },
    };
    expect(isUnlocked(1, progress)).toBe(true);
  });
});

describe("conteo de estrellas", () => {
  it("suma el progreso", () => {
    const progress: Progress = {
      a: { stars: 2, completedAt: 0 },
      b: { stars: 3, completedAt: 0 },
    };
    expect(totalStars(progress)).toBe(5);
  });

  it("MAX_STARS = niveles × 3", () => {
    expect(MAX_STARS).toBe(CHALLENGES.length * MAX_STARS_PER_LEVEL);
  });
});
