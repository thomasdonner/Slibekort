import { prisma } from "./prisma";
import { auth } from "./auth";
import { OVERBLIK_ROLLER, type BrugerAdgang } from "./roller";

type Adgang =
  | { ok: true; brugerId: string; adgang: BrugerAdgang }
  | { ok: false; status: number; fejl: string };

/**
 * Bruges af både importsiden og kassererens overblik: samme rollekrav
 * (kasserer, holdleder eller administrator), og begge har brug for at
 * vide hvilke hold en holdleder konkret har adgang til.
 */
export async function kraevOverblikAdgang(): Promise<Adgang> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, status: 401, fejl: "Ikke logget ind." };
  }
  if (!session.user.aktiv || !session.user.brugerId) {
    return { ok: false, status: 403, fejl: "Kontoen har ikke adgang." };
  }
  if (!session.user.roller.some((rolle) => OVERBLIK_ROLLER.includes(rolle))) {
    return { ok: false, status: 403, fejl: "Kontoen har ikke adgang til overblikket." };
  }

  const holdAdgang = await prisma.brugerHold.findMany({
    where: { brugerId: session.user.brugerId },
    select: { hold: true },
  });

  return {
    ok: true,
    brugerId: session.user.brugerId,
    adgang: {
      roller: session.user.roller,
      hold: holdAdgang.map((h) => h.hold),
    },
  };
}
