import type { Rolle } from "@prisma/client";
import { ENGANGSSLIBNING_HOLD } from "./spillere/engangsslibning";

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

/**
 * Må brugeren rette en bestemt spillers saldo? Kasserer og administrator
 * kan rette alle. En holdleder kan kun rette spillere på sine egne hold —
 * og intet andet: de øvrige ting kasserer/administrator kan (import,
 * rapporter, statistik, stoppe en spiller) følger stadig `kanRetteSaldi`,
 * som holdlederen med vilje ikke opfylder.
 */
export function kanRetteSaldoForHold(adgang: BrugerAdgang, hold: string): boolean {
  if (kanRetteSaldi(adgang)) return true;
  return adgang.roller.includes("holdleder") && adgang.hold.includes(hold);
}

/**
 * Hvilke hold en sliber må slibe for. En sliber uden tildelte hold er ikke
 * begrænset (alle hold) — det er sådan alle slibere er, indtil en
 * administrator udtrykkeligt tildeler hold, så ingen bliver låst ude af
 * maskinen ved en fejl. `null` betyder "alle hold".
 */
export function sliberHoldBegraensning(tildelteHold: string[]): string[] | null {
  return tildelteHold.length === 0 ? null : tildelteHold;
}

/**
 * Må sliberen slibe for en spiller på dette hold? Engangsslibning er ikke
 * et rigtigt hold (den delte række til motionister, scannet fra sin egen
 * printede kode) og er derfor tilladt for alle slibere uanset hold.
 */
export function kanSlibeForHold(tilladte: string[] | null, hold: string): boolean {
  if (tilladte === null) return true;
  if (hold === ENGANGSSLIBNING_HOLD) return true;
  return tilladte.includes(hold);
}

export function kanAdministrereBrugere(adgang: BrugerAdgang): boolean {
  return harEnAfRollerne(adgang, KAN_ADMINISTRERE_BRUGERE_ROLLER);
}
