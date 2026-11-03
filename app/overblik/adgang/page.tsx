import { redirect } from "next/navigation";
import Link from "next/link";
import type { Rolle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanAdministrereBrugere } from "@/lib/roller";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";
import { antalBevaegelserTekst } from "@/lib/overblik/bruger-sletning";
import { fjernAdgang, giveAdgang, logAlleEnhederUd, sletBruger } from "./actions";

const ROLLER: { vaerdi: Rolle; navn: string }[] = [
  { vaerdi: "sliber", navn: "Sliber" },
  { vaerdi: "kasserer", navn: "Kasserer" },
  { vaerdi: "holdleder", navn: "Holdleder" },
  { vaerdi: "administrator", navn: "Administrator" },
];

export default async function AdgangSide({
  searchParams,
}: {
  searchParams: Promise<{ ret?: string }>;
}) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanAdministrereBrugere(adgang.adgang)) {
    redirect("/overblik");
  }

  const { ret } = await searchParams;

  const brugere = await prisma.bruger.findMany({
    include: {
      user: true,
      holdAdgang: true,
      _count: { select: { bevaegelser: true } },
    },
    orderBy: { navn: "asc" },
  });

  const sessionAntal = await prisma.session.groupBy({
    by: ["userId"],
    _count: { _all: true },
  });
  const sessionKort = new Map(sessionAntal.map((s) => [s.userId, s._count._all]));

  // Den bruger, der er ved at blive rettet (via "Ret" i tabellen) — formularen
  // udfyldes med dennes nuværende indstillinger. Ukendt id = ny bruger.
  const redigeret = ret ? brugere.find((b) => b.id === ret) : undefined;
  const redigeretHold = new Set(redigeret?.holdAdgang.map((h) => h.hold) ?? []);

  // Hold, der kan vælges: alle hold, der har aktive spillere (Engangsslibning
  // er ikke et rigtigt hold), plus hold, nogen allerede er tildelt — så et
  // hold uden spillere endnu ikke forsvinder fra afkrydsningerne.
  const spillerHold = await prisma.spiller.findMany({
    where: { aktiv: true, hold: { not: ENGANGSSLIBNING_HOLD } },
    select: { hold: true },
    distinct: ["hold"],
  });
  const valgbareHold = [
    ...new Set([
      ...spillerHold.map((s) => s.hold),
      ...brugere.flatMap((b) => b.holdAdgang.map((h) => h.hold)),
    ]),
  ].sort((a, b) => a.localeCompare(b, "da", { numeric: true }));

  function holdVisning(b: (typeof brugere)[number]): string {
    const hold = b.holdAdgang.map((h) => h.hold);
    if (hold.length > 0) return hold.join(", ");
    // Uden tildelte hold ser en holdleder intet, mens en sliber uden hold
    // kan slibe alle — se kanSlibeForHold i lib/roller.ts.
    if (b.roller.includes("holdleder")) return "Ingen hold endnu";
    if (b.roller.includes("sliber")) return "Alle hold";
    return "";
  }

  return (
    <main>
      <h1>Adgangsstyring</h1>
      <p>
        Kun administrator kan give eller fjerne adgang — det er
        administratorens ekstra beføjelse ud over kasserens.
      </p>

      <section>
        <h2>
          {redigeret ? `Ret adgang — ${redigeret.navn}` : "Giv eller ret adgang"}
        </h2>
        <form action={giveAdgang} key={redigeret?.id ?? "ny"}>
          <label>
            E-mail
            <input
              type="email"
              name="email"
              required
              defaultValue={redigeret?.user.email ?? ""}
              readOnly={Boolean(redigeret)}
            />
          </label>
          {redigeret && (
            <p>
              Mailadressen kan ikke ændres her. Er den forkert, så slet
              brugeren (hvis vedkommende intet har udført) og opret en ny.
            </p>
          )}
          <label>
            Navn
            <input type="text" name="navn" defaultValue={redigeret?.navn ?? ""} />
          </label>
          <fieldset>
            <legend>Roller</legend>
            {ROLLER.map((r) => (
              <label key={r.vaerdi}>
                <input
                  type="checkbox"
                  name="roller"
                  value={r.vaerdi}
                  defaultChecked={redigeret?.roller.includes(r.vaerdi) ?? false}
                />{" "}
                {r.navn}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Hold</legend>
            <p>
              <strong>Holdleder:</strong> de hold, vedkommende kan se og rette
              — uden hold ses intet. <strong>Sliber:</strong> de hold,
              vedkommende kan slibe for — uden hold kan sliberen slibe alle
              hold. Gælder ikke kasserer og administrator, som altid ser alle
              hold i overblikket.
            </p>
            {valgbareHold.length === 0 && <p>Ingen hold er oprettet endnu.</p>}
            {valgbareHold.map((h) => (
              <label key={h}>
                <input
                  type="checkbox"
                  name="hold"
                  value={h}
                  defaultChecked={redigeretHold.has(h)}
                />{" "}
                {h}
              </label>
            ))}
            <label>
              Andre hold, kommasepareret (et hold uden spillere endnu)
              <input type="text" name="andreHold" placeholder="U18" />
            </label>
          </fieldset>
          <fieldset>
            <legend>Delt konto</legend>
            <label>
              <input
                type="checkbox"
                name="delt"
                defaultChecked={redigeret?.delt ?? false}
              />{" "}
              Delt konto (fx en iPad, der står fast i sliberummet, brugt af
              skiftende slibere)
            </label>
          </fieldset>
          <button type="submit">Gem adgang</button>
          {redigeret && <Link href="/overblik/adgang">Annullér</Link>}
        </form>
      </section>

      <section>
        <h2>Hvem har adgang</h2>
        <div className="tabel-scroll">
          <table>
            <thead>
              <tr>
                <th>Navn</th>
                <th>E-mail</th>
                <th>Roller</th>
                <th>Hold</th>
                <th>Delt konto</th>
                <th>Status</th>
                <th>Enheder logget ind</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {brugere.map((b) => (
                <tr key={b.id}>
                  <td>{b.navn}</td>
                  <td>{b.user.email}</td>
                  <td>{b.roller.join(", ")}</td>
                  <td>{holdVisning(b)}</td>
                  <td>{b.delt ? "Ja" : ""}</td>
                  <td>{b.aktiv ? "Aktiv" : "Spærret"}</td>
                  <td>{sessionKort.get(b.userId) ?? 0}</td>
                  <td>
                    <div className="tabel-handlinger">
                      <form action="/overblik/adgang" method="get">
                        <input type="hidden" name="ret" value={b.id} />
                        <button type="submit" className="knap-rolig">
                          Ret
                        </button>
                      </form>
                      {b.aktiv && (
                        <form action={fjernAdgang}>
                          <input type="hidden" name="brugerId" value={b.id} />
                          <button type="submit" className="knap-fare">
                            Fjern adgang
                          </button>
                        </form>
                      )}
                      <form action={logAlleEnhederUd}>
                        <input type="hidden" name="brugerId" value={b.id} />
                        <button type="submit" className="knap-rolig">
                          Log enheder ud
                        </button>
                      </form>
                      {b.id === adgang.brugerId ? (
                        <span className="tabel-note">Din egen konto kan ikke slettes</span>
                      ) : b._count.bevaegelser > 0 ? (
                        <span className="tabel-note">
                          Kan ikke slettes — har udført{" "}
                          {antalBevaegelserTekst(b._count.bevaegelser)}. Fjern
                          adgangen i stedet.
                        </span>
                      ) : (
                        // Et ekstra trin, uden JavaScript: sletningen kan
                        // ikke fortrydes, så selve knappen ligger først,
                        // når "Slet" er åbnet.
                        <details className="slet-bruger">
                          <summary>Slet</summary>
                          <form action={sletBruger}>
                            <p>
                              Sletter {b.navn} helt, inklusive login og
                              hold. Det kan ikke fortrydes.
                            </p>
                            <input type="hidden" name="brugerId" value={b.id} />
                            <button type="submit" className="knap-fare">
                              Slet endeligt
                            </button>
                          </form>
                        </details>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
