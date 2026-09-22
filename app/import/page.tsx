"use client";

import { useState, type FormEvent } from "react";
import { gaetHoldFraFilnavn, type ImportNote, type ImportResultat } from "@/lib/import/holdsport";
import type { ImportSkriveResultat } from "@/lib/import/gem";
import { IkonAdvarsel } from "@/app/ikoner";

type Tilstand =
  | { fase: "form" }
  | { fase: "forhaandsvisning"; data: ImportResultat }
  | { fase: "gemt"; resultat: ImportSkriveResultat }
  | { fase: "fejl"; besked: string };

export default function ImportSide() {
  const [tilstand, setTilstand] = useState<Tilstand>({ fase: "form" });
  const [hold, setHold] = useState("");
  const [afventer, setAfventer] = useState(false);

  async function forhaandsvis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setAfventer(true);
    try {
      const res = await fetch("/api/import/forhaandsvisning", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setTilstand({ fase: "fejl", besked: json.fejl ?? "Kunne ikke læse filen." });
        return;
      }
      setTilstand({ fase: "forhaandsvisning", data: json });
    } finally {
      setAfventer(false);
    }
  }

  async function godkend() {
    if (tilstand.fase !== "forhaandsvisning") return;
    setAfventer(true);
    try {
      const res = await fetch("/api/import/bekraeft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spillere: tilstand.data.spillere }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTilstand({ fase: "fejl", besked: json.fejl ?? "Kunne ikke gemme importen." });
        return;
      }
      setTilstand({ fase: "gemt", resultat: json });
    } finally {
      setAfventer(false);
    }
  }

  return (
    <main>
      <h1>Importér hold fra Holdsport</h1>

      {tilstand.fase === "form" && (
        <form onSubmit={forhaandsvis}>
          <label>
            Hold
            <input
              type="text"
              name="hold"
              value={hold}
              onChange={(event) => setHold(event.target.value)}
              required
            />
          </label>
          <label>
            Xlsx-fil fra Holdsport
            <input
              type="file"
              name="fil"
              accept=".xlsx"
              required
              onChange={(event) => {
                if (hold) return;
                const filnavn = event.target.files?.[0]?.name;
                const gaettetHold = filnavn ? gaetHoldFraFilnavn(filnavn) : null;
                if (gaettetHold) setHold(gaettetHold);
              }}
            />
          </label>
          <button type="submit" disabled={afventer}>
            {afventer ? "Læser..." : "Forhåndsvis"}
          </button>
        </form>
      )}

      {tilstand.fase === "forhaandsvisning" && (
        <Forhaandsvisning
          data={tilstand.data}
          afventer={afventer}
          onGodkend={godkend}
          onAnnuller={() => setTilstand({ fase: "form" })}
        />
      )}

      {tilstand.fase === "gemt" && (
        <div>
          <h2>Import gennemført</h2>
          <p>{tilstand.resultat.spillereOprettet} nye spillere</p>
          <p>{tilstand.resultat.spillereOpdateret} eksisterende spillere opdateret</p>
          <p>
            {tilstand.resultat.spillereFlyttet} spillere flyttet fra et andet
            hold (saldo og historik fulgte med)
          </p>
          <p>{tilstand.resultat.voksneOprettet} nye voksne</p>
          <p>{tilstand.resultat.voksneGenbrugt} voksne genbrugt (fx søskende)</p>
          <p>
            <a href={`/overblik/qr-ark?hold=${encodeURIComponent(hold)}`}>
              Print QR-ark for {hold}
            </a>
          </p>
          <button onClick={() => setTilstand({ fase: "form" })}>
            Importér et andet hold
          </button>
        </div>
      )}

      {tilstand.fase === "fejl" && (
        <div>
          <p role="alert">
            <IkonAdvarsel />
            <span>{tilstand.besked}</span>
          </p>
          <button onClick={() => setTilstand({ fase: "form" })}>Prøv igen</button>
        </div>
      )}
    </main>
  );
}

function Forhaandsvisning({
  data,
  afventer,
  onGodkend,
  onAnnuller,
}: {
  data: ImportResultat;
  afventer: boolean;
  onGodkend: () => void;
  onAnnuller: () => void;
}) {
  const medMail = data.spillere.filter((s) => s.voksne.some((v) => v.email)).length;
  const grupperet = grupperNoter(data.noter);

  return (
    <div>
      <h2>{data.hold}</h2>
      <p>Ingen ændringer er gemt endnu. Gennemgå og godkend nedenfor.</p>

      <p>Spillere i filen: {data.spillere.length}</p>
      <p>Med mailadresse: {medMail}</p>
      <p>Uden mailadresse: {data.spillere.length - medMail}</p>

      {data.noter.length > 0 ? (
        <div>
          <h3>{data.noter.length} bemærkninger</h3>
          {Object.entries(grupperet).map(([kategori, detaljer]) => (
            <div key={kategori}>
              <strong>
                {kategori} ({detaljer.length})
              </strong>
              <ul>
                {detaljer.map((detalje, i) => (
                  <li key={`${detalje}-${i}`}>{detalje}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p>Ingen bemærkninger.</p>
      )}

      <h3>Spillere</h3>
      <ul>
        {data.spillere.map((s, i) => (
          <li key={`${s.navn}-${i}`}>
            {s.navn} — {s.voksne.length} kontakt(er)
          </li>
        ))}
      </ul>

      <button onClick={onGodkend} disabled={afventer}>
        {afventer ? "Gemmer..." : "Godkend og importér"}
      </button>
      <button onClick={onAnnuller} disabled={afventer}>
        Annullér
      </button>
    </div>
  );
}

function grupperNoter(noter: ImportNote[]): Record<string, string[]> {
  const grupper: Record<string, string[]> = {};
  for (const { kategori, detalje } of noter) {
    (grupper[kategori] ??= []).push(detalje);
  }
  return grupper;
}
