import { describe, expect, it } from "vitest";
import {
  bestemMailTrin,
  erIndenforPaamindelsesspaerretid,
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
