import { describe, expect, it } from "vitest";
import { byggAfsender } from "./afsender";

describe("byggAfsender", () => {
  it("sætter klubbens navn foran en bar adresse", () => {
    expect(byggAfsender("noreply@aaik.dk")).toBe("Aalborg Ishockey Klub <noreply@aaik.dk>");
  });

  it("fjerner mellemrum omkring adressen", () => {
    expect(byggAfsender("  noreply@aaik.dk \n")).toBe(
      "Aalborg Ishockey Klub <noreply@aaik.dk>",
    );
  });

  it("lader en afsender, der allerede har et navn, være uændret", () => {
    expect(byggAfsender("Slibekort <slibekort@aaik.dk>")).toBe("Slibekort <slibekort@aaik.dk>");
  });
});
