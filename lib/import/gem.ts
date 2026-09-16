import { prisma } from "@/lib/prisma";
import type { ImportSpiller } from "./holdsport";
import { findSikkerFlytning } from "./flyt";

export type ImportSkriveResultat = {
  spillereOprettet: number;
  spillereOpdateret: number;
  spillereFlyttet: number;
  voksneOprettet: number;
  voksneGenbrugt: number;
};

/**
 * Skriver en forhåndsvist import til databasen. Genkender en spiller på
 * navn+hold, en voksen på mail (når den er sat) — se CLAUDE.md for hvorfor.
 * Rører aldrig bevaegelser, betalinger eller mails: saldo og historik skal
 * være upåvirket af at importere den samme fil igen.
 *
 * En spiller der findes på et ANDET hold, med mindst én fælles
 * forældrekontakt, flyttes i stedet for at blive oprettet på ny — se
 * lib/import/flyt.ts og CLAUDE.md. Det er den samme afgørelse, som
 * forhåndsvisningen allerede har vist som en bemærkning, blot genberegnet
 * her frem for at stole på noget klienten sendte tilbage.
 */
export async function gemImport(
  spillere: ImportSpiller[],
): Promise<ImportSkriveResultat> {
  let spillereOprettet = 0;
  let spillereOpdateret = 0;
  let spillereFlyttet = 0;
  let voksneOprettet = 0;
  let voksneGenbrugt = 0;

  for (const s of spillere) {
    const eksisterende = await prisma.spiller.findUnique({
      where: { navn_hold: { navn: s.navn, hold: s.hold } },
    });

    let spiller;
    if (eksisterende) {
      spiller = await prisma.spiller.update({
        where: { id: eksisterende.id },
        data: { aktiv: true },
      });
      spillereOpdateret++;
    } else {
      const kandidaterRaa = await prisma.spiller.findMany({
        where: { navn: s.navn, hold: { not: s.hold }, aktiv: true },
        include: { relationer: { include: { voksen: true } } },
      });
      const indkommendeMails = s.voksne
        .map((v) => v.email)
        .filter((e): e is string => !!e);
      const kandidater = kandidaterRaa.map((k) => ({
        spillerId: k.id,
        hold: k.hold,
        voksenMails: k.relationer
          .map((r) => r.voksen.email)
          .filter((e): e is string => !!e),
      }));
      const flytning = findSikkerFlytning(indkommendeMails, kandidater);

      if (flytning) {
        spiller = await prisma.spiller.update({
          where: { id: flytning.spillerId },
          data: { hold: s.hold, aktiv: true },
        });
        spillereFlyttet++;
      } else {
        spiller = await prisma.spiller.create({
          data: { navn: s.navn, hold: s.hold },
        });
        spillereOprettet++;
      }
    }

    for (const v of s.voksne) {
      let voksenId: string;

      if (v.email) {
        const eksisterendeVoksen = await prisma.voksen.findUnique({
          where: { email: v.email },
        });
        if (eksisterendeVoksen) {
          voksenId = eksisterendeVoksen.id;
          voksneGenbrugt++;
        } else {
          const nyVoksen = await prisma.voksen.create({
            data: { email: v.email, telefon: v.mobil },
          });
          voksenId = nyVoksen.id;
          voksneOprettet++;
        }
      } else {
        // Ingen mailadresse at genkende kontakten på — kan ikke skelnes fra
        // en tidligere import af samme telefonnummer-only kontakt.
        const nyVoksen = await prisma.voksen.create({
          data: { email: null, telefon: v.mobil },
        });
        voksenId = nyVoksen.id;
        voksneOprettet++;
      }

      await prisma.relation.upsert({
        where: { spillerId_voksenId: { spillerId: spiller.id, voksenId } },
        create: { spillerId: spiller.id, voksenId },
        update: {},
      });
    }
  }

  return {
    spillereOprettet,
    spillereOpdateret,
    spillereFlyttet,
    voksneOprettet,
    voksneGenbrugt,
  };
}
