"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fortrydSlibning,
  hentSpillerTilBekraeftelse,
  synkroniserKoe,
  traekSlibning,
  type Bekraeftelse,
} from "@/lib/klient/scanner";
import { udtraekQrToken } from "@/lib/qr/token";
import { saldoKlasse } from "@/lib/ui/saldo-klasse";
import { IkonAdvarsel, IkonCheck } from "@/app/ikoner";

type Skaerm =
  | { navn: "scanner" }
  | { navn: "bekraeft"; data: Bekraeftelse }
  | {
      navn: "kvittering";
      data: Bekraeftelse;
      klientId: string;
      bevaegelseId: string | null;
      saldo: number;
      tidspunkt: number;
    }
  | { navn: "fejl"; besked: string };

type Fane = "scan" | "vaelg";

export default function SlibSide() {
  const [skaerm, setSkaerm] = useState<Skaerm>({ navn: "scanner" });
  const [fane, setFane] = useState<Fane>("scan");
  const [manueltToken, setManueltToken] = useState("");
  // Starter som false, samme som på serveren (der har intet "window"), og
  // rettes først i en effekt efter mount. En lazy useState-initializer så
  // ud til at løse det samme (ingen selvstændig effekt), men gav i praksis
  // et hydration-mismatch, fordi serveren og klienten reelt regner ud til
  // to forskellige værdier — det er præcis den situation, denne kendte
  // undtagelse fra "ingen setState i en effekt" er lavet til.
  const [understoetterKamera, setUnderstoetterKamera] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnderstoetterKamera("BarcodeDetector" in window);
  }, []);

  useEffect(() => {
    void synkroniserKoe();
    const paaOnline = () => void synkroniserKoe();
    window.addEventListener("online", paaOnline);
    return () => window.removeEventListener("online", paaOnline);
  }, []);

  // Reagerer på at en køet slibning når frem til serveren, mens
  // kvitteringsskærmen stadig er åben, så Fortryd får det rigtige id.
  useEffect(() => {
    function paaSynkroniseret(event: Event) {
      const detail = (
        event as CustomEvent<{ klientId: string; bevaegelseId: string }>
      ).detail;
      setSkaerm((nuvaerende) => {
        if (
          nuvaerende.navn === "kvittering" &&
          nuvaerende.klientId === detail.klientId
        ) {
          return { ...nuvaerende, bevaegelseId: detail.bevaegelseId };
        }
        return nuvaerende;
      });
    }
    window.addEventListener("slibekort:synkroniseret", paaSynkroniseret);
    return () =>
      window.removeEventListener("slibekort:synkroniseret", paaSynkroniseret);
  }, []);

  const slaOp = useCallback(async (raaScan: string) => {
    // Den fysiske QR-kode indeholder en fuld URL, ikke et bart token — se
    // lib/qr/token.ts. Denne ene funktion er indgangen for både kameraet
    // og den manuelle indtastning, så begge dækkes ved at rette her.
    const qrToken = udtraekQrToken(raaScan);
    const resultat = await hentSpillerTilBekraeftelse(qrToken);
    if ("fejl" in resultat) {
      setSkaerm({ navn: "fejl", besked: resultat.fejl });
      return;
    }
    setSkaerm({ navn: "bekraeft", data: resultat });
  }, []);

  async function traek(tvangstraek: boolean) {
    if (skaerm.navn !== "bekraeft") return;
    const { data } = skaerm;
    const { klientId, saldo } = await traekSlibning({
      qrToken: data.qrToken,
      spillerId: data.spillerId,
      tvangstraek,
    });
    setSkaerm({
      navn: "kvittering",
      data,
      klientId,
      bevaegelseId: null,
      saldo,
      tidspunkt: Date.now(),
    });
  }

  async function fortryd() {
    if (skaerm.navn !== "kvittering") return;
    await fortrydSlibning({
      qrToken: skaerm.data.qrToken,
      spillerId: skaerm.data.spillerId,
      oprindeligKlientId: skaerm.klientId,
      oprindeligBevaegelseId: skaerm.bevaegelseId,
    });
    setSkaerm({ navn: "scanner" });
  }

  function tilbageTilScanner() {
    setSkaerm({ navn: "scanner" });
  }

  return (
    <main>
      <h1>Slibekort</h1>
      {skaerm.navn === "scanner" && (
        <>
          <div className="slib-faner" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={fane === "scan"}
              onClick={() => setFane("scan")}
            >
              Scan QR-kode
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={fane === "vaelg"}
              onClick={() => setFane("vaelg")}
            >
              Vælg spiller
            </button>
          </div>
          {fane === "scan" ? (
            <Scanner
              understoetterKamera={understoetterKamera}
              manueltToken={manueltToken}
              onManueltTokenAendret={setManueltToken}
              onScan={slaOp}
            />
          ) : (
            <VaelgSpiller onValgt={slaOp} />
          )}
        </>
      )}
      {skaerm.navn === "bekraeft" && (
        <Bekraeftelsesskaerm
          data={skaerm.data}
          onTraek={() => traek(false)}
          onTraekAlligevel={() => traek(true)}
          onForkertSpiller={tilbageTilScanner}
        />
      )}
      {skaerm.navn === "kvittering" && (
        <Kvitteringsskaerm
          navn={skaerm.data.navn}
          saldo={skaerm.saldo}
          tidspunkt={skaerm.tidspunkt}
          onFortryd={fortryd}
          onNaesteSpiller={tilbageTilScanner}
        />
      )}
      {skaerm.navn === "fejl" && (
        <div>
          <p role="alert">
            <IkonAdvarsel />
            <span>{skaerm.besked}</span>
          </p>
          <button onClick={tilbageTilScanner}>Prøv igen</button>
        </div>
      )}
    </main>
  );
}

