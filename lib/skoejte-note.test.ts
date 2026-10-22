import { describe, expect, it } from "vitest";
import { MAKS_SKOEJTE_NOTE_LAENGE, rensSkoejteNote } from "./skoejte-note";

describe("rensSkoejteNote", () => {
  it("beholder en almindelig note, uden mellemrum i enderne", () => {
    expect(rensSkoejteNote("  Hulning 1/2 tomme  ")).toEqual({
      ok: true,
      vaerdi: "Hulning 1/2 tomme",
    });
  });

  it("gør en tom note til null, så den kan fjernes", () => {
    expect(rensSkoejteNote("")).toEqual({ ok: true, vaerdi: null });
    expect(rensSkoejteNote("   \n ")).toEqual({ ok: true, vaerdi: null });
  });

  it("tillader en note på præcis maksimal længde", () => {
    const note = "a".repeat(MAKS_SKOEJTE_NOTE_LAENGE);
    expect(rensSkoejteNote(note)).toEqual({ ok: true, vaerdi: note });
  });

  it("afviser en for lang note", () => {
    const resultat = rensSkoejteNote("a".repeat(MAKS_SKOEJTE_NOTE_LAENGE + 1));
    expect(resultat.ok).toBe(false);
  });

  it("bevarer linjeskift midt i noten", () => {
    expect(rensSkoejteNote("Venstre: 1/2\nHøjre: 3/8")).toEqual({
      ok: true,
      vaerdi: "Venstre: 1/2\nHøjre: 3/8",
    });
  });
});
