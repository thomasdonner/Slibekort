import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi } from "@/lib/roller";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";
import { IkonBillet, IkonHold, IkonRapport } from "@/app/ikoner";

// Samme adgang som selve API-ruten (/api/overblik/rapport) — kun kasserer
// og administrator, se dens egen kommentar.
export default async function RapportSide() {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanRetteSaldi(adgang.adgang)) {
    redirect("/overblik");
  }

  const holdRaekker = await prisma.spiller.findMany({
    where: { aktiv: true, hold: { not: ENGANGSSLIBNING_HOLD } },
    select: { hold: true },
    distinct: ["hold"],
    orderBy: { hold: "asc" },
  });

  const harEngangsslibning = await prisma.spiller.findFirst({
    where: { hold: ENGANGSSLIBNING_HOLD },
    select: { id: true },
  });

  return (
    <main>
      <h1>Saldorapport</h1>
      <p>Excel-filer (.xlsx) med spillernavn, hold og resterende saldo.</p>

      <div className="rapport-liste">
        <a className="rapport-kort" href="/api/overblik/rapport">
          <span className="rapport-ikon rapport-ikon-alle">
            <IkonHold />
          </span>
          <span className="rapport-titel">Alle hold samlet</span>
        </a>
        {holdRaekker.map((h) => (
          <a
            key={h.hold}
            className="rapport-kort"
            href={`/api/overblik/rapport?hold=${encodeURIComponent(h.hold)}`}
          >
            <span className="rapport-ikon">
              <IkonRapport />
            </span>
            <span className="rapport-titel">{h.hold}</span>
          </a>
        ))}
        {harEngangsslibning && (
          <a
            className="rapport-kort"
            href={`/api/overblik/rapport?hold=${encodeURIComponent(ENGANGSSLIBNING_HOLD)}`}
          >
            <span className="rapport-ikon">
              <IkonBillet />
            </span>
            <span className="rapport-titel">Engangsslibning</span>
          </a>
        )}
      </div>
    </main>
  );
}
