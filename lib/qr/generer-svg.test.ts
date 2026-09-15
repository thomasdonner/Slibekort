import { describe, expect, it } from "vitest";
import { genererQrSvg } from "./generer-svg";

describe("genererQrSvg", () => {
  it("laver en skalerbar svg", () => {
    const svg = genererQrSvg("https://slibekort.aalborgishockey.dk/betal/abc123");
    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox");
  });

  it("er deterministisk — samme indhold giver samme kode", () => {
    const a = genererQrSvg("https://x/betal/abc123");
    const b = genererQrSvg("https://x/betal/abc123");
    expect(a).toBe(b);
  });

  it("forskelligt indhold giver forskellig kode", () => {
    const a = genererQrSvg("https://x/betal/abc123");
    const b = genererQrSvg("https://x/betal/xyz789");
    expect(a).not.toBe(b);
  });
});
