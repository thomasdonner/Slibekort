import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi } from "@/lib/roller";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";
import { IkonRapport } from "@/app/ikoner";

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

      <ul>
        <li>
          <a href="/api/overblik/rapport">
            <IkonRapport /> Alle hold samlet
          </a>
        </li>
        {holdRaekker.map((h) => (
          <li key={h.hold}>
            <a href={`/api/overblik/rapport?hold=${encodeURIComponent(h.hold)}`}>
              <IkonRapport /> {h.hold}
            </a>
          </li>
        ))}
        {harEngangsslibning && (
          <li>
            <a
              href={`/api/overblik/rapport?hold=${encodeURIComponent(ENGANGSSLIBNING_HOLD)}`}
            >
              <IkonRapport /> Engangsslibning
            </a>
          </li>
        )}
      </ul>
    </main>
  );
}
