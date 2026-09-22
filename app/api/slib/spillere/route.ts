import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kraevSliber } from "@/lib/kraev-sliber";
import { beregnSaldo } from "@/lib/saldo";

// Spillerne på ét hold, til "Vælg spiller"-fanen på /slib. Returnerer
// qrToken pr. spiller med vilje, ikke kun et id — klientens
// hentSpillerTilBekraeftelse (lib/klient/scanner.ts) tager et qrToken,
// præcis som ved en rigtig scanning, så resten af flowet (bekræftelse,
// spærretid, kvittering, fortryd, offline-kø) genbruges helt uændret.
export async function GET(request: Request) {
  const adgang = await kraevSliber();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }

  const hold = new URL(request.url).searchParams.get("hold");
  if (!hold) {
    return NextResponse.json({ fejl: "hold mangler." }, { status: 400 });
  }

  const spillere = await prisma.spiller.findMany({
    where: { hold, aktiv: true },
    include: { bevaegelser: true },
    orderBy: { navn: "asc" },
  });

  return NextResponse.json({
    spillere: spillere.map((s) => ({
      spillerId: s.id,
      qrToken: s.qrToken,
      navn: s.navn,
      saldo: beregnSaldo(s.bevaegelser),
    })),
  });
}
