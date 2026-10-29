import qrcode from "qrcode-generator";
import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { FEJLKORREKTION, beregnLogoPlade, genererQrSvg, LOGO_STI } from "./generer-svg";

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

  it("indeholder klubbens logo midt i koden", () => {
    const svg = genererQrSvg("https://x/betal/abc123");
    expect(svg).toContain(`<image href="${LOGO_STI}"`);
    // Logoet kommer efter selve kodens felter, så det tegnes ovenpå.
    expect(svg.indexOf("<image")).toBeGreaterThan(svg.indexOf("<path"));
  });
});

// Det vigtigste: koden skal stadig kunne aflæses med logoet i midten. Vi
// tegner kodens felter som et billede, dækker logopladen — først med hvidt,
// derefter med helt sort, som begge er værre end et rigtigt logo — og
// aflæser billedet med jsQR, det samme bibliotek sliberens scanner bruger.
function aflaes(indhold: string, daekning: "hvid" | "sort"): string | null {
  const qr = qrcode(0, FEJLKORREKTION);
  qr.addData(indhold);
  qr.make();
  const n = qr.getModuleCount();

  const PIXEL = 6;
  const STILLE = 4;
  const bredde = (n + 2 * STILLE) * PIXEL;
  const data = new Uint8ClampedArray(bredde * bredde * 4).fill(255);

  const maal = (x: number, y: number, farve: number) => {
    const i = (y * bredde + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = farve;
    data[i + 3] = 255;
  };

  const { pladeStart, plade } = beregnLogoPlade(n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const iPlade =
        c >= pladeStart && c < pladeStart + plade && r >= pladeStart && r < pladeStart + plade;
      const mørk = iPlade ? daekning === "sort" : qr.isDark(r, c);
      for (let dy = 0; dy < PIXEL; dy++) {
        for (let dx = 0; dx < PIXEL; dx++) {
          maal((c + STILLE) * PIXEL + dx, (r + STILLE) * PIXEL + dy, mørk ? 0 : 255);
        }
      }
    }
  }

  return jsQR(data, bredde, bredde)?.data ?? null;
}

describe("en kode med logo kan stadig aflæses", () => {
  // En nyere kode får en uuid som token (36 tegn), en ældre en cuid (25) —
  // begge længder, så også den største kode (version 8) er med.
  const cuid = () => "c" + Math.random().toString(36).slice(2, 12).padEnd(24, "x");
  const adresser = [
    ...Array.from({ length: 25 }, () => `https://slibekort.aaik.dk/betal/${cuid()}`),
    ...Array.from({ length: 25 }, () => `https://slibekort.aaik.dk/betal/${crypto.randomUUID()}`),
  ];

  it.each(["hvid", "sort"] as const)("når pladen dækkes %s", (daekning) => {
    for (const adresse of adresser) {
      expect(aflaes(adresse, daekning)).toBe(adresse);
    }
  });

  it("dækker kun en lille del af kodens felter", () => {
    const { plade } = beregnLogoPlade(41);
    expect((plade / 41) ** 2).toBeLessThan(0.08);
  });
});
