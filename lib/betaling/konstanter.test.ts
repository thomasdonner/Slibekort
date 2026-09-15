import { describe, expect, it } from "vitest";
import {
  ANTAL_SLIBNINGER,
  ENKELT_ANTAL_SLIBNINGER,
  ENKELT_PRIS_OERE,
  hentPakke,
  PRIS_OERE,
} from "./konstanter";

describe("hentPakke", () => {
  it("standard giver den faste 10-for-300-pris", () => {
    expect(hentPakke("standard")).toEqual({
      antalSlibninger: ANTAL_SLIBNINGER,
      prisOere: PRIS_OERE,
    });
  });

  it("enkelt giver den faste 1-for-40-pris", () => {
    expect(hentPakke("enkelt")).toEqual({
      antalSlibninger: ENKELT_ANTAL_SLIBNINGER,
      prisOere: ENKELT_PRIS_OERE,
    });
  });

  it("afviser alt andet end de to kendte id'er", () => {
    expect(hentPakke("")).toBeNull();
    expect(hentPakke("gratis")).toBeNull();
    // En forsøgt manipulation, hvor nogen sender et beløb i stedet for et id.
    expect(hentPakke("100")).toBeNull();
  });
});
