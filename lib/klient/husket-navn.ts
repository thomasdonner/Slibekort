// Husker det senest indtastede "udført af"-navn på selve enheden (fx
// iPad'en i sliberummet), så sliberen normalt bare skal bekræfte navnet
// i stedet for at skrive det igen for hver slibning — men kun i en time
// ad gangen, efter ønske, så et gammelt navn ikke bliver stående, hvis en
// anden sliber overtager uden at tænke over det. Rent klient-lager
// (localStorage), ikke noget serveren ved noget om.
import { HUSK_UDFOERT_AF_NAVN_MINUTTER } from "../delt-konto";

const NOEGLE = "slibekort:udfoert-af-navn";

type HusketNavn = { navn: string; tidspunkt: number };

/** Ren funktion, testet uden localStorage: er et gemt tidspunkt stadig frisk? */
export function erHusketNavnFrisk(gemtTidspunkt: number, nu: Date): boolean {
  const minutterSiden = (nu.getTime() - gemtTidspunkt) / 1000 / 60;
  return minutterSiden < HUSK_UDFOERT_AF_NAVN_MINUTTER;
}

/**
 * Det senest gemte navn, hvis det stadig er inden for timen — ellers en
 * tom streng, som om intet var gemt.
 */
export function hentHusketNavn(nu: Date = new Date()): string {
  try {
    const raa = window.localStorage.getItem(NOEGLE);
    if (!raa) return "";
    const gemt = JSON.parse(raa) as Partial<HusketNavn>;
    if (typeof gemt.navn !== "string" || typeof gemt.tidspunkt !== "number") {
      return "";
    }
    return erHusketNavnFrisk(gemt.tidspunkt, nu) ? gemt.navn : "";
  } catch {
    // Privat browsing eller blokeret storage — feltet er så bare tomt.
    return "";
  }
}

/** Gemmer navnet og fornyer timeren, kaldes efter en gennemført slibning. */
export function gemHusketNavn(navn: string, nu: Date = new Date()): void {
  try {
    const data: HusketNavn = { navn, tidspunkt: nu.getTime() };
    window.localStorage.setItem(NOEGLE, JSON.stringify(data));
  } catch {
    // Ikke kritisk — navnet skal bare skrives igen næste gang.
  }
}
