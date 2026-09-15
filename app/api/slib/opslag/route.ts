import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kraevSliber } from "@/lib/kraev-sliber";
import { beregnSaldo } from "@/lib/saldo";
import { erIndenforSpaerretid } from "@/lib/slibning";

export async function POST(request: Request) {
  const adgang = await kraevSliber();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }

  const body = await request.json().catch(() => null);
  const qrToken = body?.qrToken;
  if (typeof qrToken !== "string" || !qrToken) {
    return NextResponse.json({ fejl: "qrToken mangler." }, { status: 400 });
  }

  const spiller = await prisma.spiller.findUnique({
    where: { qrToken },
    include: { bevaegelser: true },
  });

  if (!spiller || !spiller.aktiv) {
    return NextResponse.json(
      { fejl: "Ukendt eller inaktiv QR-kode." },
      { status: 404 },
    );
  }

  const sidsteSlibning = await prisma.bevaegelse.findFirst({
    where: { spillerId: spiller.id, type: "slibning", fortrudtAf: null },
    orderBy: { tidspunkt: "desc" },
  });

  return NextResponse.json({
    spillerId: spiller.id,
    navn: spiller.navn,
    hold: spiller.hold,
    saldo: beregnSaldo(spiller.bevaegelser),
    spaerret: erIndenforSpaerretid(sidsteSlibning?.tidspunkt ?? null, new Date()),
    sidsteSlibningTidspunkt: sidsteSlibning?.tidspunkt ?? null,
  });
}
