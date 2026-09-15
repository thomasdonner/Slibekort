export function kraevMiljoevariabel(navn: string): string {
  const vaerdi = process.env[navn];
  if (!vaerdi) throw new Error(`${navn} er ikke sat.`);
  return vaerdi;
}
