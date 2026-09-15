import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kraevSliber } from "@/lib/kraev-sliber";
import { beregnSaldo } from "@/lib/saldo";
import { erIndenforFortrydelsesvindue } from "@/lib/slibning";

export async function POST(request: Request) {
  const adgang = await kraevSliber();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }

  const body = await request.json().catch(() => null);
  const bevaegelseId = body?.bevaegelseId;
  const klientId = body?.klientId;
  const besluttetTidspunkt = body?.besluttetTidspunkt;

  if (
    typeof bevaegelseId !== "string" ||
    typeof klientId !== "string" ||
    typeof besluttetTidspunkt !== "string" ||
    !bevaegelseId ||
    !klientId ||
    Number.isNaN(Date.parse(besluttetTidspunkt))
  ) {
    return NextResponse.json(
      { fejl: "bevaegelseId, klientId og besluttetTidspunkt er påkrævet." },
      { status: 400 },
    );
  }

  const eksisterende = await prisma.bevaegelse.findUnique({
    where: { klientId },
  });
  if (eksisterende) {
    const bevaegelser = await prisma.bevaegelse.findMany({
      where: { spillerId: eksisterende.spillerId },
    });
    return NextResponse.json({ saldo: beregnSaldo(bevaegelser) });
  }

  const original = await prisma.bevaegelse.findUnique({
    where: { id: bevaegelseId },
    include: { fortrudtAf: true },
  });

  if (!original || original.type !== "slibning") {
    return NextResponse.json({ fejl: "Ukendt slibning." }, { status: 404 });
  }
  if (original.fortrudtAf) {
    return NextResponse.json({ fejl: "Allerede fortrudt." }, { status: 409 });
  }
  // Tjekket bruger tidspunktet for sliberens tryk, ikke serverens
  // modtagelsestidspunkt — ellers ville en forsinket afsendelse fra den
  // offline kø kunne underkende en beslutning, der blev taget rettidigt.
  // Bufferen dækker herefter kun uret mellem telefon og server, ikke
  // netværkstid.
  if (
    !erIndenforFortrydelsesvindue(
      original.tidspunkt,
      new Date(besluttetTidspunkt),
    )
  ) {
    return NextResponse.json(
      { fejl: "Fortrydelsesvinduet er udløbet." },
      { status: 409 },
    );
  }

  let fortrudt;
  try {
    fortrudt = await prisma.bevaegelse.create({
      data: {
        spillerId: original.spillerId,
        type: "fortrudt",
        antal: -original.antal,
        udfoertAfId: adgang.brugerId,
        klientId,
        oprindeligId: original.id,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      fortrudt = await prisma.bevaegelse.findUniqueOrThrow({
        where: { klientId },
      });
    } else {
      throw error;
    }
  }

  const bevaegelser = await prisma.bevaegelse.findMany({
    where: { spillerId: original.spillerId },
  });
  return NextResponse.json({
    bevaegelseId: fortrudt.id,
    saldo: beregnSaldo(bevaegelser),
  });
}
