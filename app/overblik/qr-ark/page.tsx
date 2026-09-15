import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanSeAlleHold, kanSeHold } from "@/lib/roller";
import { betalingsUrl } from "@/lib/betaling/url";
import { genererQrSvg } from "@/lib/qr/generer-svg";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";

// Kravspecifikationen, afsnit 5.3: "Systemet danner en QR-kode. Holdlederen
// printer arket og klipper koden ud til skøjteposen." Koden på arket er den
// samme URL som betalingslinket i mailen (${APP_URL}/betal/[qrToken]) — en
// almindelig telefon kan altså fotografere klippet stykke og lande på
// saldo+betaling, ikke kun sliberens app.
export default async function QrArkSide({
  searchParams,
}: {
  searchParams: Promise<{ hold?: string; spillerId?: string }>;
}) {
  const { hold, spillerId } = await searchParams;

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
    return <QrArk overskrift={hold} spillere={spillere} />;
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

function QrArk({
  overskrift,
  spillere,
}: {
  overskrift: string;
  spillere: { id: string; navn: string; hold: string; qrToken: string }[];
}) {
  return (
    <main>
      <div className="skjules-ved-print">
        <h1>QR-ark — {overskrift}</h1>
        <p>
          Udskriv siden (Ctrl/Cmd+P), klip koderne ud, og fastgør dem til
          skøjteposerne.
        </p>
      </div>

      {spillere.length === 0 ? (
        <p className="skjules-ved-print">Ingen aktive spillere på dette hold.</p>
      ) : (
        <div className="qr-gitter">
          {spillere.map((s) => (
            <div className="qr-kort" key={s.id}>
              <div
                className="qr-billede"
                // Indholdet er selv genereret ud fra vores egen URL, ikke
                // fritekst nogen udefra har skrevet — sikkert at indsætte.
                dangerouslySetInnerHTML={{
                  __html: genererQrSvg(betalingsUrl(s.qrToken)),
                }}
              />
              <p>{s.navn}</p>
              <p>{s.hold}</p>
            </div>
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
        @media print {
          .skjules-ved-print {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
