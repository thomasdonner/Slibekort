import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kraevSliber } from "@/lib/kraev-sliber";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";

// Til "Vælg spiller"-fanen på /slib: listen af hold, sliberen kan vælge
// imellem, før spillerne på det hold vises. En sliber uden tildelte hold
// ser alle rigtige hold; med tildelte hold (se Bruger/BrugerHold) kun dem. Engangsslibning er udeladt her af samme grund som alle andre
// hold-baserede lister i systemet (se ENGANGSSLIBNING_HOLD) — den skal
// stadig slibes ved at scanne dens egen printede kode, ikke vælges fra en
// holdliste.
export async function GET() {
  const adgang = await kraevSliber();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }

  const holdRaekker = await prisma.spiller.findMany({
    where: {
      aktiv: true,
      // En sliber med tildelte hold ser kun dem; uden tildelte hold ses alle.
      hold: {
        not: ENGANGSSLIBNING_HOLD,
        ...(adgang.hold ? { in: adgang.hold } : {}),
      },
    },
    select: { hold: true },
    distinct: ["hold"],
    orderBy: { hold: "asc" },
  });

  return NextResponse.json({ hold: holdRaekker.map((h) => h.hold) });
}
