import { describe, it, expect } from "vitest";
import { clsx } from "./clsx";

describe("clsx", () => {
  it("une clases truthy y descarta falsy", () => {
    expect(clsx("a", false, "b", null, undefined, "c")).toBe("a b c");
  });

  it("cadena vacía cuando no hay clases", () => {
    expect(clsx(false, null, undefined)).toBe("");
  });
});
