// Rensning af en kontaktperson, en holdleder/kasserer taster ind i
// overblikket. Samme regler som resten af systemet: mailadresser gemmes med
// små bogstaver (så "samme mail = samme voksen" ikke afhænger af
// stavemåden), og en tom værdi gemmes som `null`, ikke som en tom streng.

export type NyKontakt = {
  navn: string | null;
  email: string | null;
  telefon: string | null;
};

const MAKS_NAVN = 100;
const MAKS_EMAIL = 254;
const MAKS_TELEFON = 30;

// Bevidst enkel: det eneste, der skal fanges, er en åbenlys tastefejl
// (manglende @ eller punktum). Om adressen reelt findes, afgør en mail, der
// ikke kan leveres, ikke en regex.
const EMAIL_MOENSTER = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function rensNyKontakt(raa: {
  navn: string;
  email: string;
  telefon: string;
}): { ok: true; vaerdi: NyKontakt } | { ok: false; fejl: string } {
  const navn = raa.navn.trim();
  const email = raa.email.trim().toLowerCase();
  const telefon = raa.telefon.trim();

  if (email === "" && telefon === "") {
    return { ok: false, fejl: "Skriv mindst en mailadresse eller et telefonnummer." };
  }
  if (email !== "" && !EMAIL_MOENSTER.test(email)) {
    return { ok: false, fejl: "Mailadressen ser ikke rigtig ud." };
  }
  if (navn.length > MAKS_NAVN || email.length > MAKS_EMAIL || telefon.length > MAKS_TELEFON) {
    return { ok: false, fejl: "Et af felterne er for langt." };
  }

  return {
    ok: true,
    vaerdi: {
      navn: navn === "" ? null : navn,
      email: email === "" ? null : email,
      telefon: telefon === "" ? null : telefon,
    },
  };
}
