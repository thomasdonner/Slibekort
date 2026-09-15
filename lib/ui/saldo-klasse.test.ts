import { describe, expect, it } from "vitest";
import { saldoKlasse } from "./saldo-klasse";

describe("saldoKlasse", () => {
  it("kritisk ved 0 og derunder", () => {
    expect(saldoKlasse(0)).toBe("tal-kritisk");
    expect(saldoKlasse(-2)).toBe("tal-kritisk");
  });

  it("advarsel ved præcis 1", () => {
    expect(saldoKlasse(1)).toBe("tal-advarsel");
  });

  it("sund over 1", () => {
    expect(saldoKlasse(2)).toBe("tal-sund");
    expect(saldoKlasse(10)).toBe("tal-sund");
  });
});
