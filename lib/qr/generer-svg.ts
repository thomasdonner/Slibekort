import qrcode from "qrcode-generator";

// qrcode-generator har ingen eksterne afhængigheder og genererer allerede
// en fuldt skalerbar SVG selv (viewBox, ingen fast pixelstørrelse) — det
// er hvad print har brug for, ikke en fast bredde/højde i pixels.
export function genererQrSvg(indhold: string): string {
  const qr = qrcode(0, "M");
  qr.addData(indhold);
  qr.make();
  return qr.createSvgTag({ scalable: true });
}
