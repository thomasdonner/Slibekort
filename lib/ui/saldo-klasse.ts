// Samme tærskler som selve påmindelsesreglerne (lib/mails/regler.ts), så
// farven i overblikket stemmer overens med, hvornår en mail rent faktisk
// sendes — ikke en uafhængig, ny tommelfingerregel.
export function saldoKlasse(saldo: number): string {
  if (saldo <= 0) return "tal-kritisk";
  if (saldo === 1) return "tal-advarsel";
  return "tal-sund";
}
