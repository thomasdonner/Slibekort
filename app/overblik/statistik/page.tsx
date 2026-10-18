import Link from "next/link";
import { redirect } from "next/navigation";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi } from "@/lib/roller";
import { hentStatistik, laesSaeson } from "@/lib/overblik/statistik-data";
import {
  formaterDecimal,
  formaterKroner,
  maanedNavn,
  saesonNavn,
} from "@/lib/overblik/statistik";
import { IkonRapport } from "@/app/ikoner";

// Samme adgang som saldorapporten — kun kasserer og administrator, se
// /api/overblik/statistik, som er selv adgangsstyret uafhængigt af siden.
export default async function StatistikSide({
  searchParams,
}: {
  searchParams: Promise<{ saeson?: string }>;
}) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanRetteSaldi(adgang.adgang)) {
    redirect("/overblik");
  }

  const { saeson: saesonParam } = await searchParams;
  const saeson = laesSaeson(saesonParam);
  const { statistik, saesoner } = await hentStatistik(saeson);
  const { total } = statistik;

  return (
    <main>
      <h1>Slibestatistik</h1>
      <p>
        Hvor mange slibninger der er foretaget og solgt, pr. hold og samlet for
        klubben — til at fastsætte priserne for næste sæson.
      </p>

      {saesoner.length > 1 && (
        <nav className="hold-vaelger">
          {saesoner.map((aar) => (
            <Link
              key={aar}
              href={`/overblik/statistik?saeson=${aar}`}
              className={aar === saeson ? "aktiv" : undefined}
            >
              {saesonNavn(aar)}
            </Link>
          ))}
        </nav>
      )}

      <div className="stat-raekke">
        <div className="stat-kort">
          <span className="stat-tal">{total.slibninger}</span>
          <span className="stat-label">Slibninger udført</span>
        </div>
        <div className="stat-kort">
          <span className="stat-tal">{total.koebteSlibninger}</span>
          <span className="stat-label">Slibninger solgt</span>
        </div>
        <div className="stat-kort">
          <span className="stat-tal">{formaterKroner(total.omsaetningOere)}</span>
          <span className="stat-label">Omsætning (kr.)</span>
        </div>
        <div className="stat-kort">
          <span className="stat-tal">{formaterKroner(total.gnsPrisPrSlibningOere)}</span>
          <span className="stat-label">Gns. pris pr. solgt slibning (kr.)</span>
        </div>
      </div>

      <nav>
        <a href={`/api/overblik/statistik?saeson=${saeson}`}>
          <IkonRapport /> Download som Excel
        </a>
      </nav>

      <section>
        <h2>Pr. hold, sæson {saesonNavn(saeson)}</h2>
        <div className="tabel-scroll">
          <table>
            <thead>
              <tr>
                <th>Hold</th>
                <th className="tal">Spillere</th>
                <th className="tal">Har slebet</th>
                <th className="tal">Slibninger</th>
                <th className="tal">Pr. spiller</th>
                <th className="tal">Pr. spiller der har slebet</th>
                <th className="tal">Solgt</th>
                <th className="tal">Omsætning (kr.)</th>
                <th className="tal">Saldo i dag</th>
              </tr>
            </thead>
            <tbody>
              {statistik.hold.map((h) => (
                <tr key={h.hold}>
                  <td>{h.hold}</td>
                  <td className="tal">{h.spillere ?? "–"}</td>
                  <td className="tal">{h.harSlebet ?? "–"}</td>
                  <td className="tal">{h.slibninger}</td>
                  <td className="tal">{formaterDecimal(h.prSpiller)}</td>
                  <td className="tal">{formaterDecimal(h.prSpillerDerHarSlebet)}</td>
                  <td className="tal">{h.koebteSlibninger}</td>
                  <td className="tal">{formaterKroner(h.omsaetningOere)}</td>
                  <td className="tal">{h.saldoIAlt}</td>
                </tr>
              ))}
              <tr className="sum-raekke">
                <td>{total.hold}</td>
                <td className="tal">{total.spillere}</td>
                <td className="tal">{total.harSlebet}</td>
                <td className="tal">{total.slibninger}</td>
                <td className="tal">{formaterDecimal(total.prSpiller)}</td>
                <td className="tal">{formaterDecimal(total.prSpillerDerHarSlebet)}</td>
                <td className="tal">{total.koebteSlibninger}</td>
                <td className="tal">{formaterKroner(total.omsaetningOere)}</td>
                <td className="tal">{total.saldoIAlt}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Pr. måned, hele klubben</h2>
        {statistik.maaneder.length === 0 ? (
          <p>Ingen måneder at vise endnu.</p>
        ) : (
          <div className="tabel-scroll">
            <table>
              <thead>
                <tr>
                  <th>Måned</th>
                  <th className="tal">Slibninger</th>
                </tr>
              </thead>
              <tbody>
                {statistik.maaneder.map((m) => (
                  <tr key={m.noegle}>
                    <td>{maanedNavn(m.noegle)}</td>
                    <td className="tal">{m.slibninger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Sådan læses tallene</h2>
        <ul>
          <li>
            Sæsonen løber fra 1. juli til 30. juni. En slibning, der er fortrudt,
            tælles ikke med. Rettelser af saldoen er ikke slibninger.
          </li>
          <li>
            <strong>Hold</strong> er spillerens hold i dag. En spiller, der
            rykker op, tæller med under det nye hold for hele sæsonen.
          </li>
          <li>
            <strong>Spillere</strong> er aktive spillere i dag. En spiller, der
            er stoppet, tæller ikke med som spiller, men de slibninger, der
            blev foretaget, mens spilleren var med, tæller stadig i holdets
            slibninger.
          </li>
          <li>
            <strong>Pr. spiller</strong> er slibninger delt med spillere på
            holdet. <strong>Pr. spiller der har slebet</strong> er delt med dem,
            der rent faktisk har fået slebet mindst én gang — det er det
            tal, der viser, hvor meget de aktive bruger tilbuddet.
          </li>
          <li>
            <strong>Solgt</strong> og <strong>omsætning</strong> er gennemførte
            MobilePay-betalinger i sæsonen. Gns. pris pr. solgt slibning ligger
            mellem 30 kr. (10 for 300 kr.) og 40 kr. (enkeltkøb).
          </li>
          <li>
            <strong>Saldo i dag</strong> er slibninger, der er betalt men ikke
            brugt endnu, og er ikke begrænset til sæsonen.
          </li>
          <li>
            Engangsslibning er den delte række til motionister og er ikke et
            hold. Den indgår i slibninger, solgt og omsætning, men ikke i
            &rdquo;pr. spiller&rdquo;.
          </li>
        </ul>
      </section>
    </main>
  );
}
