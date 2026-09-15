import { describe, expect, it } from "vitest";
import { kvitteringSkabelon, paamindelseSkabelon } from "./skabeloner";

describe("paamindelseSkabelon", () => {
  it("hilser med voksnes fornavn, hvis det kendes", () => {
    const { tekst } = paamindelseSkabelon({
      voksenNavn: "Bente",
      boern: [{ navn: "Anders", trin: "advarsel", betalingsUrl: "https://x/1" }],
      kassererEmail: "kasserer@klub.dk",
    });
    expect(tekst).toMatch(/^Hej Bente,/);
  });

  it("hilser bare 'Hej' uden et kendt voksennavn", () => {
    const { tekst } = paamindelseSkabelon({
      voksenNavn: null,
      boern: [{ navn: "Anders", trin: "advarsel", betalingsUrl: "https://x/1" }],
      kassererEmail: "kasserer@klub.dk",
    });
    expect(tekst).toMatch(/^Hej,/);
  });

  it("advarsel nævner 1 slibning tilbage og prisen", () => {
    const { emne, tekst } = paamindelseSkabelon({
      voksenNavn: "Bente",
      boern: [{ navn: "Anders", trin: "advarsel", betalingsUrl: "https://x/1" }],
      kassererEmail: "kasserer@klub.dk",
    });
    expect(emne).toBe("Anders har 1 slibning tilbage");
    expect(tekst).toContain("1 slibning tilbage");
    expect(tekst).toContain("300 kr");
  });

  it("rykkeren forsikrer at barnet stadig får slebet skøjter", () => {
    const { tekst } = paamindelseSkabelon({
      voksenNavn: "Bente",
      boern: [{ navn: "Anders", trin: "rykker", betalingsUrl: "https://x/1" }],
      kassererEmail: "kasserer@klub.dk",
    });
    expect(tekst).toMatch(/får stadig slebet skøjter/);
  });

  it("indeholder betalingslinket og kasserens mail", () => {
    const { tekst, html } = paamindelseSkabelon({
      voksenNavn: "Bente",
      boern: [{ navn: "Anders", trin: "advarsel", betalingsUrl: "https://x/betal/123" }],
      kassererEmail: "kasserer@klub.dk",
    });
    expect(tekst).toContain("https://x/betal/123");
    expect(html).toContain("https://x/betal/123");
    expect(tekst).toContain("kasserer@klub.dk");
  });

  it("samler to søskende i én mail, hver med eget afsnit og link", () => {
    const { emne, tekst } = paamindelseSkabelon({
      voksenNavn: "Bente",
      boern: [
        { navn: "Anders", trin: "advarsel", betalingsUrl: "https://x/1" },
        { navn: "Andrea", trin: "rykker", betalingsUrl: "https://x/2" },
      ],
      kassererEmail: "kasserer@klub.dk",
    });
    expect(emne).toContain("Anders");
    expect(emne).toContain("Andrea");
    expect(tekst).toContain("https://x/1");
    expect(tekst).toContain("https://x/2");
    expect(tekst).toContain("Anders har 1 slibning tilbage");
    expect(tekst).toMatch(/Andreas slibekort er brugt op/);
  });

  it("undslipper html-metategn i navne", () => {
    const { html } = paamindelseSkabelon({
      voksenNavn: "<Bente>",
      boern: [{ navn: "Anders", trin: "advarsel", betalingsUrl: "https://x/1" }],
      kassererEmail: "kasserer@klub.dk",
    });
    expect(html).not.toContain("<Bente>");
    expect(html).toContain("&lt;Bente&gt;");
  });

  it("kaster en fejl uden nogen børn — der er intet at sende", () => {
    expect(() =>
      paamindelseSkabelon({ voksenNavn: null, boern: [], kassererEmail: "k@k.dk" }),
    ).toThrow();
  });
});

describe("kvitteringSkabelon", () => {
  it("indeholder beløb, antal, ny saldo og dato", () => {
    const { tekst } = kvitteringSkabelon({
      voksenNavn: "Bente",
      barnNavn: "Anders",
      beloebKr: 300,
      antalSlibninger: 10,
      nySaldo: 9,
      dato: new Date("2026-03-01T12:00:00Z"),
    });
    expect(tekst).toContain("300 kr");
    expect(tekst).toContain("10 slibninger");
    expect(tekst).toContain("Ny saldo: 9");
    expect(tekst).toContain("01.03.2026");
  });
});
