import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanSeAlleHold, kanSeHold } from "@/lib/roller";
import { MAKS_SPILLER_NUMMER_LAENGE } from "@/lib/spiller-nummer";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";
import { gemNumreForHold } from "../actions";

// Et helt holds spillernumre på én side, i stedet for at åbne hver spiller.
// Numrene trykkes på QR-arket (/overblik/qr-ark).
export default async function NumreSide({
  searchParams,
}: {
  searchParams: Promise<{ hold?: string; gemt?: string }>;
}) {
  const { hold, gemt } = await searchParams;

  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    notFound();
  }

  if (hold) {
    // Engangsslibning er ikke et rigtigt hold og har ingen spillere at
    // nummerere — samme 404 som et hold, brugeren ikke må se.
    if (hold === ENGANGSSLIBNING_HOLD || !kanSeHold(adgang.adgang, hold)) {
      notFound();
    }

    const spillere = await prisma.spiller.findMany({
      where: { hold, aktiv: true },
      select: { id: true, navn: true, nummer: true },
      orderBy: { navn: "asc" },
    });

    return (
      <main>
        <h1>Spillernumre — {hold}</h1>
        <p>
          Skriv hver spillers nummer og tryk &quot;Gem numre&quot; nederst. Et
          tomt felt betyder intet nummer. Numrene står på QR-arket, så det skal
          printes igen bagefter.
        </p>
        {gemt !== undefined && (
          <p role="status">
            {Number(gemt) === 0
              ? "Ingen numre var ændret."
              : Number(gemt) === 1
                ? "Gemte 1 nummer."
                : `Gemte ${Number(gemt)} numre.`}
          </p>
        )}

        {spillere.length === 0 ? (
          <p>Ingen aktive spillere på dette hold.</p>
        ) : (
          <form action={gemNumreForHold}>
            <input type="hidden" name="hold" value={hold} />
            <div className="tabel-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Spiller</th>
                    <th>Nummer</th>
                  </tr>
                </thead>
                <tbody>
                  {spillere.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <label htmlFor={`nummer_${s.id}`}>{s.navn}</label>
                      </td>
                      <td>
                        {/* pattern og maxLength er kun for at fange en tastefejl,
                            før noget sendes — serveren tjekker det samme igen. */}
                        <input
                          type="text"
                          id={`nummer_${s.id}`}
                          name={`nummer_${s.id}`}
                          defaultValue={s.nummer ?? ""}
                          maxLength={MAKS_SPILLER_NUMMER_LAENGE}
                          pattern="\S*"
                          title="Højst fire tegn, uden mellemrum"
                          autoComplete="off"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="submit">Gem numre</button>
          </form>
        )}

        <p>
          <Link href={`/overblik/qr-ark?hold=${encodeURIComponent(hold)}`}>
            Gå til QR-arket for {hold}
          </Link>
          {" · "}
          <Link href="/overblik/numre">Vælg et andet hold</Link>
        </p>
      </main>
    );
  }

  // Samme holdliste som QR-arket: aktive hold, uden Engangsslibning, og for
  // en holdleder kun egne hold.
  const holdRaekker = await prisma.spiller.findMany({
    where: {
      aktiv: true,
      hold: {
        not: ENGANGSSLIBNING_HOLD,
        ...(kanSeAlleHold(adgang.adgang) ? {} : { in: adgang.adgang.hold }),
      },
    },
    select: { hold: true },
    distinct: ["hold"],
    orderBy: { hold: "asc" },
  });

  return (
    <main>
      <h1>Spillernumre</h1>
      <p>Vælg det hold, du vil taste numre ind for.</p>
      {holdRaekker.length === 0 ? (
        <p>Ingen hold at vise endnu.</p>
      ) : (
        <ul>
          {holdRaekker.map((h) => (
            <li key={h.hold}>
              <Link href={`/overblik/numre?hold=${encodeURIComponent(h.hold)}`}>
                {h.hold}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
