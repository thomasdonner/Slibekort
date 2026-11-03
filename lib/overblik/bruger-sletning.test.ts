import { describe, expect, it } from "vitest";
import {
  antalBevaegelserTekst,
  efterladerIngenAktivAdministrator,
  vurderSletningAfBruger,
} from "./bruger-sletning";

const grundlag = {
  erDenIndloggedeSelv: false,
  antalBevaegelser: 0,
  erAktivAdministrator: false,
  antalAndreAktiveAdministratorer: 2,
};

describe("vurderSletningAfBruger", () => {
  it("tillader sletning af en bruger uden historik", () => {
    expect(vurderSletningAfBruger(grundlag)).toEqual({ ok: true });
  });

  it("afviser at slette sin egen konto", () => {
    const r = vurderSletningAfBruger({ ...grundlag, erDenIndloggedeSelv: true });
    expect(r.ok).toBe(false);
  });

  it("afviser at slette en bruger, der har udført bevægelser, og nævner hvor mange", () => {
    const r = vurderSletningAfBruger({ ...grundlag, antalBevaegelser: 9 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fejl).toContain("9 bevægelser");
  });

  it("afviser at slette den sidste aktive administrator", () => {
    const r = vurderSletningAfBruger({
      ...grundlag,
      erAktivAdministrator: true,
      antalAndreAktiveAdministratorer: 0,
    });
    expect(r.ok).toBe(false);
  });

  it("tillader at slette en administrator, når der er en anden aktiv", () => {
    const r = vurderSletningAfBruger({
      ...grundlag,
      erAktivAdministrator: true,
      antalAndreAktiveAdministratorer: 1,
    });
    expect(r).toEqual({ ok: true });
  });
});

describe("efterladerIngenAktivAdministrator", () => {
  it("er falsk for en, der ikke selv er aktiv administrator", () => {
    expect(
      efterladerIngenAktivAdministrator({ erAktivAdministrator: false, antalAndreAktiveAdministratorer: 0 }),
    ).toBe(false);
  });

  it("er sand for den sidste aktive administrator", () => {
    expect(
      efterladerIngenAktivAdministrator({ erAktivAdministrator: true, antalAndreAktiveAdministratorer: 0 }),
    ).toBe(true);
  });
});

describe("antalBevaegelserTekst", () => {
  it("bruger ental for én og flertal ellers", () => {
    expect(antalBevaegelserTekst(1)).toBe("1 bevægelse");
    expect(antalBevaegelserTekst(9)).toBe("9 bevægelser");
    expect(antalBevaegelserTekst(0)).toBe("0 bevægelser");
  });
});
