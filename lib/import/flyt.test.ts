import { describe, expect, it } from "vitest";
import { findSikkerFlytning, type FlytKandidat } from "./flyt";

const u14: FlytKandidat = {
  spillerId: "u14-bo",
  hold: "U14",
  voksenMails: ["mor@example.com"],
};

describe("findSikkerFlytning", () => {
  it("finder flytningen når præcis én kandidat deler en mailadresse", () => {
    expect(findSikkerFlytning(["mor@example.com"], [u14])).toBe(u14);
  });

  it("finder intet uden nogen indkommende mailadresse", () => {
    expect(findSikkerFlytning([], [u14])).toBeNull();
  });

  it("finder intet når ingen kandidat deler en mailadresse", () => {
    expect(findSikkerFlytning(["andenmor@example.com"], [u14])).toBeNull();
  });

  it("finder intet når to forskellige kandidater begge deler en mailadresse — for usikkert", () => {
    const u16: FlytKandidat = {
      spillerId: "u16-bo",
      hold: "U16",
      voksenMails: ["mor@example.com"],
    };
    expect(findSikkerFlytning(["mor@example.com"], [u14, u16])).toBeNull();
  });

  it("er ligeglad med, hvilken af flere mailadresser der matcher", () => {
    expect(
      findSikkerFlytning(["far@example.com", "mor@example.com"], [u14]),
    ).toBe(u14);
  });
});
