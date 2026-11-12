import { describe, expect, it } from "vitest";
import {
  findNummerRettelser,
  MAKS_SPILLER_NUMMER_LAENGE,
  rensSpillerNummer,
} from "./spiller-nummer";

describe("rensSpillerNummer", () => {
  it("beholder et almindeligt nummer, uden mellemrum i enderne", () => {
    expect(rensSpillerNummer("  17 ")).toEqual({ ok: true, vaerdi: "17" });
  });

  it("bevarer et foranstillet nul, så 07 ikke bliver til 7", () => {
    expect(rensSpillerNummer("07")).toEqual({ ok: true, vaerdi: "07" });
  });

  it("fjerner et # foran, da kortet selv sætter tegnet", () => {
    expect(rensSpillerNummer("#7")).toEqual({ ok: true, vaerdi: "7" });
    expect(rensSpillerNummer("# 7")).toEqual({ ok: true, vaerdi: "7" });
  });

  it("gør et tomt felt til null, så nummeret kan fjernes", () => {
    expect(rensSpillerNummer("")).toEqual({ ok: true, vaerdi: null });
    expect(rensSpillerNummer("  ")).toEqual({ ok: true, vaerdi: null });
    expect(rensSpillerNummer("#")).toEqual({ ok: true, vaerdi: null });
  });

  it("tillader et nummer på præcis maksimal længde", () => {
    const nummer = "1".repeat(MAKS_SPILLER_NUMMER_LAENGE);
    expect(rensSpillerNummer(nummer)).toEqual({ ok: true, vaerdi: nummer });
  });

  it("afviser et for langt nummer", () => {
    expect(rensSpillerNummer("1".repeat(MAKS_SPILLER_NUMMER_LAENGE + 1)).ok).toBe(false);
  });

  it("afviser mellemrum midt i nummeret", () => {
    expect(rensSpillerNummer("1 7").ok).toBe(false);
  });
});

describe("findNummerRettelser", () => {
  const spillere = [
    { id: "a", navn: "Anna", nummer: null },
    { id: "b", navn: "Bo", nummer: "7" },
    { id: "c", navn: "Carl", nummer: "12" },
  ];

  it("giver kun de rækker, hvor nummeret er ændret", () => {
    const resultat = findNummerRettelser(
      spillere,
      new Map([
        ["a", "9"],
        ["b", "7"],
        ["c", "12"],
      ]),
    );
    expect(resultat).toEqual({
      ok: true,
      rettelser: [{ spillerId: "a", vaerdi: "9" }],
    });
  });

  it("fjerner et nummer, når feltet er tømt", () => {
    const resultat = findNummerRettelser(spillere, new Map([["b", ""]]));
    expect(resultat).toEqual({
      ok: true,
      rettelser: [{ spillerId: "b", vaerdi: null }],
    });
  });

  it("ser et tomt felt på en spiller uden nummer som uændret", () => {
    const resultat = findNummerRettelser(spillere, new Map([["a", " "]]));
    expect(resultat).toEqual({ ok: true, rettelser: [] });
  });

  it("rører ikke en spiller, der ikke er med i formularen", () => {
    const resultat = findNummerRettelser(spillere, new Map([["a", "3"]]));
    expect(resultat).toEqual({
      ok: true,
      rettelser: [{ spillerId: "a", vaerdi: "3" }],
    });
  });

  it("ignorerer et id, der ikke hører til holdet", () => {
    const resultat = findNummerRettelser(spillere, new Map([["fremmed", "5"]]));
    expect(resultat).toEqual({ ok: true, rettelser: [] });
  });

  it("skriver intet, hvis blot én værdi er ugyldig, og nævner spilleren", () => {
    const resultat = findNummerRettelser(
      spillere,
      new Map([
        ["a", "9"],
        ["c", "1 2"],
      ]),
    );
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.fejl).toHaveLength(1);
      expect(resultat.fejl[0]).toContain("Carl");
    }
  });
});
