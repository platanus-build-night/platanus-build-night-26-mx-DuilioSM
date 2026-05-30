import { describe, it, expect } from "vitest";
import {
  hasDressGarment,
  hasBottomGarment,
  dressRuleFor,
  garmentList,
  buildTryonPrompt,
} from "./tryon-prompt";

describe("detección de prendas", () => {
  it("detecta vestido por categoría", () => {
    expect(hasDressGarment([{ category: "dress" }])).toBe(true);
  });

  it("detecta vestido por nombre aunque la categoría no esté puesta", () => {
    expect(hasDressGarment([{ category: "other", name: "Vestido floral" }])).toBe(
      true,
    );
    expect(hasDressGarment([{ name: "summer dress" }])).toBe(true);
  });

  it("no marca vestido para una blusa", () => {
    expect(hasDressGarment([{ category: "top", name: "blusa azul" }])).toBe(
      false,
    );
  });

  it("detecta prenda inferior", () => {
    expect(hasBottomGarment([{ category: "bottom" }])).toBe(true);
    expect(hasBottomGarment([{ category: "top" }])).toBe(false);
  });
});

describe("regla del vestido (determinista)", () => {
  it("vestido SIN pantalón → solo el vestido, elimina lo de abajo", () => {
    const rule = dressRuleFor([{ category: "dress" }]);
    expect(rule).toContain("ONLY the dress");
    expect(rule).toMatch(/REMOVE the original/i);
  });

  it("vestido CON pantalón → en capas", () => {
    const rule = dressRuleFor([{ category: "dress" }, { category: "bottom" }]);
    expect(rule).toMatch(/layer the dress OVER/i);
  });

  it("sin vestido → regla genérica de respaldo", () => {
    const rule = dressRuleFor([{ category: "top" }]);
    expect(rule).toMatch(/If any provided garment is a dress/i);
  });
});

describe("lista de prendas", () => {
  it("numera y muestra nombre + categoría", () => {
    const list = garmentList([
      { name: "Blusa", category: "top" },
      { name: "Jeans", category: "bottom" },
    ]);
    expect(list).toContain("1. Blusa (top)");
    expect(list).toContain("2. Jeans (bottom)");
  });
});

describe("buildTryonPrompt", () => {
  it("incluye el bloqueo de identidad, cuerpo completo y las prendas", () => {
    const prompt = buildTryonPrompt([{ name: "Blusa verde", category: "top" }]);
    expect(prompt).toMatch(/IDENTITY LOCK/);
    expect(prompt).toMatch(/ALWAYS SHOW THE FULL BODY/);
    expect(prompt).toContain("Blusa verde (top)");
  });

  it("aplica la regla fuerte del vestido cuando solo hay vestido", () => {
    const prompt = buildTryonPrompt([{ category: "dress", name: "Vestido" }]);
    expect(prompt).toContain("ONLY the dress");
  });
});
