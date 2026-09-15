import { NextResponse, after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kraevSliber } from "@/lib/kraev-sliber";
import { beregnSaldo } from "@/lib/saldo";
import { erIndenforSpaerretid } from "@/lib/slibning";
import { tjekOgSendPaamindelser } from "@/lib/mails/send";

// Kaldes efter svaret er sendt, så sliberens telefon ikke venter på en
// mailudsendelse. Fejl her logges bare — en mail der ikke kunne sendes
// skal aldrig se ud som om selve slibningen fejlede.
function planlaegPaamindelsestjek(spillerId: string) {
  after(() =>
    tjekOgSendPaamindelser(spillerId).catch((error) =>
      console.error("Kunne ikke tjekke/sende påmindelse", error),
    ),
  );
}

export async function POST(request: Request) {
  const adgang = await kraevSliber();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }

  const body = await request.json().catch(() => null);
  const spillerId = body?.spillerId;
  const klientId = body?.klientId;
  const tvangstraek = body?.tvangstraek === true;

  if (
    typeof spillerId !== "string" ||
    typeof klientId !== "string" ||
    !spillerId ||
    !klientId
  ) {
    return NextResponse.json(
      { fejl: "spillerId og klientId er påkrævet." },
      { status: 400 },
    );
  }

  // Samme scanning kan komme igen, hvis telefonen sender den igen efter
  // dårligt netværk. Klient_id gør det muligt at svare med det samme
  // resultat i stedet for at tælle den to gange.
  const eksisterende = await prisma.bevaegelse.findUnique({
    where: { klientId },
  });
  if (eksisterende) {
    const bevaegelser = await prisma.bevaegelse.findMany({
      where: { spillerId: eksisterende.spillerId },
    });
    planlaegPaamindelsestjek(eksisterende.spillerId);
    return NextResponse.json({
      bevaegelseId: eksisterende.id,
      tidspunkt: eksisterende.tidspunkt,
      saldo: beregnSaldo(bevaegelser),
    });
  }

  const spiller = await prisma.spiller.findUnique({ where: { id: spillerId } });
  if (!spiller || !spiller.aktiv) {
    return NextResponse.json(
      { fejl: "Ukendt eller inaktiv spiller." },
      { status: 404 },
    );
  }

  const sidsteSlibning = await prisma.bevaegelse.findFirst({
    where: { spillerId, type: "slibning", fortrudtAf: null },
    orderBy: { tidspunkt: "desc" },
  });

  // Advarslen om dobbeltscanning er en interaktiv ting, vist via
  // /api/slib/opslag, FØR sliberen trykker "Træk 1 slibning" eller "Træk
  // alligevel" — beslutningen er allerede taget på det tidspunkt. Her er
  // spærretidstjekket kun et sikkerhedsnet mod at to telefoner scanner
  // samme spiller samtidig. Det blokerer aldrig trækket (heller ikke når
  // det kommer fra den offline kø, måske minutter forsinket) — det
  // noteres bare, så kassereren kan se det i overblikket.
  const spaerretRamt = erIndenforSpaerretid(
    sidsteSlibning?.tidspunkt ?? null,
    new Date(),
  );
  const note = tvangstraek
    ? "Gennemtvunget trods spærretid på 60 minutter"
    : spaerretRamt
      ? "Gennemført på trods af spærretid — spilleren var allerede scannet for nylig. Tjek for dobbeltscanning."
      : null;

  let bevaegelse;
  try {
    bevaegelse = await prisma.bevaegelse.create({
      data: {
        spillerId,
        type: "slibning",
        antal: -1,
        udfoertAfId: adgang.brugerId,
        klientId,
        note,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      bevaegelse = await prisma.bevaegelse.findUniqueOrThrow({
        where: { klientId },
      });
    } else {
      throw error;
    }
  }

  const bevaegelser = await prisma.bevaegelse.findMany({ where: { spillerId } });
  planlaegPaamindelsestjek(spillerId);
  return NextResponse.json({
    bevaegelseId: bevaegelse.id,
    tidspunkt: bevaegelse.tidspunkt,
    saldo: beregnSaldo(bevaegelser),
  });
}
