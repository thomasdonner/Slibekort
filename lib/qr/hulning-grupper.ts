// Skøjtenoten er fri tekst, så to spillere kan have skrevet "1/2 tomme" og
// "1/2 Tomme" — det skal ende i samme gruppe på QR-arket. Sammenligningen
// ser bort fra store/små bogstaver og ekstra mellemrum; teksten, der vises
// som gruppens overskrift, er den første stavemåde, der blev set.
export function normaliserHulning(note: string | null): string | null {
  if (!note) return null;
  const renset = note.trim().replace(/\s+/g, " ").toLowerCase();
  return renset === "" ? null : renset;
}

export type HulningGruppe<T> = {
  // null = spillere uden en noteret hulning.
  noegle: string | null;
  navn: string | null;
  spillere: T[];
};

/**
 * Deler spillerne i grupper efter hulning, så alle skøjter, der skal have
 * samme hulning, kan printes og slibes sammen. Grupper med en hulning
 * står alfabetisk, "ingen hulning noteret" sidst, og spillerne i hver
 * gruppe står alfabetisk efter navn.
 */
export function grupperEfterHulning<T extends { navn: string; skoejteNote: string | null }>(
  spillere: T[],
): HulningGruppe<T>[] {
  const grupper = new Map<string | null, HulningGruppe<T>>();

  for (const spiller of spillere) {
    const noegle = normaliserHulning(spiller.skoejteNote);
    let gruppe = grupper.get(noegle);
    if (!gruppe) {
      gruppe = {
        noegle,
        navn: noegle === null ? null : (spiller.skoejteNote as string).trim().replace(/\s+/g, " "),
        spillere: [],
      };
      grupper.set(noegle, gruppe);
    }
    gruppe.spillere.push(spiller);
  }

  const resultat = [...grupper.values()];
  for (const gruppe of resultat) {
    gruppe.spillere.sort((a, b) => a.navn.localeCompare(b.navn, "da"));
  }
  return resultat.sort((a, b) => {
    if (a.noegle === null) return 1;
    if (b.noegle === null) return -1;
    // numeric: tal sorteres som tal — "Hulning 9" før "Hulning 15", ikke
    // efter, som en ren tegn-for-tegn-sortering ville gøre.
    return a.noegle.localeCompare(b.noegle, "da", { numeric: true });
  });
}
