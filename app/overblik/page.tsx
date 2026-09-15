import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanAdministrereBrugere, kanRetteSaldi, kanSeAlleHold } from "@/lib/roller";
import { beregnSaldo } from "@/lib/saldo";
import { saldoKlasse } from "@/lib/ui/saldo-klasse";
import {
  IkonAdvarsel,
  IkonBillet,
  IkonHold,
  IkonLaas,
  IkonPrint,
  IkonRapport,
  IkonSystem,
} from "@/app/ikoner";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";

export default async function OverblikSide() {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    redirect("/logind");
  }

  const holdFilter = kanSeAlleHold(adgang.adgang)
    ? undefined
    : { in: adgang.adgang.hold };

  // Engangsslibning (se lib/spillere/engangsslibning.ts) er ikke et
  // rigtigt hold — den skal aldrig stå i den almindelige spillerliste
  // eller tælle med i "Hold". Kasserer/administrator når den i stedet via
  // det direkte link i navigationen herunder.
  const spillereRaa = await prisma.spiller.findMany({
    where: {
      aktiv: true,
      hold: { not: ENGANGSSLIBNING_HOLD, ...(holdFilter ?? {}) },
    },
    include: { bevaegelser: { select: { antal: true } } },
    orderBy: [{ hold: "asc" }, { navn: "asc" }],
  });

  const spillere = spillereRaa.map((s) => ({
    id: s.id,
    navn: s.navn,
    hold: s.hold,
    saldo: beregnSaldo(s.bevaegelser),
  }));

  const flaggedeBevaegelserRaa = await prisma.bevaegelse.findMany({
    where: {
      note: { not: null },
      ...(holdFilter ? { spiller: { hold: holdFilter } } : {}),
    },
    include: { spiller: true },
    orderBy: { tidspunkt: "desc" },
    take: 20,
  });

  // Holdlederen kan ikke selv rette saldi (kun kasserer/administrator kan,
  // se lib/roller.ts) — for dem er "kræver et kig" derfor indsnævret til
  // det, de faktisk kan handle på: spillere med saldo 1 og under, så de
  // kan rykke forældrene for et nyt slibekort. Kasserer og administrator
  // ser fortsat alle flagede bevægelser, uanset årsag.
  const saldoById = new Map(spillere.map((s) => [s.id, s.saldo]));
  const flaggedeBevaegelser = kanRetteSaldi(adgang.adgang)
    ? flaggedeBevaegelserRaa
    : flaggedeBevaegelserRaa.filter((b) => {
        const saldo = saldoById.get(b.spillerId);
        return saldo !== undefined && saldo <= 1;
      });

  const antalHold = new Set(spillere.map((s) => s.hold)).size;

  // Kun kasserer/administrator skal kunne ajourføre engangsslibninger —
  // findes den (npm run engangsslibning:opret er kørt), linkes der direkte
  // til dens egen side, uden om den almindelige spillerliste den er
  // udeladt fra ovenfor.
  const engangsslibning = kanRetteSaldi(adgang.adgang)
    ? await prisma.spiller.findFirst({
        where: { hold: ENGANGSSLIBNING_HOLD },
        select: { id: true },
      })
    : null;

  // Saldoen på engangsslibning ender altid i 0 (personen betaler selv via
  // /betal/[qrToken], sliberen trækker bagefter helt almindeligt — se
  // CLAUDE.md), så den fortæller ingenting interessant. Det relevante tal
  // her er, hvor mange gange koden reelt er brugt: en optælling af selve
  // slibningerne.
  const engangsslibningAntal = engangsslibning
    ? await prisma.bevaegelse.count({
        where: { spillerId: engangsslibning.id, type: "slibning" },
      })
    : 0;

  return (
    <main>
      <h1>Overblik</h1>

      <div className="stat-raekke">
        <div className="stat-kort">
          <span className="stat-tal">{spillere.length}</span>
          <span className="stat-label">Spillere</span>
        </div>
        <div className="stat-kort">
          <span className="stat-tal">{antalHold}</span>
          <span className="stat-label">Hold</span>
        </div>
        <div
          className={`stat-kort ${flaggedeBevaegelser.length > 0 ? "stat-kort-advarsel" : ""}`}
        >
          <span className="stat-tal">{flaggedeBevaegelser.length}</span>
          <span className="stat-label">Kræver et kig</span>
        </div>
        {engangsslibning && (
          <div className="stat-kort">
            <span className="stat-tal">{engangsslibningAntal}</span>
            <span className="stat-label">Engangsslibninger</span>
          </div>
        )}
      </div>

      <nav>
        {kanRetteSaldi(adgang.adgang) && (
          <Link href="/import">
            <IkonHold /> Importér hold
          </Link>
        )}
        <Link href="/overblik/qr-ark">
          <IkonPrint /> QR-ark til print
        </Link>
        {kanRetteSaldi(adgang.adgang) && (
          <Link href="/overblik/rapport">
            <IkonRapport /> Download saldorapport
          </Link>
        )}
        {engangsslibning && (
          <Link href={`/overblik/spillere/${engangsslibning.id}`}>
            <IkonBillet /> Engangsslibning
          </Link>
        )}
        {kanAdministrereBrugere(adgang.adgang) && (
          <Link href="/overblik/adgang">
            <IkonLaas /> Adgangsstyring
          </Link>
        )}
        {kanAdministrereBrugere(adgang.adgang) && (
          <Link href="/overblik/systemtjek">
            <IkonSystem /> Systemtjek
          </Link>
        )}
      </nav>

      {flaggedeBevaegelser.length > 0 && (
        <section>
          <h2>Bevægelser der kræver et kig ({flaggedeBevaegelser.length})</h2>
          <ul className="flag-liste">
            {flaggedeBevaegelser.map((b) => (
              <li className="flag-raekke" key={b.id}>
                <IkonAdvarsel />
                <div>
                  <Link href={`/overblik/spillere/${b.spillerId}`}>
                    {b.spiller.navn} ({b.spiller.hold})
                  </Link>
                  <p>{b.note}</p>
                  <time dateTime={b.tidspunkt.toISOString()}>
                    {new Date(b.tidspunkt).toLocaleString("da-DK")}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Spillere ({spillere.length})</h2>
        {spillere.length === 0 ? (
          <p>
            Ingen spillere at vise endnu.{" "}
            {kanSeAlleHold(adgang.adgang)
              ? "Importér et hold for at komme i gang."
              : "Din konto har ikke fået adgang til noget hold endnu."}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Navn</th>
                <th>Hold</th>
                <th className="tal">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {spillere.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/overblik/spillere/${s.id}`}>{s.navn}</Link>
                  </td>
                  <td>{s.hold}</td>
                  <td className={`tal ${saldoKlasse(s.saldo)}`}>{s.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
