// Regler for at slette en bruger helt (ikke bare fjerne adgangen). En
// sletning kan ikke fortrydes, og en bruger kan være knyttet til historik,
// der skal kunne spores — derfor er der få, tydelige betingelser, tjekket
// ét sted, så siden og handlingen aldrig er uenige.

export type SletningsVurdering = { ok: true } | { ok: false; fejl: string };

/** "1 bevægelse", "9 bevægelser" — så en besked aldrig siger "1 bevægelser". */
export function antalBevaegelserTekst(antal: number): string {
  return `${antal} ${antal === 1 ? "bevægelse" : "bevægelser"}`;
}

/**
 * Ville ændringen efterlade klubben uden en eneste aktiv administrator?
 * Så kan ingen længere give eller fjerne adgang, og det kan kun rettes
 * direkte i databasen. Bruges ved sletning, spærring og fjernelse af rollen.
 */
export function efterladerIngenAktivAdministrator(params: {
  erAktivAdministrator: boolean;
  antalAndreAktiveAdministratorer: number;
}): boolean {
  return params.erAktivAdministrator && params.antalAndreAktiveAdministratorer === 0;
}

export function vurderSletningAfBruger(params: {
  erDenIndloggedeSelv: boolean;
  antalBevaegelser: number;
  erAktivAdministrator: boolean;
  antalAndreAktiveAdministratorer: number;
}): SletningsVurdering {
  if (params.erDenIndloggedeSelv) {
    return { ok: false, fejl: "Du kan ikke slette din egen konto." };
  }
  // En bevægelse peger på den bruger, der udførte den. Slettes brugeren,
  // ville historikken enten miste sin udfører (og se ud som en automatisk
  // MobilePay-betaling) eller slet ikke kunne spores. Adgangen kan i stedet
  // fjernes, og brugeren står tilbage som spærret.
  if (params.antalBevaegelser > 0) {
    return {
      ok: false,
      fejl: `Brugeren har udført ${antalBevaegelserTekst(params.antalBevaegelser)}, som skal kunne spores. Fjern adgangen i stedet for at slette.`,
    };
  }
  if (efterladerIngenAktivAdministrator(params)) {
    return { ok: false, fejl: "Der skal altid være mindst én aktiv administrator." };
  }
  return { ok: true };
}
