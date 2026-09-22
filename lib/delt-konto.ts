// Regler for delte konti (fx en iPad der står fast i sliberummet, brugt
// af skiftende slibere) — se CLAUDE.md for baggrunden. Adskilt fra
// lib/slibning.ts, som er selve slibe-reglerne (spærretid,
// fortrydelsesvindue); det her handler om hvem der udførte den, ikke om
// hvornår den må laves.

export const MAKS_UDFOERT_AF_NAVN_LAENGDE = 80;

// Tilfældigvis samme antal minutter som SPAERRETID_MINUTTER i
// lib/slibning.ts — det er en selvstændig beslutning, ikke den samme
// regel genbrugt. Ret den ene uden at røre den anden.
export const HUSK_UDFOERT_AF_NAVN_MINUTTER = 60;

/**
 * Er navnet, sliberen skrev på en delt konto, gyldigt til at gemme på en
 * bevaegelse? Kun et ikke-tomt, ikke-alt-for-langt fritekstfelt — ingen
 * grund til at kræve mere end det.
 */
export function erGyldigtUdfoertAfNavn(navn: string): boolean {
  const trimmet = navn.trim();
  return trimmet.length > 0 && trimmet.length <= MAKS_UDFOERT_AF_NAVN_LAENGDE;
}
