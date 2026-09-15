/**
 * Systemet genkender søskende på, at de deler mindst én voksen
 * (kravspecifikationen, afsnit 5.5). Tager en flad liste af relationer
 * for de voksne, den aktuelle spiller selv har — ikke alle relationer i
 * databasen — og finder de andre spiller-id'er, der optræder blandt dem.
 */
export function findSoskendeIds(
  relationer: { spillerId: string; voksenId: string }[],
  spillerId: string,
): string[] {
  const egneVoksne = new Set(
    relationer.filter((r) => r.spillerId === spillerId).map((r) => r.voksenId),
  );

  const soskendeIds = new Set<string>();
  for (const r of relationer) {
    if (r.spillerId !== spillerId && egneVoksne.has(r.voksenId)) {
      soskendeIds.add(r.spillerId);
    }
  }

  return [...soskendeIds];
}
