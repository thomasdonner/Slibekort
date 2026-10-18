import { ENGANGSSLIBNING_HOLD } from "../spillere/engangsslibning";

// Slibestatistik til at fastsætte næste sæsons priser. Alt her er rene
// funktioner uden database, så regnereglerne kan testes — selve
// opslagene ligger i statistik-data.ts.

// Sæsonen løber 1. juli til 30. juni, så en hel ishockeysæson (typisk
// august–marts) ligger inden for ét sæsonnummer. Sæsonnummeret er det
// år, den starter i: sæson 2026 er 2026/27.
const SAESON_START_MAANED = 7;

export function maanedNoegle(dato: Date): string {
  // Måneden bestemmes efter dansk tid, ikke UTC — en slibning sent om
  // aftenen den sidste i måneden skal tælle i den måned, sliberen så.
  const dele = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(dato);
  const aar = dele.find((d) => d.type === "year")?.value;
  const maaned = dele.find((d) => d.type === "month")?.value;
  return `${aar}-${maaned}`;
}

export function saesonStartAar(dato: Date): number {
  const [aar, maaned] = maanedNoegle(dato).split("-").map(Number);
  return maaned >= SAESON_START_MAANED ? aar : aar - 1;
}

export function saesonGraenser(startAar: number): { fra: Date; til: Date } {
  return {
    fra: new Date(Date.UTC(startAar, SAESON_START_MAANED - 1, 1)),
    til: new Date(Date.UTC(startAar + 1, SAESON_START_MAANED - 1, 1)),
  };
}

export function saesonNavn(startAar: number): string {
  return `${startAar}/${String(startAar + 1).slice(2)}`;
}

/** Sæsonens måneder fra juli og frem til og med nuværende måned. */
export function saesonMaaneder(startAar: number, nu: Date): string[] {
  const noegler: string[] = [];
  const sidste = maanedNoegle(nu);
  for (let i = 0; i < 12; i++) {
    const maaned = SAESON_START_MAANED + i;
    const aar = maaned > 12 ? startAar + 1 : startAar;
    const noegle = `${aar}-${String(((maaned - 1) % 12) + 1).padStart(2, "0")}`;
    if (noegle > sidste) break;
    noegler.push(noegle);
  }
  return noegler;
}

