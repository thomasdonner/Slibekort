import { describe, expect, it } from "vitest";
import { rensNyKontakt } from "./kontakt";

describe("rensNyKontakt", () => {
  it("gemmer mailadressen med små bogstaver og uden mellemrum", () => {
    const r = rensNyKontakt({ navn: " Mor ", email: "  Mor@Eksempel.DK ", telefon: "" });
    expect(r).toEqual({ ok: true, vaerdi: { navn: "Mor", email: "mor@eksempel.dk", telefon: null } });
  });

  it("gør tomme felter til null", () => {
    const r = rensNyKontakt({ navn: "", email: "far@eksempel.dk", telefon: "  " });
    expect(r).toEqual({ ok: true, vaerdi: { navn: null, email: "far@eksempel.dk", telefon: null } });
  });

  it("tillader en kontakt med kun et telefonnummer", () => {
    const r = rensNyKontakt({ navn: "Farmor", email: "", telefon: "12345678" });
    expect(r).toEqual({ ok: true, vaerdi: { navn: "Farmor", email: null, telefon: "12345678" } });
  });

  it("afviser en kontakt uden hverken mail eller telefon", () => {
    expect(rensNyKontakt({ navn: "Mor", email: "", telefon: "" }).ok).toBe(false);
  });

  it("afviser en mailadresse uden @ eller punktum", () => {
    expect(rensNyKontakt({ navn: "", email: "mor.eksempel.dk", telefon: "" }).ok).toBe(false);
    expect(rensNyKontakt({ navn: "", email: "mor@eksempel", telefon: "" }).ok).toBe(false);
    expect(rensNyKontakt({ navn: "", email: "mor @eksempel.dk", telefon: "" }).ok).toBe(false);
  });

  it("afviser et alt for langt felt", () => {
    expect(rensNyKontakt({ navn: "a".repeat(101), email: "mor@eksempel.dk", telefon: "" }).ok).toBe(false);
  });
});
