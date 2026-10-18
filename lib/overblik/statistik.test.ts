import { describe, expect, it } from "vitest";
import {
  beregnStatistik,
  formaterDecimal,
  formaterKroner,
  maanedNoegle,
  saesonGraenser,
  saesonMaaneder,
  saesonNavn,
  saesonStartAar,
} from "./statistik";

describe("sæson", () => {
  it("regner sæsonen ud fra dansk måned: juli og frem hører til samme år", () => {
    expect(saesonStartAar(new Date("2026-10-18T10:00:00Z"))).toBe(2026);
    expect(saesonStartAar(new Date("2026-07-01T10:00:00Z"))).toBe(2026);
  });

  it("regner januar–juni til sæsonen, der startede året før", () => {
    expect(saesonStartAar(new Date("2027-03-10T10:00:00Z"))).toBe(2026);
    expect(saesonStartAar(new Date("2027-06-30T10:00:00Z"))).toBe(2026);
  });

  it("bruger dansk tid, ikke UTC, når måneden skifter ved midnat", () => {
    // 30. juni kl. 22.30 UTC er 1. juli kl. 00.30 i Danmark (sommertid).
    expect(maanedNoegle(new Date("2027-06-30T22:30:00Z"))).toBe("2027-07");
    expect(saesonStartAar(new Date("2027-06-30T22:30:00Z"))).toBe(2027);
  });

  it("giver sæsonens grænser fra 1. juli til 1. juli", () => {
    const { fra, til } = saesonGraenser(2026);
    expect(fra.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(til.toISOString()).toBe("2027-07-01T00:00:00.000Z");
  });

  it("navngiver sæsonen som 2026/27", () => {
    expect(saesonNavn(2026)).toBe("2026/27");
    expect(saesonNavn(2099)).toBe("2099/00");
  });

  it("lister måneder fra juli til og med nuværende måned", () => {
    expect(saesonMaaneder(2026, new Date("2026-10-18T10:00:00Z"))).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("lister alle 12 måneder for en afsluttet sæson", () => {
    const maaneder = saesonMaaneder(2025, new Date("2026-10-18T10:00:00Z"));
    expect(maaneder).toHaveLength(12);
    expect(maaneder[0]).toBe("2025-07");
    expect(maaneder[11]).toBe("2026-06");
  });
});

describe("beregnStatistik", () => {
  const spillere = [
    { id: "a", hold: "U12", aktiv: true, saldo: 4 },
    { id: "b", hold: "U12", aktiv: true, saldo: 0 },
    { id: "c", hold: "U14", aktiv: true, saldo: 7 },
    // Stoppet spiller: tæller med i sine slibninger, ikke i antal spillere.
    { id: "d", hold: "U14", aktiv: false, saldo: 3 },
    { id: "e", hold: "Engangsslibning", aktiv: true, saldo: 0 },
  ];
  const slibninger = [
    { spillerId: "a", tidspunkt: new Date("2026-09-10T16:00:00Z") },
    { spillerId: "a", tidspunkt: new Date("2026-09-20T16:00:00Z") },
    { spillerId: "b", tidspunkt: new Date("2026-10-02T16:00:00Z") },
    { spillerId: "c", tidspunkt: new Date("2026-10-03T16:00:00Z") },
    { spillerId: "d", tidspunkt: new Date("2026-10-04T16:00:00Z") },
    { spillerId: "e", tidspunkt: new Date("2026-10-05T16:00:00Z") },
  ];
  const betalinger = [
    { spillerId: "a", beloebOere: 30000, antalSlibninger: 10 },
    { spillerId: "c", beloebOere: 4000, antalSlibninger: 1 },
    { spillerId: "e", beloebOere: 4000, antalSlibninger: 1 },
  ];
  const maaneder = ["2026-09", "2026-10"];

  const statistik = beregnStatistik({ spillere, slibninger, betalinger, maaneder });
  const u12 = statistik.hold.find((h) => h.hold === "U12")!;
  const u14 = statistik.hold.find((h) => h.hold === "U14")!;
  const engang = statistik.hold.find((h) => h.hold === "Engangsslibning")!;

  it("tæller slibninger, spillere og dem der har slebet pr. hold", () => {
    expect(u12).toMatchObject({ spillere: 2, harSlebet: 2, slibninger: 3 });
    expect(u12.prSpiller).toBe(1.5);
    expect(u12.prSpillerDerHarSlebet).toBe(1.5);
  });

  it("tæller en stoppet spillers slibninger med, men ikke som spiller på holdet", () => {
    expect(u14).toMatchObject({ spillere: 1, harSlebet: 2, slibninger: 2 });
    expect(u14.prSpiller).toBe(2);
    expect(u14.prSpillerDerHarSlebet).toBe(1);
  });

  it("regner købte slibninger, omsætning og gennemsnitspris", () => {
    expect(u12).toMatchObject({ koebteSlibninger: 10, omsaetningOere: 30000 });
    expect(u12.gnsPrisPrSlibningOere).toBe(3000);
    expect(u14.gnsPrisPrSlibningOere).toBe(4000);
  });

  it("lægger kun saldi fra aktive spillere sammen", () => {
    expect(u12.saldoIAlt).toBe(4);
    expect(u14.saldoIAlt).toBe(7);
  });

  it("giver Engangsslibning ingen spillertal, og sætter den sidst", () => {
    expect(engang.spillere).toBeNull();
    expect(engang.prSpiller).toBeNull();
    expect(engang.slibninger).toBe(1);
    expect(statistik.hold.map((h) => h.hold)).toEqual(["U12", "U14", "Engangsslibning"]);
  });

  it("tæller Engangsslibning med i totalens slibninger og omsætning, men ikke i pr. spiller", () => {
    expect(statistik.total.slibninger).toBe(6);
    expect(statistik.total.omsaetningOere).toBe(38000);
    expect(statistik.total.koebteSlibninger).toBe(12);
    expect(statistik.total.spillere).toBe(3);
    // 5 slibninger på rigtige hold / 3 aktive spillere.
    expect(statistik.total.prSpiller).toBeCloseTo(5 / 3);
  });

  it("fordeler slibninger på måneder efter dansk tid", () => {
    expect(statistik.maaneder).toEqual([
      { noegle: "2026-09", slibninger: 2 },
      { noegle: "2026-10", slibninger: 4 },
    ]);
  });

  it("giver null i stedet for at dividere med nul", () => {
    const tom = beregnStatistik({
      spillere: [{ id: "x", hold: "U10", aktiv: true, saldo: 0 }],
      slibninger: [],
      betalinger: [],
      maaneder: [],
    });
    expect(tom.hold[0].prSpillerDerHarSlebet).toBeNull();
    expect(tom.hold[0].gnsPrisPrSlibningOere).toBeNull();
    expect(tom.total.prSpillerDerHarSlebet).toBeNull();
  });
});

describe("formatering", () => {
  it("viser tal med dansk komma og – for manglende værdi", () => {
    expect(formaterDecimal(1.5)).toBe("1,50");
    expect(formaterDecimal(1 / 21)).toBe("0,05");
    expect(formaterDecimal(null)).toBe("–");
    expect(formaterKroner(30000)).toBe("300,00");
    expect(formaterKroner(null)).toBe("–");
  });
});
