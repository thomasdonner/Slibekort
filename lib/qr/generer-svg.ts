import qrcode from "qrcode-generator";

// qrcode-generator har ingen eksterne afhængigheder og genererer allerede
// en fuldt skalerbar SVG selv (viewBox, ingen fast pixelstørrelse) — det
// er hvad print har brug for, ikke en fast bredde/højde i pixels.
//
// Klubbens logo ligger midt i koden. Det dækker en del af felterne, så
// koden laves med den højeste fejlkorrektion ("H": op til ca. 30 % af en
// kode kan være ødelagt eller dækket og stadig aflæses) — "M", som den
// tidligere brugte, tåler ikke et logo. Pladen bag logoet er holdt så lille,
// at den kun dækker en brøkdel af det, "H" kan rette; se testen, der
// aflæser en kode med pladen sort og hvid for sig.
export const FEJLKORREKTION = "H";
export const LOGO_STI = "/aaik-logo.svg";

// Faste mål i SVG'ens eget koordinatsystem. margin = 4 felter stille zone,
// som standarden kræver rundt om en kode.
const CELLE = 2;
const MARGEN = 4 * CELLE;
// Pladen (hvid baggrund bag logoet) som andel af kodens datafelt, og
// logoets andel af pladen — resten er hvid luft, så logoet ikke støder op
// til kodens egne felter.
export const LOGO_PLADE_ANDEL = 0.24;
const LOGO_ANDEL_AF_PLADE = 0.82;

/** Pladens og logoets placering, i felter regnet fra kodens øverste venstre hjørne. */
export function beregnLogoPlade(antalModuler: number) {
  const plade = antalModuler * LOGO_PLADE_ANDEL;
  const pladeStart = (antalModuler - plade) / 2;
  const logo = plade * LOGO_ANDEL_AF_PLADE;
  const logoStart = pladeStart + (plade - logo) / 2;
  return { pladeStart, plade, logoStart, logo };
}

export function genererQrSvg(indhold: string): string {
  const qr = qrcode(0, FEJLKORREKTION);
  qr.addData(indhold);
  qr.make();

  const svg = qr.createSvgTag({ cellSize: CELLE, margin: MARGEN, scalable: true });
  const { pladeStart, plade, logoStart, logo } = beregnLogoPlade(qr.getModuleCount());

  const tilSvg = (felter: number) => MARGEN + felter * CELLE;
  const logoTegning =
    `<rect x="${tilSvg(pladeStart)}" y="${tilSvg(pladeStart)}" ` +
    `width="${plade * CELLE}" height="${plade * CELLE}" rx="${CELLE}" fill="white"/>` +
    `<image href="${LOGO_STI}" x="${tilSvg(logoStart)}" y="${tilSvg(logoStart)}" ` +
    `width="${logo * CELLE}" height="${logo * CELLE}" preserveAspectRatio="xMidYMid meet"/>`;

  return svg.replace("</svg>", `${logoTegning}</svg>`);
}
