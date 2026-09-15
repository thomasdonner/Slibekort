// CLAUDE.md, "Regler der ikke må ændres uden at spørge": 10 slibninger
// koster 300 kr. Fast pris, ikke udledt af noget, ikke konfigurerbar.
export const PRIS_OERE = 30_000;
export const ANTAL_SLIBNINGER = 10;

// Klubben tager ikke imod kontanter, så en enkelt slibning — fx når en
// spiller er løbet tør og ikke kan vente på en fuld opfyldning — købes nu
// gennem systemet i stedet for den tidligere plan om en selvstændig,
// uregistreret MobilePay-boks ved maskinen (se CLAUDE.md og
// kravspecifikationens afsnit 3). Prisen pr. slibning er med vilje højere
// end ved opfyldning (40 kr. mod 30 kr.) — bulk-købet skal stadig være det
// oplagte valg.
export const ENKELT_PRIS_OERE = 4_000;
export const ENKELT_ANTAL_SLIBNINGER = 1;

export type PakkeId = "standard" | "enkelt";

type Pakke = { antalSlibninger: number; prisOere: number };

const PAKKER: Record<PakkeId, Pakke> = {
  standard: { antalSlibninger: ANTAL_SLIBNINGER, prisOere: PRIS_OERE },
  enkelt: { antalSlibninger: ENKELT_ANTAL_SLIBNINGER, prisOere: ENKELT_PRIS_OERE },
};

// Eneste sted en pris/antal-kombination slås op ud fra noget klienten har
// sendt — aldrig beløbet selv, kun et pakke-id, der slår op i den faste
// liste ovenfor. En manipuleret formular kan højst bede om en af de to
// rigtige pakker, aldrig et selvvalgt beløb.
export function hentPakke(id: string): Pakke | null {
  return id === "standard" || id === "enkelt" ? PAKKER[id] : null;
}
