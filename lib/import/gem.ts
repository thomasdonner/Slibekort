import { prisma } from "@/lib/prisma";
import type { ImportSpiller } from "./holdsport";

export type ImportSkriveResultat = {
  spillereOprettet: number;
  spillereOpdateret: number;
  voksneOprettet: number;
  voksneGenbrugt: number;
};

/**
 * Skriver en forhåndsvist import til databasen. Genkender en spiller på
 * navn+hold, en voksen på mail (når den er sat) — se CLAUDE.md for hvorfor.
 * Rører aldrig bevaegelser, betalinger eller mails: saldo og historik skal
 * være upåvirket af at importere den samme fil igen.
 */
export async function gemImport(
  spillere: ImportSpiller[],
): Promise<ImportSkriveResultat> {
  let spillereOprettet = 0;
  let spillereOpdateret = 0;
  let voksneOprettet = 0;
  let voksneGenbrugt = 0;

  for (const s of spillere) {
    const eksisterende = await prisma.spiller.findUnique({
      where: { navn_hold: { navn: s.navn, hold: s.hold } },
    });

    const spiller = eksisterende
      ? await prisma.spiller.update({
          where: { id: eksisterende.id },
          data: { aktiv: true },
        })
      : await prisma.spiller.create({
          data: { navn: s.navn, hold: s.hold },
        });

    if (eksisterende) {
      spillereOpdateret++;
    } else {
      spillereOprettet++;
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

  return { spillereOprettet, spillereOpdateret, voksneOprettet, voksneGenbrugt };
}
