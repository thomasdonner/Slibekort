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
    expect(statusForAfvistHaendelse("epayments.payment.aborted.v1")).toBe("afvist");
  });

  it("udloebet ved expired", () => {
    expect(statusForAfvistHaendelse("epayments.payment.expired.v1")).toBe(
      "udloebet",
    );
  });

  it("annulleret ved cancelled og terminated", () => {
    expect(statusForAfvistHaendelse("epayments.payment.cancelled.v1")).toBe(
      "annulleret",
    );
    expect(statusForAfvistHaendelse("epayments.payment.terminated.v1")).toBe(
      "annulleret",
    );
  });

  it("null for hændelser der håndteres andre steder", () => {
    expect(statusForAfvistHaendelse("epayments.payment.authorized.v1")).toBeNull();
    expect(statusForAfvistHaendelse("epayments.payment.captured.v1")).toBeNull();
    expect(statusForAfvistHaendelse("epayments.payment.created.v1")).toBeNull();
  });
});
