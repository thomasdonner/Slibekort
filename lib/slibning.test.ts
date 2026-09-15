import { describe, expect, it } from "vitest";
import { erIndenforFortrydelsesvindue, erIndenforSpaerretid } from "./slibning";

const nu = new Date("2026-01-15T18:00:00.000Z");

function minutterFoer(minutter: number): Date {
  return new Date(nu.getTime() - minutter * 60 * 1000);
}

function sekunderFoer(sekunder: number): Date {
  return new Date(nu.getTime() - sekunder * 1000);
}

describe("erIndenforSpaerretid", () => {
  it("advarer ikke uden en tidligere slibning", () => {
    expect(erIndenforSpaerretid(null, nu)).toBe(false);
  });

  it("advarer lige efter en slibning", () => {
    expect(erIndenforSpaerretid(minutterFoer(0), nu)).toBe(true);
  });

  it("advarer stadig efter 59 minutter", () => {
    expect(erIndenforSpaerretid(minutterFoer(59), nu)).toBe(true);
  });

  it("advarer ikke laengere efter 60 minutter", () => {
    expect(erIndenforSpaerretid(minutterFoer(60), nu)).toBe(false);
  });

  it("advarer ikke efter flere timer", () => {
    expect(erIndenforSpaerretid(minutterFoer(180), nu)).toBe(false);
  });
});

describe("erIndenforFortrydelsesvindue", () => {
  it("kan fortrydes lige efter slibningen", () => {
    expect(erIndenforFortrydelsesvindue(sekunderFoer(0), nu)).toBe(true);
  });

  it("kan fortrydes ved de 10 sekunder fra kravspecifikationen", () => {
    expect(erIndenforFortrydelsesvindue(sekunderFoer(10), nu)).toBe(true);
  });

  it("kan fortrydes indenfor serverens netvaerksbuffer", () => {
    expect(erIndenforFortrydelsesvindue(sekunderFoer(15), nu)).toBe(true);
  });

  it("kan ikke fortrydes efter bufferen er brugt op", () => {
    expect(erIndenforFortrydelsesvindue(sekunderFoer(15.1), nu)).toBe(false);
  });

  it("kan slet ikke fortrydes et minut efter", () => {
    expect(erIndenforFortrydelsesvindue(sekunderFoer(60), nu)).toBe(false);
  });
});
