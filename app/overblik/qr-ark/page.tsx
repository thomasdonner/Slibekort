import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanSeAlleHold, kanSeHold } from "@/lib/roller";
import { betalingsUrl } from "@/lib/betaling/url";
import { genererQrSvg } from "@/lib/qr/generer-svg";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";
import { grupperEfterHulning } from "@/lib/qr/hulning-grupper";

// Kravspecifikationen, afsnit 5.3: "Systemet danner en QR-kode. Holdlederen
// printer arket og klipper koden ud til skøjteposen." Koden på arket er den
// samme URL som betalingslinket i mailen (${APP_URL}/betal/[qrToken]) — en
// almindelig telefon kan altså fotografere klippet stykke og lande på
// saldo+betaling, ikke kun sliberens app.
export default async function QrArkSide({
  searchParams,
}: {
  searchParams: Promise<{ hold?: string; spillerId?: string; gruppering?: string }>;
}) {
  const { hold, spillerId, gruppering } = await searchParams;

  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    notFound();
  }

  if (spillerId) {
    const spiller = await prisma.spiller.findUnique({ where: { id: spillerId } });
    if (!spiller || !kanSeHold(adgang.adgang, spiller.hold)) {
      notFound();
    }
    return <QrArk overskrift={spiller.navn} spillere={[spiller]} />;
  }

  if (hold) {
    if (!kanSeHold(adgang.adgang, hold)) {
      notFound();
    }
    const spillere = await prisma.spiller.findMany({
      where: { hold, aktiv: true },
      orderBy: { navn: "asc" },
    });
    return (
      <QrArk
        overskrift={hold}
        spillere={spillere}
        holdTilValg={hold}
        grupperetEfterHulning={gruppering === "hulning"}
      />
    );
  }

  // Engangsslibning (lib/spillere/engangsslibning.ts) er ikke et rigtigt
  // hold og skal ikke stå i denne liste — den printes i stedet direkte
  // via ?spillerId= fra linket i overblikkets navigation.
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
      <h1>QR-ark til print</h1>
      {holdRaekker.length === 0 ? (
        <p>Ingen hold at vise endnu.</p>
      ) : (
        <ul>
          {holdRaekker.map((h) => (
            <li key={h.hold}>
              <Link href={`/overblik/qr-ark?hold=${encodeURIComponent(h.hold)}`}>
                {h.hold}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

type QrSpiller = {
  id: string;
  navn: string;
  hold: string;
  qrToken: string;
  skoejteNote: string | null;
};

function QrKort({ spiller }: { spiller: QrSpiller }) {
  return (
    <div className="qr-kort">
      <div
        className="qr-billede"
        // Indholdet er selv genereret ud fra vores egen URL, ikke
        // fritekst nogen udefra har skrevet — sikkert at indsætte.
        dangerouslySetInnerHTML={{
          __html: genererQrSvg(betalingsUrl(spiller.qrToken)),
        }}
      />
      <p>{spiller.navn}</p>
      <p>{spiller.hold}</p>
      {/* Hulningen står på selve det udklippede kort, så sliberen kan se
          den på skøjteposen uden at slå spilleren op. Arket er et
          øjebliksbillede — rettes noten bagefter, skal arket printes igen. */}
      {spiller.skoejteNote && <p className="qr-note">{spiller.skoejteNote}</p>}
    </div>
  );
}

function QrArk({
  overskrift,
  spillere,
  holdTilValg,
  grupperetEfterHulning = false,
}: {
  overskrift: string;
  spillere: QrSpiller[];
  // Sat kun når arket er et helt hold — så der kan skiftes mellem
  // alfabetisk visning og gruppering. Ikke relevant for ét enkelt kort.
  holdTilValg?: string;
  grupperetEfterHulning?: boolean;
}) {
  const grupper = grupperetEfterHulning ? grupperEfterHulning(spillere) : [];

  return (
    <main>
      <div className="skjules-ved-print">
        <h1>QR-ark — {overskrift}</h1>
        <p>
          Udskriv siden (Ctrl/Cmd+P), klip koderne ud, og fastgør dem til
          skøjteposerne.
        </p>
        {holdTilValg && (
          <nav className="hold-vaelger">
            <Link
              href={`/overblik/qr-ark?hold=${encodeURIComponent(holdTilValg)}`}
              className={grupperetEfterHulning ? undefined : "aktiv"}
            >
              Alfabetisk
            </Link>
            <Link
              href={`/overblik/qr-ark?hold=${encodeURIComponent(holdTilValg)}&gruppering=hulning`}
              className={grupperetEfterHulning ? "aktiv" : undefined}
            >
              Gruppér efter hulning
            </Link>
          </nav>
        )}
      </div>

      {spillere.length === 0 ? (
        <p className="skjules-ved-print">Ingen aktive spillere på dette hold.</p>
      ) : grupperetEfterHulning ? (
        grupper.map((gruppe) => (
          <section className="qr-gruppe" key={gruppe.noegle ?? "ingen"}>
            <h2>
              {gruppe.navn ?? "Ingen hulning noteret"} ({gruppe.spillere.length})
            </h2>
            <div className="qr-gitter">
              {gruppe.spillere.map((s) => (
                <QrKort key={s.id} spiller={s} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="qr-gitter">
          {spillere.map((s) => (
            <QrKort key={s.id} spiller={s} />
          ))}
        </div>
      )}

      <style>{`
        .qr-gitter {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .qr-kort {
          border: 1px dashed #999;
          padding: 0.5rem;
          text-align: center;
          break-inside: avoid;
        }
        .qr-billede svg {
          width: 100%;
          height: auto;
        }
        .qr-note {
          font-weight: 600;
          font-size: 0.85rem;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .qr-gruppe {
          break-inside: avoid-page;
        }
        .qr-gruppe h2 {
          margin-top: 1.5rem;
          font-size: 1.1rem;
        }
        @media print {
          .skjules-ved-print {
            display: none;
          }
          .qr-gruppe {
            background: none;
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0 0 1rem;
          }
        }
      `}</style>
    </main>
  );
}
