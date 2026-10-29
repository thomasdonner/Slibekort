import { describe, expect, it } from "vitest";
import { grupperEfterHulning, normaliserHulning } from "./hulning-grupper";

describe("normaliserHulning", () => {
  it("ser bort fra store/små bogstaver og ekstra mellemrum", () => {
    expect(normaliserHulning("  1/2   Tomme ")).toBe("1/2 tomme");
  });

  it("giver null for en tom eller manglende note", () => {
    expect(normaliserHulning(null)).toBeNull();
    expect(normaliserHulning("   ")).toBeNull();
  });
});

describe("grupperEfterHulning", () => {
  const spillere = [
    { navn: "Carl", skoejteNote: "1/2 tomme" },
    { navn: "Anna", skoejteNote: "3/8 tomme" },
    { navn: "Bo", skoejteNote: "1/2 Tomme" },
    { navn: "Dan", skoejteNote: null },
    { navn: "Ea", skoejteNote: "  " },
  ];
  const grupper = grupperEfterHulning(spillere);

  it("samler stavemåder, der kun adskiller sig i store/små bogstaver, i én gruppe", () => {
    const halv = grupper.find((g) => g.noegle === "1/2 tomme");
    expect(halv?.spillere.map((s) => s.navn)).toEqual(["Bo", "Carl"]);
  });

  it("bruger den første stavemåde som gruppens overskrift", () => {
    const halv = grupper.find((g) => g.noegle === "1/2 tomme");
    expect(halv?.navn).toBe("1/2 tomme");
  });

  it("sætter grupper med en hulning alfabetisk og spillere uden hulning sidst", () => {
    expect(grupper.map((g) => g.noegle)).toEqual(["1/2 tomme", "3/8 tomme", null]);
  });

  it("lægger tomme og manglende noter i samme gruppe uden hulning", () => {
    const ingen = grupper.find((g) => g.noegle === null);
    expect(ingen?.spillere.map((s) => s.navn)).toEqual(["Dan", "Ea"]);
    expect(ingen?.navn).toBeNull();
  });

  it("sorterer tal i noterne som tal, ikke tegn for tegn", () => {
    const resultat = grupperEfterHulning([
      { navn: "A", skoejteNote: "Hulning 15" },
      { navn: "B", skoejteNote: "Hulning 9" },
      { navn: "C", skoejteNote: "Hulning 100" },
    ]);
    expect(resultat.map((g) => g.navn)).toEqual(["Hulning 9", "Hulning 15", "Hulning 100"]);
  });

  it("giver en tom liste uden spillere", () => {
    expect(grupperEfterHulning([])).toEqual([]);
  });
});
