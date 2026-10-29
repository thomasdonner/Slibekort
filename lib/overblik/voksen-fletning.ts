// Samme mailadresse betyder samme person: `voksne.email` er unik, og en
// voksen kan høre til flere spillere (søskende, eller to børn der deler en
// kontaktperson). Retter en holdleder en kontakts mail til en adresse, der
// allerede findes hos en anden voksen, er de to altså én person — så den
// gamle voksen flettes ind i den eksisterende, i stedet for at afvise
// rettelsen eller oprette to voksne med samme adresse (som ville give to
// påmindelsesmails til samme forælder, hver med sit barn).

export type VoksenRelation = { spillerId: string; modtagerMails: boolean };

/**
 * Hvilke af den gamle voksnes relationer skal oprettes hos den eksisterende
 * voksen. En spiller, der allerede er knyttet til den eksisterende voksen,
 * beholder den relation, den har — ellers ville flettningen enten fejle
 * (relationens nøgle er spiller + voksen) eller ændre en indstilling, der
 * allerede var valgt.
 */
export function relationerDerSkalFlyttes(
  gammelVoksensRelationer: VoksenRelation[],
  eksisterendeVoksensSpillerIds: string[],
): VoksenRelation[] {
  const allerede = new Set(eksisterendeVoksensSpillerIds);
  return gammelVoksensRelationer.filter((r) => !allerede.has(r.spillerId));
}
