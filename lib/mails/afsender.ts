// Mails med en bar afsenderadresse ("noreply@aaik.dk") uden et visningsnavn
// bliver oftere markeret som spam — især hos Microsoft (Hotmail/Outlook) —
// og forælderen kan ikke genkende afsenderen i indbakken. Derfor får
// adressen altid klubbens navn foran.
export const AFSENDER_NAVN = "Aalborg Ishockey Klub";

/**
 * Sætter klubbens navn foran en bar adresse. Står der allerede et navn
 * (`Navn <adresse>`), bruges det uændret, så en bevidst indstilling i
 * RESEND_FROM altid vinder.
 */
export function byggAfsender(fra: string): string {
  const adresse = fra.trim();
  return adresse.includes("<") ? adresse : `${AFSENDER_NAVN} <${adresse}>`;
}
