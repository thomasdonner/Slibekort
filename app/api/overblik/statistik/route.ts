import { NextResponse } from "next/server";
import writeXlsxFile, { getSheetData, type Column } from "write-excel-file/node";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi } from "@/lib/roller";
import { hentStatistik, laesSaeson } from "@/lib/overblik/statistik-data";
import { maanedNavn, saesonNavn, type HoldStatistik } from "@/lib/overblik/statistik";

// Excel-udgaven af /overblik/statistik. Selv adgangsstyret uafhængigt af
// siden, ligesom alle andre ruter i overblikket — kun kasserer og
// administrator.
export async function GET(request: Request) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }
  if (!kanRetteSaldi(adgang.adgang)) {
    return NextResponse.json(
      { fejl: "Kun kasserer og administrator kan trække statistikken." },
      { status: 403 },
    );
  }

  const saeson = laesSaeson(new URL(request.url).searchParams.get("saeson"));
  const { statistik } = await hentStatistik(saeson);

  const holdRaekker: HoldStatistik[] = [...statistik.hold, statistik.total];

  // En tom celle (null) for tal, der ikke giver mening, fx pr. spiller for
  // Engangsslibning — ikke et nul, der ville se ud som en rigtig værdi.
  const tal = (v: number | null) => ({ value: v ?? undefined, type: Number });
  // Gennemsnit rundes til to decimaler, så Excel ikke viser 0,0476190476…
  const rund = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);

  const holdKolonner: Column<HoldStatistik>[] = [
    { header: { value: "Hold" }, cell: (r) => ({ value: r.hold }), width: 20 },
    { header: { value: "Spillere" }, cell: (r) => tal(r.spillere), width: 10 },
    { header: { value: "Har slebet" }, cell: (r) => tal(r.harSlebet), width: 12 },
    { header: { value: "Slibninger" }, cell: (r) => tal(r.slibninger), width: 12 },
    { header: { value: "Pr. spiller" }, cell: (r) => tal(rund(r.prSpiller)), width: 12 },
    {
      header: { value: "Pr. spiller der har slebet" },
      cell: (r) => tal(rund(r.prSpillerDerHarSlebet)),
      width: 24,
    },
    { header: { value: "Solgt" }, cell: (r) => tal(r.koebteSlibninger), width: 10 },
    {
      header: { value: "Omsætning (kr.)" },
      cell: (r) => tal(r.omsaetningOere / 100),
      width: 16,
    },
    {
      header: { value: "Gns. pris pr. solgt slibning (kr.)" },
      cell: (r) =>
        tal(rund(r.gnsPrisPrSlibningOere === null ? null : r.gnsPrisPrSlibningOere / 100)),
      width: 32,
    },
    { header: { value: "Saldo i dag" }, cell: (r) => tal(r.saldoIAlt), width: 12 },
  ];

  type MaanedRaekke = (typeof statistik.maaneder)[number];
  const maanedKolonner: Column<MaanedRaekke>[] = [
    { header: { value: "Måned" }, cell: (m) => ({ value: maanedNavn(m.noegle) }), width: 20 },
    { header: { value: "Slibninger" }, cell: (m) => tal(m.slibninger), width: 12 },
  ];

  // Flere ark kræver færdige rækker, ikke objekter + kolonner —
  // getSheetData laver den omregning.
  const buffer = await writeXlsxFile([
    {
      sheet: "Pr. hold",
      data: getSheetData(holdRaekker, holdKolonner),
      columns: holdKolonner,
      stickyRowsCount: 1,
    },
    {
      sheet: "Pr. måned",
      data: getSheetData(statistik.maaneder, maanedKolonner),
      columns: maanedKolonner,
      stickyRowsCount: 1,
    },
  ]).toBuffer();

  const filnavn = `slibestatistik-${saesonNavn(saeson).replace("/", "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filnavn}"`,
    },
  });
}
