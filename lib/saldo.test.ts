import { describe, expect, it } from "vitest";
import { beregnSaldo } from "./saldo";

describe("beregnSaldo", () => {
  it("er 0 uden bevaegelser", () => {
    expect(beregnSaldo([])).toBe(0);
  });

  it("laegger et koeb til saldoen", () => {
    expect(beregnSaldo([{ antal: 10 }])).toBe(10);
  });

  it("traekker en slibning fra saldoen", () => {
    expect(beregnSaldo([{ antal: 10 }, { antal: -1 }])).toBe(9);
  });

  it("summerer et helt forloeb: koeb, ti slibninger, saldo 0", () => {
    const bevaegelser = [
      { antal: 10 },
      ...Array.from({ length: 10 }, () => ({ antal: -1 })),
    ];
    expect(beregnSaldo(bevaegelser)).toBe(0);
  });

  it("gaar i minus naar der slibes ud over saldoen, uden nedre graense", () => {
    const bevaegelser = [
      { antal: 1 },
      { antal: -1 },
      { antal: -1 },
      { antal: -1 },
    ];
    expect(beregnSaldo(bevaegelser)).toBe(-2);
  });

  it("en fortrudt slibning ruller saldoen tilbage", () => {
    const bevaegelser = [{ antal: 10 }, { antal: -1 }, { antal: 1 }];
    expect(beregnSaldo(bevaegelser)).toBe(10);
  });

  it("en rettelse kan gaa begge veje", () => {
    expect(beregnSaldo([{ antal: 5 }, { antal: -3 }])).toBe(2);
    expect(beregnSaldo([{ antal: 5 }, { antal: 3 }])).toBe(8);
  });

  it("er uafhaengig af raekkefoelgen", () => {
    const a = [{ antal: 10 }, { antal: -1 }, { antal: -1 }];
    const b = [{ antal: -1 }, { antal: 10 }, { antal: -1 }];
    expect(beregnSaldo(a)).toBe(beregnSaldo(b));
  });

  it("tager kun antal i brug, resten af Bevaegelse-objektet er ligegyldigt", () => {
    const bevaegelser = [
      { antal: 10, type: "koeb", note: "opfyldning" },
      { antal: -1, type: "slibning", note: null },
    ];
    expect(beregnSaldo(bevaegelser)).toBe(9);
  });
});
