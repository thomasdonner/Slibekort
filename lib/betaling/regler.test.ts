import { describe, expect, it } from "vitest";
import { erMuligDobbeltbetaling, statusForAfvistHaendelse } from "./regler";

const nu = new Date("2026-01-15T12:00:00.000Z");

function minutterFoer(minutter: number): Date {
  return new Date(nu.getTime() - minutter * 60 * 1000);
}

describe("erMuligDobbeltbetaling", () => {
  it("nej uden nogen tidligere betalinger", () => {
    expect(erMuligDobbeltbetaling([], nu)).toBe(false);
  });

  it("ja hvis en anden betaling lige er gennemført", () => {
    expect(erMuligDobbeltbetaling([minutterFoer(0)], nu)).toBe(true);
  });

  it("ja stadig efter 59 minutter", () => {
    expect(erMuligDobbeltbetaling([minutterFoer(59)], nu)).toBe(true);
  });

  it("nej efter 60 minutter", () => {
    expect(erMuligDobbeltbetaling([minutterFoer(60)], nu)).toBe(false);
  });

  it("ja hvis bare én af flere tidligere betalinger er indenfor vinduet", () => {
    expect(erMuligDobbeltbetaling([minutterFoer(500), minutterFoer(10)], nu)).toBe(
      true,
    );
  });
});

describe("statusForAfvistHaendelse", () => {
  it("afvist ved aborted", () => {
    expect(statusForAfvistHaendelse("ABORTED")).toBe("afvist");
  });

  it("udloebet ved expired", () => {
    expect(statusForAfvistHaendelse("EXPIRED")).toBe(
      "udloebet",
    );
  });

  it("annulleret ved cancelled og terminated", () => {
    expect(statusForAfvistHaendelse("CANCELLED")).toBe(
      "annulleret",
    );
    expect(statusForAfvistHaendelse("TERMINATED")).toBe(
      "annulleret",
    );
  });

  it("null for hændelser der håndteres andre steder", () => {
    expect(statusForAfvistHaendelse("AUTHORIZED")).toBeNull();
    expect(statusForAfvistHaendelse("CAPTURED")).toBeNull();
    expect(statusForAfvistHaendelse("CREATED")).toBeNull();
  });
});
