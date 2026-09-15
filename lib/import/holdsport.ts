// Port af scripts/importtjek.py's kernelogik til TypeScript, til brug i
// selve importsiden. Samme regler, samme bemærkninger — se den fil for
// den kommandolinjeudgave, holdlederen kan køre for at tjekke en fil
// hjemmefra, før den lægges ind i systemet.

export type ImportVoksen = {
  email: string | null;
  mobil: string | null;
};

export type ImportSpiller = {
  navn: string;
  hold: string;
  voksne: ImportVoksen[];
};

export type ImportNote = {
  kategori: string;
  detalje: string;
};

export type ImportResultat = {
  hold: string;
  spillere: ImportSpiller[];
  noter: ImportNote[];
};

function tekst(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function tlf(v: unknown): string {
  const cifre = tekst(v).replace(/\D/g, "");
  return cifre.length >= 8 ? cifre.slice(-8) : "";
}

function mailAdresse(v: unknown): string {
  return tekst(v).toLowerCase();
}

// Fjerner '#12' fra efternavnet. Trøjenummeret bruges ikke.
function delNavn(fornavn: unknown, efternavn: unknown): string {
  const rent = tekst(efternavn).replace(/#\s*\d+/g, "").trim();
  return `${tekst(fornavn)} ${rent}`.trim();
}

/**
 * Rækkerne fra readSheet() er en matrix (array af arrays) med
 * overskrifterne i første række. Det her laver dem om til objekter
 * nøglet på overskrift, ligesom Python-scriptets dict(zip(hdr, r)).
 */
export function raekkerTilObjekter(
  raekker: unknown[][],
): Record<string, unknown>[] {
  const [hdr, ...dataRaekker] = raekker;
  const overskrifter = (hdr ?? []).map((h) => tekst(h));
  return dataRaekker
    .filter((r) => r.some((c) => c !== null && c !== undefined && c !== ""))
    .map((r) => Object.fromEntries(overskrifter.map((o, i) => [o, r[i]])));
}

export function parseHoldsportRaekker(
  raekker: Record<string, unknown>[],
  hold: string,
): ImportResultat {
  const noter: ImportNote[] = [];
  const spillere: ImportSpiller[] = [];
  const setNavne = new Set<string>();

  for (const r of raekker) {
    const rolle = tekst(r["Rolle"]);
    if (rolle && rolle !== "Spiller") continue;

    const navn = delNavn(r["Fornavn"], r["Efternavn"]);
    if (!navn) continue;

    if (setNavne.has(navn)) {
      noter.push({
        kategori: "Samme navn optræder to gange på holdet",
        detalje: navn,
      });
    }
    setNavne.add(navn);

    const voksne: ImportVoksen[] = [];
    const setMails = new Set<string>();

    for (const [mailFelt, tlfFelt] of [
      ["E-mail", "Mobil"],
      ["E-mail 2", "Mobil 2"],
    ] as const) {
      const m = mailAdresse(r[mailFelt]);
      const t = tlf(r[tlfFelt]);
      if (!m && !t) continue;
      if (m && setMails.has(m)) {
        noter.push({
          kategori: "Alternativ mail er den samme som den primære — bruges ikke",
          detalje: navn,
        });
        continue;
      }
      if (m) setMails.add(m);
      voksne.push({ email: m || null, mobil: t || null });
    }

    const medMail = voksne.filter((v) => v.email);
    if (medMail.length === 0) {
      noter.push({
        kategori: "Ingen mailadresse — kan ikke få påmindelser",
        detalje: navn,
      });
    } else if (medMail.length === 1 && voksne.length > 1) {
      noter.push({
        kategori: "Ekstra kontakt uden mailadresse — får ingen påmindelser",
        detalje: navn,
      });
    }

    spillere.push({ navn, hold, voksne });
  }

  const alleMails = spillere.flatMap((s) =>
    s.voksne.map((v) => v.email).filter((e): e is string => !!e),
  );
  const taelling = new Map<string, number>();
  for (const m of alleMails) {
    taelling.set(m, (taelling.get(m) ?? 0) + 1);
  }
  for (const antal of taelling.values()) {
    if (antal > 1) {
      noter.push({
        kategori: "Samme mailadresse på flere spillere — sandsynligvis søskende",
        detalje: `${antal} spillere`,
      });
    }
  }

  return { hold, spillere, noter };
}

/** Gætter et holdnavn ud fra filnavnet, som importtjek.py også gør. */
export function gaetHoldFraFilnavn(filnavn: string): string | null {
  const match = /([uU]\d{1,2})/.exec(filnavn);
  return match ? match[1].toUpperCase() : null;
}
