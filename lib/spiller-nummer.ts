// Spillerens nummer, vist på QR-arket. Samme regler overalt, hvor det
// rettes. Højst fire tegn: et trøjenummer er et eller to cifre, og den
// korte grænse holder det til et nummer og forhindrer, at feltet bruges
// til fritekst (det er skøjtenotens opgave).
export const MAKS_SPILLER_NUMMER_LAENGE = 4;

export function rensSpillerNummer(
  raa: string,
): { ok: true; vaerdi: string | null } | { ok: false; fejl: string } {
  // Et "#" foran er en naturlig vane ("#7"), men det er kortet, der sætter
  // tegnet på — gemmes det også, står der "##7".
  const tekst = raa.trim().replace(/^#\s*/, "");
  if (tekst.length > MAKS_SPILLER_NUMMER_LAENGE) {
    return {
      ok: false,
      fejl: `Nummeret må højst være ${MAKS_SPILLER_NUMMER_LAENGE} tegn.`,
    };
  }
  if (/\s/.test(tekst)) {
    return { ok: false, fejl: "Nummeret må ikke indeholde mellemrum." };
  }
  // Tomt felt betyder "intet nummer" (null), ikke en tom streng.
  return { ok: true, vaerdi: tekst === "" ? null : tekst };
}
