import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanSeAlleHold, kanSeHold } from "@/lib/roller";
import { betalingsUrl } from "@/lib/betaling/url";
import { genererQrSvg } from "@/lib/qr/generer-svg";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";
import { grupperEfterHulning } from "@/lib/qr/hulning-grupper";
import { QR_ARK_CSS } from "./qr-ark-css";

// Kravspecifikationen, afsnit 5.3: "Systemet danner en QR-kode. Holdlederen
// printer arket og klipper koden ud til skøjteposen." Koden på arket er den
// samme URL som betalingslinket i mailen (${APP_URL}/betal/[qrToken]) — en
// almindelig telefon kan altså fotografere klippet stykke og lande på
// saldo+betaling, ikke kun sliberens app.
export default async function QrArkSide({
  searchParams,
}: {
  searchParams: Promise<{
    hold?: string;
    spillerId?: string;
    gruppering?: string;
  }>;
}) {
  const { hold, spillerId, gruppering } = await searchParams;

  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    notFound();
  }

  if (spillerId) {
    const spiller = await prisma.spiller.findUnique({
      where: { id: spillerId },
    });
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
        grupperetEfterHulning={
          gruppering === "hulning" || gruppering === "hulning-sider"
        }
        nySideForHverHulning={gruppering === "hulning-sider"}
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
              <Link
                href={`/overblik/qr-ark?hold=${encodeURIComponent(h.hold)}`}
              >
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
  nySideForHverHulning = false,
}: {
  overskrift: string;
  spillere: QrSpiller[];
  // Sat kun når arket er et helt hold — så der kan skiftes mellem
  // alfabetisk visning og gruppering. Ikke relevant for ét enkelt kort.
  holdTilValg?: string;
  grupperetEfterHulning?: boolean;
  nySideForHverHulning?: boolean;
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
              className={
                grupperetEfterHulning && !nySideForHverHulning
                  ? "aktiv"
                  : undefined
              }
            >
              Gruppér efter hulning
            </Link>
            <Link
              href={`/overblik/qr-ark?hold=${encodeURIComponent(holdTilValg)}&gruppering=hulning-sider`}
              className={nySideForHverHulning ? "aktiv" : undefined}
            >
              Gruppér — ny side for hver hulning
            </Link>
          </nav>
        )}
      </div>

      {spillere.length === 0 ? (
        <p className="skjules-ved-print">
          Ingen aktive spillere på dette hold.
        </p>
      ) : grupperetEfterHulning ? (
        <div className="qr-grupper">
          {grupper.map((gruppe) => (
            <section
              className={
                nySideForHverHulning ? "qr-gruppe ny-side" : "qr-gruppe"
              }
              key={gruppe.noegle ?? "ingen"}
              // Bruges kun af printreglerne (qr-ark-css.ts): så mange af
              // arkets fire kolonner, som gruppen har spillere, højst fire.
              style={
                {
                  "--kolonner": Math.min(gruppe.spillere.length, 4),
                } as CSSProperties
              }
            >
              <h2>
                {gruppe.navn ?? "Ingen hulning noteret"} (
                {gruppe.spillere.length})
              </h2>
              <div className="qr-gitter">
                {gruppe.spillere.map((s) => (
                  <QrKort key={s.id} spiller={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="qr-gitter">
          {spillere.map((s) => (
            <QrKort key={s.id} spiller={s} />
          ))}
        </div>
      )}

      <style>{QR_ARK_CSS}</style>
    </main>
  );
}
