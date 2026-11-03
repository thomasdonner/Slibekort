import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { sliberHoldBegraensning } from "./roller";

type Adgang =
  | {
      ok: true;
      brugerId: string;
      delt: boolean;
      // Hvilke hold sliberen må slibe for. null = alle (ingen tildelte
      // hold) — se sliberHoldBegraensning i lib/roller.ts.
      hold: string[] | null;
    }
  | { ok: false; status: number; fejl: string };

/**
 * Svar til en sliber, der prøver at røre en spiller på et hold, kontoen
 * ikke har fået. `kode` lader telefonen skelne det fra et udløbet login
 * (også 403) — begge ville ellers se ens ud, og en kø-post, der aldrig kan
 * lykkes, skal droppes, mens en, der blot mangler et login, skal vente.
 */
export function afvisForkertHold() {
  return NextResponse.json(
    {
      fejl: "Du har ikke adgang til at slibe for dette hold.",
      kode: "forkert_hold",
    },
    { status: 403 },
  );
}

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

  const tildelteHold = await prisma.brugerHold.findMany({
    where: { brugerId: session.user.brugerId },
    select: { hold: true },
  });

  return {
    ok: true,
    brugerId: session.user.brugerId,
    delt: session.user.delt,
    hold: sliberHoldBegraensning(tildelteHold.map((h) => h.hold)),
  };
}
