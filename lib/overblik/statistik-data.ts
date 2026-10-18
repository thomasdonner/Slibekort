import { prisma } from "@/lib/prisma";
import {
  beregnStatistik,
  saesonGraenser,
  saesonMaaneder,
  saesonStartAar,
  type Statistik,
} from "./statistik";

// Fælles opslag til både siden (/overblik/statistik) og Excel-filen
// (/api/overblik/statistik), så de to aldrig kan vise forskellige tal.
export async function hentStatistik(
  startAar: number,
  nu: Date = new Date(),
): Promise<{ statistik: Statistik; saesoner: number[] }> {
  const { fra, til } = saesonGraenser(startAar);

  const [spillere, saldoer, slibninger, betalinger, foerste] = await Promise.all([
    prisma.spiller.findMany({ select: { id: true, hold: true, aktiv: true } }),
    prisma.bevaegelse.groupBy({ by: ["spillerId"], _sum: { antal: true } }),
    // En fortrudt slibning har en 'fortrudt'-række pegende på sig og tæller
    // ikke — den blev aldrig slebet. 'rettelse' (kassererens manuelle
    // saldorettelser) er ikke slibninger og tælles slet ikke med.
    prisma.bevaegelse.findMany({
      where: { type: "slibning", fortrudtAf: null, tidspunkt: { gte: fra, lt: til } },
      select: { spillerId: true, tidspunkt: true },
    }),
    prisma.betaling.findMany({
      where: { status: "gennemfoert", tidspunkt: { gte: fra, lt: til } },
      select: { spillerId: true, beloeb: true, antalSlibninger: true },
    }),
    prisma.bevaegelse.findFirst({ orderBy: { tidspunkt: "asc" }, select: { tidspunkt: true } }),
  ]);

  const saldoPrSpiller = new Map(saldoer.map((s) => [s.spillerId, s._sum.antal ?? 0]));

  const statistik = beregnStatistik({
    spillere: spillere.map((s) => ({
      id: s.id,
      hold: s.hold,
      aktiv: s.aktiv,
      saldo: saldoPrSpiller.get(s.id) ?? 0,
    })),
    slibninger,
    betalinger: betalinger.map((b) => ({
      spillerId: b.spillerId,
      beloebOere: b.beloeb,
      antalSlibninger: b.antalSlibninger,
    })),
    maaneder: saesonMaaneder(startAar, nu),
  });

  // Alle sæsoner fra den første bevægelse og frem til nu, nyeste først.
  const foersteSaeson = foerste ? saesonStartAar(foerste.tidspunkt) : saesonStartAar(nu);
  const saesoner: number[] = [];
  for (let aar = saesonStartAar(nu); aar >= foersteSaeson; aar--) saesoner.push(aar);

  return { statistik, saesoner };
}

/** Læser ?saeson= og falder tilbage til den nuværende sæson ved ugyldig værdi. */
export function laesSaeson(param: string | null | undefined, nu: Date = new Date()): number {
  const nuvaerende = saesonStartAar(nu);
  const aar = Number(param);
  if (!Number.isInteger(aar) || aar < 2000 || aar > nuvaerende) return nuvaerende;
  return aar;
}
