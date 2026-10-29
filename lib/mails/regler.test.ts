import { describe, expect, it } from "vitest";
import {
  bestemMailTrin,
  erIndenforPaamindelsesspaerretid,
  erNyligPaamindet,
  udvaelgTilPaamindelse,
} from "./regler";

describe("bestemMailTrin", () => {
  it("advarsel ved saldo 1", () => {
    expect(bestemMailTrin(1)).toBe("advarsel");
  });

  it("rykker ved saldo 0", () => {
    expect(bestemMailTrin(0)).toBe("rykker");
  });

  it("rykker igen ved saldo -2", () => {
    expect(bestemMailTrin(-2)).toBe("rykker");
  });

  it("rykker også hvis saldoen på anden vis kommer under -2", () => {
    expect(bestemMailTrin(-5)).toBe("rykker");
  });

  it("intet ved -1 — hverken advarsel eller rykker", () => {
    expect(bestemMailTrin(-1)).toBeNull();
  });

  it("intet ved en sund saldo", () => {
    expect(bestemMailTrin(10)).toBeNull();
    expect(bestemMailTrin(2)).toBeNull();
  });
});

describe("erIndenforPaamindelsesspaerretid", () => {
  const nu = new Date("2026-01-15T12:00:00.000Z");

  it("ikke spærret uden en tidligere påmindelse", () => {
    expect(erIndenforPaamindelsesspaerretid(null, nu)).toBe(false);
  });

  it("spærret lige efter en påmindelse", () => {
    expect(erIndenforPaamindelsesspaerretid(nu, nu)).toBe(true);
  });

  it("stadig spærret efter 47 timer", () => {
    const sidst = new Date(nu.getTime() - 47 * 60 * 60 * 1000);
    expect(erIndenforPaamindelsesspaerretid(sidst, nu)).toBe(true);
  });

  it("ikke spærret længere efter 48 timer", () => {
    const sidst = new Date(nu.getTime() - 48 * 60 * 60 * 1000);
    expect(erIndenforPaamindelsesspaerretid(sidst, nu)).toBe(false);
  });
});

describe("udvaelgTilPaamindelse", () => {
  const nu = new Date("2026-01-15T12:00:00.000Z");

  it("vælger et barn med lav saldo og ingen tidligere påmindelse", () => {
    const udvalgte = udvaelgTilPaamindelse(
      [{ spillerId: "a", navn: "Anders", saldo: 1, sidstPaamindet: null }],
      nu,
    );
    expect(udvalgte).toEqual([{ spillerId: "a", navn: "Anders", trin: "advarsel" }]);
  });

  it("springer et barn med sund saldo over", () => {
    const udvalgte = udvaelgTilPaamindelse(
      [{ spillerId: "a", navn: "Anders", saldo: 10, sidstPaamindet: null }],
      nu,
    );
    expect(udvalgte).toEqual([]);
  });

  it("springer et barn over der er blevet påmindet for nylig", () => {
    const udvalgte = udvaelgTilPaamindelse(
      [
        {
          spillerId: "a",
          navn: "Anders",
          saldo: 0,
          sidstPaamindet: new Date(nu.getTime() - 60 * 60 * 1000),
        },
      ],
      nu,
    );
    expect(udvalgte).toEqual([]);
  });

  it("samler to søskende med lav saldo samme dag i én mail", () => {
    const udvalgte = udvaelgTilPaamindelse(
      [
        { spillerId: "a", navn: "Anders", saldo: 1, sidstPaamindet: null },
        { spillerId: "b", navn: "Andrea", saldo: 0, sidstPaamindet: null },
      ],
      nu,
    );
    expect(udvalgte).toEqual([
      { spillerId: "a", navn: "Anders", trin: "advarsel" },
      { spillerId: "b", navn: "Andrea", trin: "rykker" },
    ]);
  });

  it("nævner kun det søskende der reelt trænger til det", () => {
    const udvalgte = udvaelgTilPaamindelse(
      [
        { spillerId: "a", navn: "Anders", saldo: 1, sidstPaamindet: null },
        { spillerId: "b", navn: "Andrea", saldo: 8, sidstPaamindet: null },
      ],
      nu,
    );
    expect(udvalgte).toEqual([{ spillerId: "a", navn: "Anders", trin: "advarsel" }]);
  });
});

describe("udvaelgTilPaamindelse med tvungen manuel påmindelse", () => {
  const nu = new Date("2026-01-15T12:00:00.000Z");
  const nyligPaamindet = new Date(nu.getTime() - 60 * 60 * 1000);

  it("ignorerer 48-timersgrænsen for den spiller, der udtrykkeligt er valgt", () => {
    const udvalgte = udvaelgTilPaamindelse(
      [{ spillerId: "a", navn: "Anders", saldo: 0, sidstPaamindet: nyligPaamindet }],
      nu,
      ["a"],
    );
    expect(udvalgte).toEqual([{ spillerId: "a", navn: "Anders", trin: "rykker" }]);
  });

  it("lader en søskende følge den almindelige regel, selvom den valgte tvinges", () => {
    const udvalgte = udvaelgTilPaamindelse(
      [
        { spillerId: "a", navn: "Anders", saldo: 1, sidstPaamindet: nyligPaamindet },
        { spillerId: "b", navn: "Bo", saldo: 1, sidstPaamindet: nyligPaamindet },
      ],
      nu,
      ["a"],
    );
    expect(udvalgte.map((u) => u.spillerId)).toEqual(["a"]);
  });

  it("tvinger ikke en spiller med sund saldo — saldoen afgør stadig, om der er noget at sende", () => {
    const udvalgte = udvaelgTilPaamindelse(
      [{ spillerId: "a", navn: "Anders", saldo: 5, sidstPaamindet: null }],
      nu,
      ["a"],
    );
    expect(udvalgte).toEqual([]);
  });

  it("uden en tvunget spiller gælder 48-timersgrænsen som hidtil", () => {
    const udvalgte = udvaelgTilPaamindelse(
      [{ spillerId: "a", navn: "Anders", saldo: 0, sidstPaamindet: nyligPaamindet }],
      nu,
    );
    expect(udvalgte).toEqual([]);
  });
});

describe("erNyligPaamindet (spærre mod dobbeltklik)", () => {
  const nu = new Date("2026-01-15T12:00:00.000Z");

  it("er falsk uden en tidligere påmindelse", () => {
    expect(erNyligPaamindet(null, nu)).toBe(false);
  });

  it("er sand lige efter en påmindelse", () => {
    expect(erNyligPaamindet(new Date(nu.getTime() - 20 * 1000), nu)).toBe(true);
  });

  it("er falsk efter et par minutter", () => {
    expect(erNyligPaamindet(new Date(nu.getTime() - 3 * 60 * 1000), nu)).toBe(false);
  });
});
