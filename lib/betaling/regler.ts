import type { BetalingStatus } from "@prisma/client";

// Terminale hændelser hvor intet er indfriet — saldoen skal ikke røres.
// "AUTHORIZED" og "CAPTURED" håndteres for sig, ikke via denne, fordi de
// udløser handling (indfrielse, kreditering), ikke bare en statusopdatering.
//
// Navnene er dem, MobilePay skriver i selve webhook-beskeden (`name`:
// "AUTHORIZED", store bogstaver) — ikke de lange hændelsestyper
// ("epayments.payment.authorized.v1"), som kun bruges, når webhooken
// registreres. Det blev først opdaget ved den første rigtige betaling.
export function statusForAfvistHaendelse(navn: string): BetalingStatus | null {
  switch (navn) {
    case "ABORTED":
      return "afvist";
    case "EXPIRED":
      return "udloebet";
    case "CANCELLED":
    case "TERMINATED":
      return "annulleret";
    default:
      return null;
  }
}

// Kravspecifikationen, afsnit 7: "Forælderen betaler to gange → Begge
// betalinger registreres. Kassereren får en advarsel om mulig
// dobbeltbetaling." Begge betalinger skal stadig gennemføres — det her
// afgør kun om der skal sættes en bemærkning på, ikke om den afvises.
export const DOBBELTBETALING_VINDUE_MINUTTER = 60;

export function erMuligDobbeltbetaling(
  tidligereGennemfoerteTidspunkter: Date[],
  nu: Date,
): boolean {
  return tidligereGennemfoerteTidspunkter.some((tidspunkt) => {
    const minutterSiden = (nu.getTime() - tidspunkt.getTime()) / 1000 / 60;
    return minutterSiden < DOBBELTBETALING_VINDUE_MINUTTER;
  });
}
