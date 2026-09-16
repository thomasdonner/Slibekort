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

export default async function OverblikSide({
  searchParams,
}: {
  searchParams: Promise<{ hold?: string }>;
}) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    redirect("/logind");
  }

  const { hold: holdParam } = await searchParams;

  const holdFilter = kanSeAlleHold(adgang.adgang)
    ? undefined
    : { in: adgang.adgang.hold };

  // Alle hold denne bruger overhovedet har adgang til at se, uanset om et
  // bestemt af dem er valgt lige nu — bruges både til hold-vælgeren og til
  // at afgøre om et ?hold= i URL'en overhovedet er gyldigt. Engangsslibning
  // (se lib/spillere/engangsslibning.ts) er ikke et rigtigt hold, og skal
  // aldrig kunne vælges her.
  const tilladteHoldRaekker = await prisma.spiller.findMany({
    where: {
      aktiv: true,
      hold: { not: ENGANGSSLIBNING_HOLD, ...(holdFilter ?? {}) },
    },
    select: { hold: true },
    distinct: ["hold"],
    orderBy: { hold: "asc" },
  });
  const tilladteHold = tilladteHoldRaekker.map((h) => h.hold);

  // "alle" er den eksplicitte vælgermulighed for at se det hele samlet —
  // adskilt fra "intet valgt endnu" (holdParam er slet ikke sat), som er
  // den tilstand siden starter i, når der er mere end ét hold at vælge
  // imellem. Et ugyldigt eller ukendt hold i URL'en opfører sig som "intet
  // valgt", ikke som en fejl.
  const aktivtHold =
    holdParam && holdParam !== "alle" && tilladteHold.includes(holdParam)
      ? holdParam
      : null;
  const harValgt = holdParam === "alle" || aktivtHold !== null;
  const visHoldVaelger = tilladteHold.length > 1;
  const visSpillereSektion = !visHoldVaelger || harValgt;

  const spillerHoldBetingelse = aktivtHold
    ? aktivtHold
    : { not: ENGANGSSLIBNING_HOLD, ...(holdFilter ?? {}) };

  const spillereRaa = await prisma.spiller.findMany({
    where: { aktiv: true, hold: spillerHoldBetingelse },
    include: { bevaegelser: { select: { antal: true } } },
    orderBy: [{ hold: "asc" }, { navn: "asc" }],
  });

  const spillere = spillereRaa.map((s) => ({
    id: s.id,
    navn: s.navn,
    hold: s.hold,
    saldo: beregnSaldo(s.bevaegelser),
  }));

  // Bevidst IKKE samme betingelse som spillerlisten ovenfor: uden et valgt
  // hold skal kasserer/administrator stadig se alt, der kræver et kig —
  // også for Engangsslibning, som ellers er udeladt fra selve
  // spillerlisten. Vælges ét bestemt hold, indsnævres listen til det.
  const flaggedeBevaegelserRaa = await prisma.bevaegelse.findMany({
    where: {
      note: { not: null },
      ...(aktivtHold
        ? { spiller: { hold: aktivtHold } }
        : holdFilter
          ? { spiller: { hold: holdFilter } }
          : {}),
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
  // CLAUDE.md), så den fortæller ingenting interessant. De to relevante
  // tal er i stedet betalinger og udførte slibninger hver for sig — de
  // to handlinger sker uafhængigt af to forskellige personer (personen
  // der betaler, sliberen der udfører), så et afvigende tal mellem dem
  // er præcis det, der afslører at nogen har glemt at scanne bagefter.
  const [engangsslibningBetaltAntal, engangsslibningUdfoertAntal] = engangsslibning
    ? await Promise.all([
        prisma.bevaegelse.count({
          where: { spillerId: engangsslibning.id, type: "koeb" },
        }),
        prisma.bevaegelse.count({
          where: { spillerId: engangsslibning.id, type: "slibning" },
        }),
      ])
    : [0, 0];

  return (
    <main>
      <h1>Overblik</h1>

      <div className="stat-raekke">
        <div className="stat-kort">
          <span className="stat-tal">{spillere.length}</span>
          <span className="stat-label">Spillere</span>
        </div>
        <div className="stat-kort">
          <span className="stat-tal">{tilladteHold.length}</span>
          <span className="stat-label">Hold</span>
        </div>
        <div
          className={`stat-kort ${flaggedeBevaegelser.length > 0 ? "stat-kort-advarsel" : ""}`}
        >
          <span className="stat-tal">{flaggedeBevaegelser.length}</span>
          <span className="stat-label">Kræver et kig</span>
        </div>
        {engangsslibning && (
          <>
            <div
              className={`stat-kort ${
                engangsslibningBetaltAntal !== engangsslibningUdfoertAntal
                  ? "stat-kort-advarsel"
                  : ""
              }`}
            >
              <span className="stat-tal">{engangsslibningBetaltAntal}</span>
              <span className="stat-label">Engangsslibning betalt</span>
            </div>
            <div
              className={`stat-kort ${
                engangsslibningBetaltAntal !== engangsslibningUdfoertAntal
                  ? "stat-kort-advarsel"
                  : ""
              }`}
            >
              <span className="stat-tal">{engangsslibningUdfoertAntal}</span>
              <span className="stat-label">Engangsslibning udført</span>
            </div>
          </>
        )}
      </div>

      {visHoldVaelger && (
        <nav className="hold-vaelger">
          <Link
            href="/overblik?hold=alle"
            className={holdParam === "alle" ? "aktiv" : undefined}
          >
            Alle hold
          </Link>
          {tilladteHold.map((h) => (
            <Link
              key={h}
              href={`/overblik?hold=${encodeURIComponent(h)}`}
              className={aktivtHold === h ? "aktiv" : undefined}
            >
              {h}
            </Link>
          ))}
        </nav>
      )}

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

      {visSpillereSektion ? (
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
      ) : (
        <p>Vælg et hold ovenfor for at se dets spillere, eller &quot;Alle hold&quot;.</p>
      )}
    </main>
  );
}
