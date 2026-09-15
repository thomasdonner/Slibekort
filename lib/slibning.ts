export const SPAERRETID_MINUTTER = 60;
export const FORTRYDELSESVINDUE_SEKUNDER = 10;
// Luft ud over de 10 sekunder i kravspecifikationen, til at dække nettiden
// mellem knappen deaktiveres på telefonen og serverens svar når den slår
// fejl. Selve reglen ændres ikke, kun hvor stramt serveren håndhæver den.
export const FORTRYD_SERVER_BUFFER_SEKUNDER = 5;

/**
 * Skal sliberen advares om, at spilleren allerede er scannet for nylig?
 * `sidsteSlibning` er tidspunktet for spillerens seneste ikke-fortrudte
 * slibning, eller null hvis der ikke er nogen.
 */
export function erIndenforSpaerretid(
  sidsteSlibning: Date | null,
  nu: Date,
): boolean {
  if (!sidsteSlibning) {
    return false;
  }
  const minutterSiden =
    (nu.getTime() - sidsteSlibning.getTime()) / 1000 / 60;
  return minutterSiden < SPAERRETID_MINUTTER;
}

/**
 * Kan sliberen stadig fortryde en slibning fra `bevaegelseTidspunkt`?
 */
export function erIndenforFortrydelsesvindue(
  bevaegelseTidspunkt: Date,
  nu: Date,
): boolean {
  const sekunderSiden = (nu.getTime() - bevaegelseTidspunkt.getTime()) / 1000;
  return (
    sekunderSiden <= FORTRYDELSESVINDUE_SEKUNDER + FORTRYD_SERVER_BUFFER_SEKUNDER
  );
}
