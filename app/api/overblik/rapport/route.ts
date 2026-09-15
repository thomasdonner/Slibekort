import { NextResponse } from "next/server";
import writeXlsxFile from "write-excel-file/node";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi, kanSeAlleHold, kanSeHold } from "@/lib/roller";
import { beregnSaldo } from "@/lib/saldo";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";

// Kravspecifikationen, afsnit 12: "kassereren trækker en rapport over
// resterende saldi" ved sæsonslut. Kasserer/administrator ser alle hold —
// en holdleder henvises til overblikkets almindelige spillerliste.
//
// `?hold=` trækker kun ét hold ad gangen (fx til at sende videre til en
// bestemt holdleder) — se app/overblik/rapport/page.tsx, som lister de
// hold der kan vælges. Uden parameteren trækkes alle hold samlet, ligesom
// før, men stadig uden Engangsslibning (den er ikke et rigtigt hold med
// en resterende saldo at følge op på) — vælges "Engangsslibning" derimod
// eksplicit som `?hold=`, medtages den, præcis som ethvert andet hold.
export async function GET(request: Request) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }
  if (!kanRetteSaldi(adgang.adgang)) {
    return NextResponse.json(
      { fejl: "Kun kasserer og administrator kan trække rapporten." },
      { status: 403 },
    );
  }

  const hold = new URL(request.url).searchParams.get("hold");
  if (hold && !kanSeHold(adgang.adgang, hold)) {
    return NextResponse.json(
      { fejl: "Ingen adgang til det hold." },
      { status: 403 },
    );
  }

  const spillere = await prisma.spiller.findMany({
    where: {
      aktiv: true,
      hold: hold
        ? hold
        : {
            not: ENGANGSSLIBNING_HOLD,
            ...(kanSeAlleHold(adgang.adgang) ? {} : { in: adgang.adgang.hold }),
          },
    },
    include: { bevaegelser: { select: { antal: true } } },
    orderBy: [{ hold: "asc" }, { navn: "asc" }],
  });

  const raekker = spillere.map((s) => ({
    hold: s.hold,
    navn: s.navn,
    saldo: beregnSaldo(s.bevaegelser),
  }));

  const buffer = await writeXlsxFile(raekker, {
    columns: [
      { header: "Hold", cell: (r) => ({ value: r.hold }), width: 20 },
      { header: "Spiller", cell: (r) => ({ value: r.navn }), width: 30 },
      { header: "Saldo", cell: (r) => ({ value: r.saldo, type: Number }), width: 10 },
    ],
  }).toBuffer();

  // Kun bogstaver/tal/bindestreg i filnavnet — hold-navnet kommer fra
  // databasen, ikke direkte fra en bruger i dette kald, men et filnavn
  // bør aldrig bygges af ufiltreret tekst.
  const holdDel = (hold ?? "alle-hold").replace(/[^a-zA-Z0-9æøåÆØÅ-]+/g, "-");
  const filnavn = `saldorapport-${holdDel}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  // NextResponse's BodyInit-type kender ikke Node's Buffer specifikt,
  // selvom den reelt er en Uint8Array — en almindelig Uint8Array-visning
  // af de samme bytes er nok til at tilfredsstille typen uden at kopiere.
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filnavn}"`,
    },
  });
}
