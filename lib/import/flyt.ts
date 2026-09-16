export type FlytKandidat = {
  spillerId: string;
  hold: string;
  voksenMails: string[];
};

/**
 * Afgør om en spiller i en ny import med rimelig sikkerhed er den samme
 * som en eksisterende spiller på et ANDET hold — typisk en spiller der
 * rykker op en årgang ved sæsonskifte (fx U14 til U16). Holdsports export
 * har intet stabilt id at genkende en person på tværs af hold ved, kun
 * navn og kontaktoplysninger — se CLAUDE.md for hvorfor navn alene ikke
 * er nok.
 *
 * Kun præcis én kandidat, der deler mindst én mailadresse med den nye
 * rækkes voksne, tæller som en sikker flytning. Ingen fælles mail, eller
 * flere forskellige hold der hver har en kandidat med fælles mail, er for
 * usikkert til at afgøre automatisk — det bliver i stedet en almindelig
 * ny spiller, med en bemærkning holdlederen selv må tjekke.
 */
export function findSikkerFlytning(
  indkommendeMails: string[],
  kandidater: FlytKandidat[],
): FlytKandidat | null {
  if (indkommendeMails.length === 0) return null;

  const medFaellesMail = kandidater.filter((k) =>
    k.voksenMails.some((mail) => indkommendeMails.includes(mail)),
  );

  return medFaellesMail.length === 1 ? medFaellesMail[0] : null;
}
