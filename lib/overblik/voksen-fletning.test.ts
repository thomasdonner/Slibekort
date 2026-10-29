import { describe, expect, it } from "vitest";
import { relationerDerSkalFlyttes } from "./voksen-fletning";

describe("relationerDerSkalFlyttes", () => {
  it("flytter alle den gamle voksnes børn, når den eksisterende voksen ingen har til fælles", () => {
    const resultat = relationerDerSkalFlyttes(
      [
        { spillerId: "a", modtagerMails: true },
        { spillerId: "b", modtagerMails: false },
      ],
      ["c"],
    );
    expect(resultat).toEqual([
      { spillerId: "a", modtagerMails: true },
      { spillerId: "b", modtagerMails: false },
    ]);
  });

  it("springer en spiller over, der allerede er knyttet til den eksisterende voksen", () => {
    const resultat = relationerDerSkalFlyttes(
      [
        { spillerId: "a", modtagerMails: true },
        { spillerId: "b", modtagerMails: true },
      ],
      ["a"],
    );
    expect(resultat).toEqual([{ spillerId: "b", modtagerMails: true }]);
  });

  it("flytter intet, når alle børn allerede er knyttet til den eksisterende voksen", () => {
    expect(
      relationerDerSkalFlyttes([{ spillerId: "a", modtagerMails: true }], ["a", "b"]),
    ).toEqual([]);
  });

  it("bevarer modtagerMails-indstillingen for dem, der flyttes", () => {
    const [r] = relationerDerSkalFlyttes([{ spillerId: "a", modtagerMails: false }], []);
    expect(r.modtagerMails).toBe(false);
  });
});
