import { describe, expect, it } from "vitest";
import { erGyldigtUdfoertAfNavn, MAKS_UDFOERT_AF_NAVN_LAENGDE } from "./delt-konto";

describe("erGyldigtUdfoertAfNavn", () => {
  it("afviser et tomt navn", () => {
    expect(erGyldigtUdfoertAfNavn("")).toBe(false);
  });

  it("afviser et navn der kun er mellemrum", () => {
    expect(erGyldigtUdfoertAfNavn("   ")).toBe(false);
  });

  it("accepterer et almindeligt navn", () => {
    expect(erGyldigtUdfoertAfNavn("Anders")).toBe(true);
  });

  it("accepterer et navn med omgivende mellemrum (trimmes ved gem, ikke her)", () => {
    expect(erGyldigtUdfoertAfNavn("  Anders  ")).toBe(true);
  });

  it("accepterer et navn præcis på grænsen", () => {
    expect(erGyldigtUdfoertAfNavn("A".repeat(MAKS_UDFOERT_AF_NAVN_LAENGDE))).toBe(
      true,
    );
  });

  it("afviser et navn der er for langt", () => {
    expect(
      erGyldigtUdfoertAfNavn("A".repeat(MAKS_UDFOERT_AF_NAVN_LAENGDE + 1)),
    ).toBe(false);
  });
});
