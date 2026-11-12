import { describe, expect, it } from "vitest";
import { MAKS_SPILLER_NUMMER_LAENGE, rensSpillerNummer } from "./spiller-nummer";

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