export function maanedNavn(noegle: string): string {
  const [aar, maaned] = noegle.split("-").map(Number);
  return new Date(Date.UTC(aar, maaned - 1, 15)).toLocaleDateString("da-DK", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type StatistikSpiller = {
  id: string;
  hold: string;
  aktiv: boolean;
  saldo: number;
};
export type StatistikSlibning = { spillerId: string; tidspunkt: Date };
export type StatistikBetaling = {
  spillerId: string;
  beloebOere: number;
  antalSlibninger: number;
};

export type HoldStatistik = {
  hold: string;
  // null for Engangsslibning: den er én delt række, ikke et hold med
  // spillere, og et "antal spillere" ville vildlede.
  spillere: number | null;
  harSlebet: number | null;
  slibninger: number;
  prSpiller: number | null;
  prSpillerDerHarSlebet: number | null;
  koebteSlibninger: number;
  omsaetningOere: number;
  gnsPrisPrSlibningOere: number | null;
  saldoIAlt: number;
};

export type Statistik = {
  hold: HoldStatistik[];
  total: HoldStatistik;
  maaneder: { noegle: string; slibninger: number }[];
};

function dividerEllerNull(taeller: number, naevner: number): number | null {
  return naevner > 0 ? taeller / naevner : null;
}

export function beregnStatistik(params: {
  spillere: StatistikSpiller[];
  slibninger: StatistikSlibning[];
  betalinger: StatistikBetaling[];
  maaneder: string[];
}): Statistik {
  const spillerPrId = new Map(params.spillere.map((s) => [s.id, s]));

  const holdNavne = new Set<string>();
  for (const s of params.spillere) {
    if (s.aktiv) holdNavne.add(s.hold);
  }
  for (const s of params.slibninger) {
    const spiller = spillerPrId.get(s.spillerId);
    if (spiller) holdNavne.add(spiller.hold);
  }
  for (const b of params.betalinger) {
    const spiller = spillerPrId.get(b.spillerId);
    if (spiller) holdNavne.add(spiller.hold);
  }

  // Engangsslibning står altid sidst, ikke blandet ind alfabetisk mellem
  // de rigtige hold.
  const sorteredeHold = [...holdNavne].sort((a, b) => {
    if (a === ENGANGSSLIBNING_HOLD) return 1;
    if (b === ENGANGSSLIBNING_HOLD) return -1;
    return a.localeCompare(b, "da");
  });

  const hold: HoldStatistik[] = sorteredeHold.map((navn) => {
    const erEngang = navn === ENGANGSSLIBNING_HOLD;
    const spillerePaaHold = params.spillere.filter((s) => s.hold === navn);
    const aktive = spillerePaaHold.filter((s) => s.aktiv);

    const slibningerPaaHold = params.slibninger.filter(
      (s) => spillerPrId.get(s.spillerId)?.hold === navn,
    );
    const harSlebetIds = new Set(slibningerPaaHold.map((s) => s.spillerId));

    const betalingerPaaHold = params.betalinger.filter(
      (b) => spillerPrId.get(b.spillerId)?.hold === navn,
    );
    const koebteSlibninger = betalingerPaaHold.reduce((sum, b) => sum + b.antalSlibninger, 0);
    const omsaetningOere = betalingerPaaHold.reduce((sum, b) => sum + b.beloebOere, 0);

    return {
      hold: navn,
      spillere: erEngang ? null : aktive.length,
      harSlebet: erEngang ? null : harSlebetIds.size,
      slibninger: slibningerPaaHold.length,
      prSpiller: erEngang ? null : dividerEllerNull(slibningerPaaHold.length, aktive.length),
      prSpillerDerHarSlebet: erEngang
        ? null
        : dividerEllerNull(slibningerPaaHold.length, harSlebetIds.size),
      koebteSlibninger,
      omsaetningOere,
      gnsPrisPrSlibningOere: dividerEllerNull(omsaetningOere, koebteSlibninger),
      saldoIAlt: aktive.reduce((sum, s) => sum + s.saldo, 0),
    };
  });

  // Totalen tæller Engangsslibning med i slibninger og omsætning (de er
  // reelle slibninger og reelle penge), men ikke i "pr. spiller" — her
  // er nævneren kun rigtige spillere, så gennemsnittet ikke trækkes ned
  // af en delt række uden et antal spillere.
  const medlemmer = hold.filter((h) => h.hold !== ENGANGSSLIBNING_HOLD);
  const medlemmerSpillere = medlemmer.reduce((sum, h) => sum + (h.spillere ?? 0), 0);
  const medlemmerHarSlebet = medlemmer.reduce((sum, h) => sum + (h.harSlebet ?? 0), 0);
  const medlemmerSlibninger = medlemmer.reduce((sum, h) => sum + h.slibninger, 0);
  const slibningerTotal = hold.reduce((sum, h) => sum + h.slibninger, 0);
  const koebteTotal = hold.reduce((sum, h) => sum + h.koebteSlibninger, 0);
  const omsaetningTotal = hold.reduce((sum, h) => sum + h.omsaetningOere, 0);

  const total: HoldStatistik = {
    hold: "I alt",
    spillere: medlemmerSpillere,
    harSlebet: medlemmerHarSlebet,
    slibninger: slibningerTotal,
    prSpiller: dividerEllerNull(medlemmerSlibninger, medlemmerSpillere),
    prSpillerDerHarSlebet: dividerEllerNull(medlemmerSlibninger, medlemmerHarSlebet),
    koebteSlibninger: koebteTotal,
    omsaetningOere: omsaetningTotal,
    gnsPrisPrSlibningOere: dividerEllerNull(omsaetningTotal, koebteTotal),
    saldoIAlt: hold.reduce((sum, h) => sum + h.saldoIAlt, 0),
  };

  const maaneder = params.maaneder.map((noegle) => ({
    noegle,
    slibninger: params.slibninger.filter((s) => maanedNoegle(s.tidspunkt) === noegle).length,
  }));

  return { hold, total, maaneder };
}

// To decimaler: tidligt i en sæson er gennemsnittene små (fx 1 slibning på
// 21 spillere), og ét decimal ville vise dem som 0,0.
export function formaterDecimal(tal: number | null): string {
  if (tal === null) return "–";
  return tal.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formaterKroner(oere: number | null): string {
  if (oere === null) return "–";
  return (oere / 100).toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
