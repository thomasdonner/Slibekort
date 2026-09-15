import type { BetalingStatus } from "@prisma/client";

// Terminale hændelser hvor intet er indfriet — saldoen skal ikke røres.
// "authorized" og "captured" håndteres for sig, ikke via denne, fordi de
// udløser handling (indfrielse, kreditering), ikke bare en statusopdatering.
export function statusForAfvistHaendelse(navn: string): BetalingStatus | null {
  switch (navn) {
    case "epayments.payment.aborted.v1":
      return "afvist";
    case "epayments.payment.expired.v1":
      return "udloebet";
    case "epayments.payment.cancelled.v1":
    case "epayments.payment.terminated.v1":
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
