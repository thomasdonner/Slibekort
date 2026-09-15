import { describe, expect, it } from "vitest";
import {
  gaetHoldFraFilnavn,
  parseHoldsportRaekker,
  raekkerTilObjekter,
} from "./holdsport";

function raekke(felter: Partial<Record<string, unknown>>) {
  return {
    Fornavn: "",
    Efternavn: "",
    "E-mail": "",
    "E-mail 2": "",
    Mobil: "",
    "Mobil 2": "",
    Rolle: "Spiller",
    ...felter,
  };
}

describe("raekkerTilObjekter", () => {
  it("nøgler rækker på overskriften fra første række", () => {
    const objekter = raekkerTilObjekter([
      ["Fornavn", "Efternavn"],
      ["Anders", "And"],
    ]);
    expect(objekter).toEqual([{ Fornavn: "Anders", Efternavn: "And" }]);
  });

  it("dropper helt tomme rækker", () => {
    const objekter = raekkerTilObjekter([
      ["Fornavn"],
      ["Anders"],
      [null],
      [undefined],
    ]);
    expect(objekter).toHaveLength(1);
  });
});

describe("parseHoldsportRaekker", () => {
  it("laver en spiller med to forskellige kontakter", () => {
    const { spillere, noter } = parseHoldsportRaekker(
      [
        raekke({
          Fornavn: "Anders",
          Efternavn: "And",
          "E-mail": "mor@eksempel.dk",
          Mobil: "12345678",
          "E-mail 2": "far@eksempel.dk",
          "Mobil 2": "87654321",
        }),
      ],
      "U14",
    );

    expect(spillere).toEqual([
      {
        navn: "Anders And",
        hold: "U14",
        voksne: [
          { email: "mor@eksempel.dk", mobil: "12345678" },
          { email: "far@eksempel.dk", mobil: "87654321" },
        ],
      },
    ]);
    expect(noter).toEqual([]);
  });

  it("fjerner #12 fra efternavnet", () => {
    const { spillere } = parseHoldsportRaekker(
      [raekke({ Fornavn: "Anders", Efternavn: "And #12" })],
      "U14",
    );
    expect(spillere[0].navn).toBe("Anders And");
  });

  it("springer trænere og holdledere over", () => {
    const { spillere } = parseHoldsportRaekker(
      [
        raekke({ Fornavn: "Bo", Efternavn: "Træner", Rolle: "Træner" }),
        raekke({ Fornavn: "Anders", Efternavn: "And" }),
      ],
      "U14",
    );
    expect(spillere).toHaveLength(1);
    expect(spillere[0].navn).toBe("Anders And");
  });

  it("springer rækker uden navn over", () => {
    const { spillere } = parseHoldsportRaekker([raekke({})], "U14");
    expect(spillere).toHaveLength(0);
  });

  it("flager samme navn to gange på holdet", () => {
    const { noter } = parseHoldsportRaekker(
      [
        raekke({ Fornavn: "Anders", Efternavn: "And" }),
        raekke({ Fornavn: "Anders", Efternavn: "And" }),
      ],
      "U14",
    );
    expect(noter).toContainEqual({
      kategori: "Samme navn optræder to gange på holdet",
      detalje: "Anders And",
    });
  });

  it("bruger ikke en alternativ mail der er den samme som den primære", () => {
    const { spillere, noter } = parseHoldsportRaekker(
      [
        raekke({
          Fornavn: "Anders",
          Efternavn: "And",
          "E-mail": "mor@eksempel.dk",
          "E-mail 2": "mor@eksempel.dk",
        }),
      ],
      "U14",
    );
    expect(spillere[0].voksne).toHaveLength(1);
    expect(noter).toContainEqual({
      kategori: "Alternativ mail er den samme som den primære — bruges ikke",
      detalje: "Anders And",
    });
  });

  it("flager ingen mailadresse", () => {
    const { spillere, noter } = parseHoldsportRaekker(
      [raekke({ Fornavn: "Anders", Efternavn: "And", Mobil: "12345678" })],
      "U14",
    );
    expect(spillere[0].voksne).toEqual([{ email: null, mobil: "12345678" }]);
    expect(noter).toContainEqual({
      kategori: "Ingen mailadresse — kan ikke få påmindelser",
      detalje: "Anders And",
    });
  });

  it("flager en ekstra kontakt uden mailadresse", () => {
    const { noter } = parseHoldsportRaekker(
      [
        raekke({
          Fornavn: "Anders",
          Efternavn: "And",
          "E-mail": "mor@eksempel.dk",
          "Mobil 2": "87654321",
        }),
      ],
      "U14",
    );
    expect(noter).toContainEqual({
      kategori: "Ekstra kontakt uden mailadresse — får ingen påmindelser",
      detalje: "Anders And",
    });
  });

  it("flager søskende ved delt mailadresse på tværs af spillere", () => {
    const { noter } = parseHoldsportRaekker(
      [
        raekke({
          Fornavn: "Anders",
          Efternavn: "And",
          "E-mail": "mor@eksempel.dk",
        }),
        raekke({
          Fornavn: "Andrea",
          Efternavn: "And",
          "E-mail": "mor@eksempel.dk",
        }),
      ],
      "U14",
    );
    expect(noter).toContainEqual({
      kategori: "Samme mailadresse på flere spillere — sandsynligvis søskende",
      detalje: "2 spillere",
    });
  });

  it("mailadresser sammenlignes uden hensyn til store/små bogstaver", () => {
    const { spillere } = parseHoldsportRaekker(
      [
        raekke({
          Fornavn: "Anders",
          Efternavn: "And",
          "E-mail": "Mor@Eksempel.dk",
        }),
      ],
      "U14",
    );
    expect(spillere[0].voksne[0].email).toBe("mor@eksempel.dk");
  });
});

describe("gaetHoldFraFilnavn", () => {
  it("finder holdnavnet i filnavnet", () => {
    expect(gaetHoldFraFilnavn("Holdmedlemmer-u14.xlsx")).toBe("U14");
  });

  it("returnerer null uden et holdnavn i filnavnet", () => {
    expect(gaetHoldFraFilnavn("eksport.xlsx")).toBeNull();
  });
});
