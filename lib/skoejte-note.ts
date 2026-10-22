// Fritekst om en spillers skøjte (hulning), vist til sliberen ved
// scanning. Samme regler overalt, både i overblikkets Server Action og i
// sliberens API-rute, så de to veje ind ikke kan tillade forskellige ting.
export const MAKS_SKOEJTE_NOTE_LAENGE = 500;

export function rensSkoejteNote(
  raa: string,
): { ok: true; vaerdi: string | null } | { ok: false; fejl: string } {
  const tekst = raa.trim();
  if (tekst.length > MAKS_SKOEJTE_NOTE_LAENGE) {
    return {
      ok: false,
      fejl: `Noten må højst være ${MAKS_SKOEJTE_NOTE_LAENGE} tegn.`,
    };
  }
  // En tom note betyder "ingen note" (null), ikke en tom streng — så
  // visningen kan skelne "intet noteret" uden at tjekke begge dele.
  return { ok: true, vaerdi: tekst === "" ? null : tekst };
}
