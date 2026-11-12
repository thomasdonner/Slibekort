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

// Til siden, hvor et helt holds numre tastes ind på én gang. Tager holdets
// nuværende spillere og de værdier, formularen sendte (spiller-id → tekst),
// og siger hvilke der skal skrives, og hvilke der er ugyldige. Kun rækker, hvor
// værdien faktisk er ændret, skrives — en spiller, der ikke er med i
// formularen, røres ikke. Intet skrives, hvis blot én værdi er ugyldig.
export type NummerRettelse = { spillerId: string; vaerdi: string | null };

export function findNummerRettelser(
  spillere: { id: string; navn: string; nummer: string | null }[],
  indsendt: Map<string, string>,
):
  | { ok: true; rettelser: NummerRettelse[] }
  | { ok: false; fejl: string[] } {
  const rettelser: NummerRettelse[] = [];
  const fejl: string[] = [];

  for (const spiller of spillere) {
    const raa = indsendt.get(spiller.id);
    if (raa === undefined) continue;

    const renset = rensSpillerNummer(raa);
    if (!renset.ok) {
      fejl.push(`${spiller.navn}: ${renset.fejl}`);
    } else if (renset.vaerdi !== spiller.nummer) {
      rettelser.push({ spillerId: spiller.id, vaerdi: renset.vaerdi });
    }
  }

  return fejl.length > 0 ? { ok: false, fejl } : { ok: true, rettelser };
}
