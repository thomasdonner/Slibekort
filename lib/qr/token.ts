/**
 * Den trykte QR-kode indeholder en fuld URL (${APP_URL}/betal/<token>),
 * ikke bare token'et alene — det er det, der gør at en almindelig telefons
 * kamera kan åbne betalingssiden ved blot at fotografere koden, jf.
 * kravspecifikationens afsnit 10. Sliberens egen scanning møder derfor
 * også en URL, ikke et bart token, og skal trække token'et ud af den.
 *
 * Virker også med et bart token uden skråstreger, til manuel indtastning
 * og test — se lib/qr/token.test.ts.
 */
export function udtraekQrToken(raaVaerdi: string): string {
  const udenForespoergsel = raaVaerdi.trim().split(/[?#]/)[0];
  const dele = udenForespoergsel.split("/").filter(Boolean);
  return dele[dele.length - 1] || raaVaerdi.trim();
}
