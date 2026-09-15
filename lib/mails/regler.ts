// Kravspecifikationen, afsnit 8: "Advarsel ved saldo 1, rykker ved 0 og
// igen ved −2." To skabeloner (advarsel, rykker), tre udløsningspunkter —
// rykkeren bruges både ved 0 og ved −2.

export type MailTrin = "advarsel" | "rykker";

export function bestemMailTrin(saldo: number): MailTrin | null {
  if (saldo === 1) return "advarsel";
  if (saldo === 0 || saldo <= -2) return "rykker";
  return null;
}

export const PAAMINDELSE_SPAERRETID_TIMER = 48;

/**
 * "Maksimalt én påmindelse pr. spiller pr. 48 timer" — gælder på tværs af
 * advarsel og rykker, ikke pr. type. Kvitteringer er ikke påmindelser og
 * er ikke omfattet.
 */
export function erIndenforPaamindelsesspaerretid(
  sidstPaamindet: Date | null,
  nu: Date,
): boolean {
  if (!sidstPaamindet) return false;
  const timerSiden = (nu.getTime() - sidstPaamindet.getTime()) / 1000 / 60 / 60;
  return timerSiden < PAAMINDELSE_SPAERRETID_TIMER;
}

export type PaamindelseKandidat = {
  spillerId: string;
  navn: string;
  saldo: number;
  sidstPaamindet: Date | null;
};

export type UdvalgtPaamindelse = {
  spillerId: string;
  navn: string;
  trin: MailTrin;
};

/**
 * Kravspecifikationen, afsnit 5.5/6: "Søskende med lav saldo samme dag →
 * Én samlet mail." Kandidaterne her er alle børn af ÉN voksen — det er op
 * til kalderen at gruppere efter modtager, denne funktion vælger bare
 * hvem af dem der reelt skal nævnes lige nu.
 */
export function udvaelgTilPaamindelse(
  kandidater: PaamindelseKandidat[],
  nu: Date,
): UdvalgtPaamindelse[] {
  const udvalgte: UdvalgtPaamindelse[] = [];
  for (const k of kandidater) {
    const trin = bestemMailTrin(k.saldo);
    if (!trin) continue;
    if (erIndenforPaamindelsesspaerretid(k.sidstPaamindet, nu)) continue;
    udvalgte.push({ spillerId: k.spillerId, navn: k.navn, trin });
  }
  return udvalgte;
}
