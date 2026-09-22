import { auth } from "./auth";

type Adgang =
  | { ok: true; brugerId: string; delt: boolean }
  | { ok: false; status: number; fejl: string };

/**
 * Tjekker at der er en logget ind bruger med rollen 'sliber'. Bruges i
 * hver API-rute under /api/slib, ikke kun i sidens layout — layoutet
 * styrer kun hvad der vises, ikke hvad API-ruterne accepterer.
 */
export async function kraevSliber(): Promise<Adgang> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, status: 401, fejl: "Ikke logget ind." };
  }
  if (!session.user.aktiv || !session.user.brugerId) {
    return { ok: false, status: 403, fejl: "Kontoen har ikke adgang." };
  }
  if (!session.user.roller.includes("sliber")) {
    return { ok: false, status: 403, fejl: "Kontoen kan ikke slibe." };
  }

  return { ok: true, brugerId: session.user.brugerId, delt: session.user.delt };
}
