import { NextResponse } from "next/server";
import { readSheet } from "read-excel-file/node";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi, kanSeHold } from "@/lib/roller";
import { parseHoldsportRaekker, raekkerTilObjekter } from "@/lib/import/holdsport";
import { findSikkerFlytning } from "@/lib/import/flyt";

export async function POST(request: Request) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }
  // Kun kasserer og administrator importerer — se app/import/layout.tsx.
  if (!kanRetteSaldi(adgang.adgang)) {
    return NextResponse.json(
      { fejl: "Ingen adgang til at importere spillere." },
      { status: 403 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const fil = formData?.get("fil");
  const hold = formData?.get("hold");

  if (!(fil instanceof File) || typeof hold !== "string" || !hold.trim()) {
    return NextResponse.json(
      { fejl: "Vælg en xlsx-fil og angiv et hold." },
      { status: 400 },
    );
  }

  if (!kanSeHold(adgang.adgang, hold.trim())) {
    return NextResponse.json(
      { fejl: "Du har ikke adgang til det hold." },
      { status: 403 },
    );
  }

  let raekker: unknown[][];
  try {
    const buffer = Buffer.from(await fil.arrayBuffer());
    raekker = await readSheet(buffer);
  } catch {
    return NextResponse.json(
      { fejl: "Kunne ikke læse filen. Er det en gyldig xlsx-fil?" },
      { status: 400 },
    );
  }

  const objekter = raekkerTilObjekter(raekker);
  const resultat = parseHoldsportRaekker(objekter, hold.trim());

  // Sæsonskifte: en spiller der rykker op en årgang (fx fra U14 til U16)
  // dukker op i en ny fil under et nyt holdnavn. Uden dette ville
  // importen oprette en helt ny spiller-række — og dermed miste saldoen,
  // historikken og QR-koden, i modstrid med at "saldoen følger spilleren"
  // (kravspecifikationen, afsnit 5.5). Kun informativt her — selve
  // flytningen sker først ved bekræftelsen, se lib/import/gem.ts.
  for (const s of resultat.spillere) {
    const kandidaterRaa = await prisma.spiller.findMany({
      where: { navn: s.navn, hold: { not: resultat.hold }, aktiv: true },
      include: { relationer: { include: { voksen: true } } },
    });
    if (kandidaterRaa.length === 0) continue;

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
      resultat.noter.push({
        kategori: "Flytter fra andet hold — saldo og historik følger med",
        detalje: `${s.navn}: ${flytning.hold} → ${resultat.hold}`,
      });
    } else {
      resultat.noter.push({
        kategori:
          "Navn matcher en spiller på et andet hold, men ingen fælles forældrekontakt — tjek om det er samme spiller",
        detalje: `${s.navn} (${kandidater.map((k) => k.hold).join(", ")})`,
      });
    }
  }

  return NextResponse.json(resultat);
}
