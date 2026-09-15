import type { Rolle } from "@prisma/client";

// Roller der kan se og bruge overblikket og importsiden overhovedet.
// Selve rækkevidden (hvilke hold) styres af kanSeHold/kanRetteHold.
export const OVERBLIK_ROLLER: Rolle[] = ["kasserer", "holdleder", "administrator"];

// Kasserer kan rette saldi og alt andet i overblikket, men afsnit 4
// skelner eksplicit: "Administrator: Alt, inklusive brugeradgang og
// opsætning" — kasserer kan altså ikke selv give andre adgang.
export const KAN_RETTE_SALDI_ROLLER: Rolle[] = ["kasserer", "administrator"];
export const KAN_ADMINISTRERE_BRUGERE_ROLLER: Rolle[] = ["administrator"];

export type BrugerAdgang = {
  roller: Rolle[];
  hold: string[];
};

function harEnAfRollerne(adgang: BrugerAdgang, roller: Rolle[]): boolean {
  return adgang.roller.some((rolle) => roller.includes(rolle));
}

/** Kasserer og administrator ser og retter alle hold, uanset hvad. */
export function kanSeAlleHold(adgang: BrugerAdgang): boolean {
  return harEnAfRollerne(adgang, KAN_RETTE_SALDI_ROLLER);
}

export function kanSeHold(adgang: BrugerAdgang, hold: string): boolean {
  return kanSeAlleHold(adgang) || adgang.hold.includes(hold);
}

export function kanRetteSaldi(adgang: BrugerAdgang): boolean {
  return harEnAfRollerne(adgang, KAN_RETTE_SALDI_ROLLER);
}

export function kanAdministrereBrugere(adgang: BrugerAdgang): boolean {
  return harEnAfRollerne(adgang, KAN_ADMINISTRERE_BRUGERE_ROLLER);
}