function Scanner({
  understoetterKamera,
  manueltToken,
  onManueltTokenAendret,
  onScan,
}: {
  understoetterKamera: boolean;
  manueltToken: string;
  onManueltTokenAendret: (vaerdi: string) => void;
  onScan: (token: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!understoetterKamera) return;

    let annulleret = false;
    let harScannet = false;
    let stream: MediaStream | null = null;

    async function start() {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (annulleret) {
        stream.getTracks().forEach((spor) => spor.stop());
        return;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // BarcodeDetector mangler stadig i TypeScripts indbyggede DOM-typer.
      const BarcodeDetectorKlasse = (
        window as unknown as { BarcodeDetector: new (init: { formats: string[] }) => {
          detect: (billede: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
        } }
      ).BarcodeDetector;
      const detector = new BarcodeDetectorKlasse({ formats: ["qr_code"] });

      const laesFrame = async () => {
        if (annulleret || harScannet || !videoRef.current) return;
        try {
          const koder = await detector.detect(videoRef.current);
          if (koder.length > 0) {
            harScannet = true;
            onScan(koder[0].rawValue);
            return;
          }
        } catch {
          // Videoen er ikke klar til at blive læst endnu — prøv næste frame.
        }
        requestAnimationFrame(laesFrame);
      };
      requestAnimationFrame(laesFrame);
    }

    start().catch(() => {
      // Ingen kameraadgang. Den manuelle indtastning nedenfor virker stadig.
    });

    return () => {
      annulleret = true;
      stream?.getTracks().forEach((spor) => spor.stop());
    };
  }, [understoetterKamera, onScan]);

  return (
    <div>
      {understoetterKamera ? (
        <video ref={videoRef} muted playsInline style={{ width: "100%" }} />
      ) : (
        <p>
          Denne telefons browser kan ikke scanne QR-koder. Indtast koden i
          stedet.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (manueltToken.trim()) onScan(manueltToken.trim());
        }}
      >
        <input
          value={manueltToken}
          onChange={(event) => onManueltTokenAendret(event.target.value)}
          placeholder="QR-kode"
          aria-label="QR-kode"
        />
        <button type="submit">Slå op</button>
      </form>
    </div>
  );
}

type SpillerRaekke = { spillerId: string; qrToken: string; navn: string; saldo: number };

// Fornavnets og efternavnets forbogstav, til kortets cirkel. Et enkelt
// navn (intet mellemrum) giver i stedet de to første bogstaver.
function spillerInitialer(navn: string): string {
  const dele = navn.trim().split(/\s+/);
  const sidste = dele[dele.length - 1];
  return dele.length > 1
    ? `${dele[0][0]}${sidste[0]}`.toUpperCase()
    : navn.slice(0, 2).toUpperCase();
}

// Genbruger saldoKlasse (lib/ui/saldo-klasse.ts) i stedet for sin egen
// tærskel-logik for cirklens farve — "tal-sund" bliver til
// "spiller-vaelg-avatar-sund", så farven altid følger den ene, delte
// definition af sund/advarsel/kritisk saldo, uanset hvor den bruges.
function avatarKlasse(saldo: number): string {
  return saldoKlasse(saldo).replace("tal-", "spiller-vaelg-avatar-");
}

// Alternativet til at scanne: hold vælges først, så spillerne på det hold.
// Et klik på en spiller kalder onValgt(qrToken) — samme qrToken som en
// rigtig scanning ville have givet, så resten af siden (bekræftelse,
// spærretid, kvittering, fortryd) er helt uændret, uanset hvilken fane
// spilleren blev fundet fra.
function VaelgSpiller({ onValgt }: { onValgt: (qrToken: string) => void }) {
  const [hold, setHold] = useState<string[] | null>(null);
  const [valgtHold, setValgtHold] = useState<string | null>(null);
  // Holder styr på hvilket hold svaret hører til, ikke kun selve
  // spillerne — ellers ville et skift til et andet hold kortvarigt vise
  // det forrige holds spillere, indtil det nye svar når frem.
  const [spillereState, setSpillereState] = useState<{
    hold: string;
    raekker: SpillerRaekke[];
  } | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/slib/hold")
      .then((res) => res.json())
      .then((data) => setHold(data.hold ?? []))
      .catch(() => setFejl("Kunne ikke hente hold. Tjek forbindelsen."));
  }, []);

  useEffect(() => {
    if (!valgtHold) return;
    fetch(`/api/slib/spillere?hold=${encodeURIComponent(valgtHold)}`)
      .then((res) => res.json())
      .then((data) => setSpillereState({ hold: valgtHold, raekker: data.spillere ?? [] }))
      .catch(() => setFejl("Kunne ikke hente spillere. Tjek forbindelsen."));
  }, [valgtHold]);

  const spillere =
    valgtHold && spillereState?.hold === valgtHold ? spillereState.raekker : null;

  if (fejl) {
    return (
      <p role="alert">
        <IkonAdvarsel />
        <span>{fejl}</span>
      </p>
    );
  }

  if (hold === null) {
    return <p>Henter hold...</p>;
  }

  if (hold.length === 0) {
    return <p>Ingen hold at vælge imellem endnu.</p>;
  }

  return (
    <div>
      <nav className="hold-vaelger">
        {hold.map((h) => (
          <a
            key={h}
            href="#"
            className={h === valgtHold ? "aktiv" : undefined}
            onClick={(event) => {
              event.preventDefault();
              setValgtHold(h);
            }}
          >
            {h}
          </a>
        ))}
      </nav>

      {valgtHold &&
        (spillere === null ? (
          <p>Henter spillere...</p>
        ) : spillere.length === 0 ? (
          <p>Ingen spillere på {valgtHold}.</p>
        ) : (
          <ul className="spiller-vaelg-liste">
            {spillere.map((s) => (
              <li key={s.spillerId}>
                <button
                  type="button"
                  className="spiller-vaelg-kort"
                  onClick={() => onValgt(s.qrToken)}
                >
                  <span className={`spiller-vaelg-avatar ${avatarKlasse(s.saldo)}`}>
                    {spillerInitialer(s.navn)}
                  </span>
                  <span className="spiller-vaelg-navn">{s.navn}</span>
                  <span className={`tal ${saldoKlasse(s.saldo)}`}>{s.saldo}</span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

function Bekraeftelsesskaerm({
  data,
  onTraek,
  onTraekAlligevel,
  onForkertSpiller,
}: {
  data: Bekraeftelse;
  onTraek: () => void;
  onTraekAlligevel: () => void;
  onForkertSpiller: () => void;
}) {
  return (
    <div>
      <h2>{data.navn}</h2>
      <p>{data.hold}</p>
      <p>
        Saldo:{" "}
        <span className={`tal ${saldoKlasse(data.saldo)}`}>{data.saldo}</span>
      </p>
      {data.fraCache && (
        <p>Ingen forbindelse lige nu — viser sidst kendte saldo.</p>
      )}
      {data.spaerret ? (
        <>
          <p role="alert">
            <IkonAdvarsel />
            <span>
              Spilleren er allerede scannet inden for de sidste 60 minutter
              {data.sidsteSlibningTidspunkt &&
                ` (kl. ${new Date(
                  data.sidsteSlibningTidspunkt,
                ).toLocaleTimeString("da-DK")})`}
              .
            </span>
          </p>
          <button onClick={onTraekAlligevel}>Træk alligevel</button>
        </>
      ) : (
        <button onClick={onTraek}>Træk 1 slibning</button>
      )}
      <button onClick={onForkertSpiller}>Forkert spiller</button>
    </div>
  );
}

function Kvitteringsskaerm({
  navn,
  saldo,
  tidspunkt,
  onFortryd,
  onNaesteSpiller,
}: {
  navn: string;
  saldo: number;
  tidspunkt: number;
  onFortryd: () => void;
  onNaesteSpiller: () => void;
}) {
  const beregnResterende = useCallback(
    () => Math.max(0, 10 - Math.floor((Date.now() - tidspunkt) / 1000)),
    [tidspunkt],
  );
  const [resterendeSekunder, setResterendeSekunder] = useState(beregnResterende);

  useEffect(() => {
    const interval = setInterval(() => {
      setResterendeSekunder(beregnResterende());
    }, 250);
    return () => clearInterval(interval);
  }, [beregnResterende]);

  return (
    <div className="kvittering">
      <div className="kvittering-ikon">
        <IkonCheck />
      </div>
      <h2>{navn}</h2>
      <p className={`kvittering-saldo tal ${saldoKlasse(saldo)}`}>{saldo}</p>
      <p>slibninger tilbage</p>
      {resterendeSekunder > 0 && (
        <button onClick={onFortryd}>Fortryd ({resterendeSekunder})</button>
      )}
      <button onClick={onNaesteSpiller}>Næste spiller</button>
    </div>
  );
}
