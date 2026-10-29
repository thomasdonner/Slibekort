import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi, kanRetteSaldoForHold, kanSeHold } from "@/lib/roller";
import { MAKS_SKOEJTE_NOTE_LAENGE } from "@/lib/skoejte-note";
import { beregnSaldo } from "@/lib/saldo";
import { saldoKlasse } from "@/lib/ui/saldo-klasse";
import { findSoskendeIds } from "@/lib/overblik/soskende";
import { bestemMailTrin } from "@/lib/mails/regler";
import {
  gemSkoejteNote,
  markerStoppet,
  opdaterVoksenKontakt,
  rettSaldo,
  sendPaamindelseNu,
  tilfoejVoksen,
  udstedNyQr,
} from "../../actions";

export default async function SpillerSide({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    notFound();
  }

  const spiller = await prisma.spiller.findUnique({
    where: { id },
    include: {
      bevaegelser: {
        include: { udfoertAf: true },
        orderBy: { tidspunkt: "desc" },
      },
      relationer: { include: { voksen: true } },
      mails: { orderBy: { tidspunkt: "desc" }, take: 10 },
    },
  });

  // Samme svar (404) for "findes ikke" og "du har ikke adgang" — ellers
  // afslører sitet, at en spiller findes, til nogen der ikke må se den.
  if (!spiller || !kanSeHold(adgang.adgang, spiller.hold)) {
    notFound();
  }

  const saldo = beregnSaldo(spiller.bevaegelser);
  const kanRette = kanRetteSaldi(adgang.adgang);
  // Holdleder må rette saldoen for sit eget holds spillere, men ikke
  // resten af det kasserer/administrator kan (kanRette ovenfor).
  const kanRetteSaldoHer = kanRetteSaldoForHold(adgang.adgang, spiller.hold);

  // Hvem en manuel påmindelse ville gå til lige nu, og om der overhovedet
  // er noget at sende — vist ved knappen, så den aldrig er et tryk, der
  // lydløst ikke gør noget.
  const paamindelsesTrin = bestemMailTrin(saldo);
  const paamindelsesModtagere = spiller.relationer
    .filter((r) => r.modtagerMails && r.voksen.email)
    .map((r) => r.voksen.email as string);
  const sidstePaamindelse = spiller.mails.find(
    (m) => m.type === "advarsel" || m.type === "rykker",
  );

  let soskende: { id: string; navn: string }[] = [];
  if (kanRette && saldo !== 0) {
    const voksenIds = spiller.relationer.map((r) => r.voksenId);
    const relationerForDisseVoksne =
      voksenIds.length > 0
        ? await prisma.relation.findMany({
            where: { voksenId: { in: voksenIds } },
            select: { spillerId: true, voksenId: true },
          })
        : [];
    const soskendeIds = findSoskendeIds(relationerForDisseVoksne, spiller.id);
    soskende =
      soskendeIds.length > 0
        ? await prisma.spiller.findMany({
            where: { id: { in: soskendeIds }, aktiv: true },
            select: { id: true, navn: true },
          })
        : [];
  }

  return (
    <main>
      <h1>{spiller.navn}</h1>
      <p>
        {spiller.hold} — {spiller.aktiv ? "aktiv" : "stoppet"}
      </p>
      <p>
        Saldo: <span className={`tal ${saldoKlasse(saldo)}`}>{saldo}</span>
      </p>

      <section>
        <h2>Voksne</h2>
        <p>
          Står den samme mailadresse på flere spillere, deles kontakten
          automatisk — søskende får så én samlet påmindelse.
        </p>
        {spiller.relationer.length === 0 && <p>Ingen voksne tilknyttet.</p>}
        {spiller.relationer.map((relation) => (
          <form action={opdaterVoksenKontakt} key={relation.voksenId}>
            <input type="hidden" name="spillerId" value={spiller.id} />
            <input type="hidden" name="voksenId" value={relation.voksenId} />
            <label>
              Navn
              <input type="text" name="navn" defaultValue={relation.voksen.navn ?? ""} />
            </label>
            <label>
              E-mail
              <input
                type="email"
                name="email"
                defaultValue={relation.voksen.email ?? ""}
              />
            </label>
            <label>
              Telefon
              <input type="text" name="telefon" defaultValue={relation.voksen.telefon ?? ""} />
            </label>
            <button type="submit">Gem</button>
          </form>
        ))}

        <form action={tilfoejVoksen}>
          <h3>Tilføj kontaktperson</h3>
          <input type="hidden" name="spillerId" value={spiller.id} />
          <label>
            Navn
            <input type="text" name="navn" />
          </label>
          <label>
            E-mail
            <input type="email" name="email" />
          </label>
          <label>
            Telefon
            <input type="text" name="telefon" />
          </label>
          <button type="submit">Tilføj</button>
        </form>
      </section>

      <section>
        <h2>Skøjtenote</h2>
        <p>
          Spillerens hulning på skøjten, så man ved, hvad skøjten skal slibes
          på. Vises for sliberen, når spilleren scannes.
        </p>
        <form action={gemSkoejteNote}>
          <input type="hidden" name="spillerId" value={spiller.id} />
          <label>
            Hulning / note
            <textarea
              name="skoejteNote"
              rows={3}
              maxLength={MAKS_SKOEJTE_NOTE_LAENGE}
              defaultValue={spiller.skoejteNote ?? ""}
              placeholder="Fx 1/2 tomme"
            />
          </label>
          <button type="submit">Gem note</button>
        </form>
      </section>

      {kanRetteSaldoHer && spiller.aktiv && (
        <section>
          <h2>Ret saldo</h2>
          <form action={rettSaldo}>
            <input type="hidden" name="spillerId" value={spiller.id} />
            <label>
              Antal (negativt trækker, positivt lægger til)
              <input type="number" name="antal" required />
            </label>
            <label>
              Note
              <input type="text" name="note" placeholder="Hvorfor?" />
            </label>
            <button type="submit">Ret saldo</button>
          </form>
        </section>
      )}

      {spiller.aktiv && (
        <section>
          <h2>Påmindelse om opfyldning</h2>
          {sidstePaamindelse && (
            <p>
              Seneste påmindelse sendt{" "}
              {new Date(sidstePaamindelse.tidspunkt).toLocaleString("da-DK")}.
            </p>
          )}
          {!paamindelsesTrin ? (
            <p>
              Saldoen er {saldo}. Der sendes kun påmindelser ved saldo 1 eller
              lavere.
            </p>
          ) : paamindelsesModtagere.length === 0 ? (
            <p>
              Ingen mailadresse er registreret, så der er ikke nogen at sende
              til. Ret en mailadresse under Voksne ovenfor.
            </p>
          ) : (
            <>
              <p>
                Sendes til: {paamindelsesModtagere.join(", ")}. Knappen sender
                med det samme og ignorerer 48-timersgrænsen — brug den fx, når
                en mailadresse er rettet.
              </p>
              <form action={sendPaamindelseNu}>
                <input type="hidden" name="spillerId" value={spiller.id} />
                <button type="submit">Send påmindelse nu</button>
              </form>
            </>
          )}
        </section>
      )}

      {kanRette && spiller.aktiv && (
        <>
          <section>
            <h2>QR-kode</h2>
            <p>
              <a href={`/overblik/qr-ark?spillerId=${spiller.id}`}>
                Print QR-kode
              </a>
            </p>
            <form action={udstedNyQr}>
              <input type="hidden" name="spillerId" value={spiller.id} />
              <button type="submit">
                Udsted ny QR-kode (den gamle holder op med at virke)
              </button>
            </form>
          </section>

          <section>
            <h2>Spilleren stopper</h2>
            <p>Ingen refusion for ubrugte slibninger.</p>
            <form action={markerStoppet}>
              <input type="hidden" name="spillerId" value={spiller.id} />
              {saldo !== 0 && soskende.length > 0 && (
                <label>
                  Flyt resterende saldo ({saldo}) til en søskende
                  <select name="overfoerTilSpillerId" defaultValue="">
                    <option value="">Ingen — saldoen bortfalder</option>
                    {soskende.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.navn}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button type="submit" className="knap-fare">
                Markér som stoppet
              </button>
            </form>
          </section>
        </>
      )}

      <section>
        <h2>Historik</h2>
        <div className="tabel-scroll">
          <table>
            <thead>
              <tr>
                <th>Tidspunkt</th>
                <th>Type</th>
                <th>Antal</th>
                <th>Udført af</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {spiller.bevaegelser.map((b) => (
                <tr key={b.id}>
                  <td>{new Date(b.tidspunkt).toLocaleString("da-DK")}</td>
                  <td>{b.type}</td>
                  <td>{b.antal}</td>
                  {/* Kun MobilePay-webhookens automatiske kreditering har
                      ingen udfoertAf — alt andet (scanning, rettelse,
                      fortrydelse) kræver et logget ind menneske.
                      udfoertAfNavn er kun sat på en delt konto (fx en iPad i
                      sliberummet) — sliberens eget indtastede navn er mere
                      brugbart end selve kontoens navn i det tilfælde. */}
                  <td>
                    {b.udfoertAfNavn ?? b.udfoertAf?.navn ?? "Automatisk (MobilePay)"}
                  </td>
                  <td>{b.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Mails</h2>
        {spiller.mails.length === 0 ? (
          <p>Ingen mails sendt endnu.</p>
        ) : (
          <div className="tabel-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tidspunkt</th>
                  <th>Type</th>
                  <th>Sendt til</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {spiller.mails.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.tidspunkt).toLocaleString("da-DK")}</td>
                    <td>{m.type}</td>
                    <td>{m.sendtTil}</td>
                    <td>{m.leveringsstatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
