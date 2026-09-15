import type { Bevaegelse } from "@prisma/client";

/**
 * Saldoen er ikke et felt der rettes i, den er summen af bevaegelser.
 * antal er signeret: negativt for en slibning, positivt for et koeb eller
 * en fortrudt slibning. En rettelse kan gaa begge veje.
 */
export function beregnSaldo(bevaegelser: Pick<Bevaegelse, "antal">[]): number {
  return bevaegelser.reduce((saldo, b) => saldo + b.antal, 0);
}
