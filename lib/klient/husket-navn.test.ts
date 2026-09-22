import { describe, expect, it } from "vitest";
import { erHusketNavnFrisk } from "./husket-navn";

describe("erHusketNavnFrisk", () => {
  it("er frisk lige efter det er gemt", () => {
    const gemt = new Date("2026-01-01T10:00:00Z").getTime();
    const nu = new Date("2026-01-01T10:00:01Z");
    expect(erHusketNavnFrisk(gemt, nu)).toBe(true);
  });

  it("er stadig frisk lige under en time efter", () => {
    const gemt = new Date("2026-01-01T10:00:00Z").getTime();
    const nu = new Date("2026-01-01T10:59:59Z");
    expect(erHusketNavnFrisk(gemt, nu)).toBe(true);
  });

  it("er ikke længere frisk en time efter", () => {
    const gemt = new Date("2026-01-01T10:00:00Z").getTime();
    const nu = new Date("2026-01-01T11:00:00Z");
    expect(erHusketNavnFrisk(gemt, nu)).toBe(false);
  });

  it("er ikke frisk et godt stykke efter", () => {
    const gemt = new Date("2026-01-01T10:00:00Z").getTime();
    const nu = new Date("2026-01-01T14:00:00Z");
    expect(erHusketNavnFrisk(gemt, nu)).toBe(false);
  });
});
