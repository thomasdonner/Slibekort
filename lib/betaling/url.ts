import { kraevMiljoevariabel } from "@/lib/env";

// Bruges begge steder en spiller skal kunne nås udefra uden login: mailens
// betalingslink og den trykte QR-kode. De skal give den samme URL, ellers
// stemmer koden på papiret ikke overens med den, en påmindelse sender.
export function betalingsUrl(qrToken: string): string {
  return `${kraevMiljoevariabel("APP_URL")}/betal/${qrToken}`;
}
