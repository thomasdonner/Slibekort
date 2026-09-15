import { prisma } from "@/lib/prisma";
import { beregnSaldo } from "@/lib/saldo";
import { kraevMiljoevariabel } from "@/lib/env";
import { betalingsUrl } from "@/lib/betaling/url";
import {
  bestemMailTrin,
  udvaelgTilPaamindelse,
  type PaamindelseKandidat,
} from "./regler";
import {
  kvitteringSkabelon,
  paamindelseSkabelon,
  type PaamindelseBarn,
} from "./skabeloner";
import { sendMail } from "./resend";

/**
 * Kaldes efter enhver bevægelse, der kan have flyttet en spillers saldo
 * ned i advarsels- eller rykkerområdet — se CLAUDE.md for hvorfor det er
 * uskadeligt at kalde den efter alle bevægelser, også dem der lægger til.
 */
export async function tjekOgSendPaamindelser(spillerId: string): Promise<void> {
  const spiller = await prisma.spiller.findUnique({
    where: { id: spillerId },
    include: {
      bevaegelser: { select: { antal: true } },
      relationer: { where: { modtagerMails: true }, include: { voksen: true } },
    },
  });
  if (!spiller || !spiller.aktiv) return;

  const saldo = beregnSaldo(spiller.bevaegelser);
  if (!bestemMailTrin(saldo)) return;

  const nu = new Date();
  const sidsteMail = await prisma.mail.findFirst({
    where: { spillerId, type: { in: ["advarsel", "rykker"] } },
    orderBy: { tidspunkt: "desc" },
  });
  const selv: PaamindelseKandidat = {
    spillerId: spiller.id,
    navn: spiller.navn,
    saldo,
    sidstPaamindet: sidsteMail?.tidspunkt ?? null,
  };
  // Spilleren selv er spærret af sin egen seneste påmindelse — så er der
  // intet at gøre, uanset hvad søskende måtte have brug for lige nu (de
  // udløser selv, når deres egen bevægelse rammer dem).
  if (udvaelgTilPaamindelse([selv], nu).length === 0) return;

  const modtagere = spiller.relationer.filter((r) => r.voksen.email);
  for (const modtager of modtagere) {
    await sendKombineretPaamindelse({
      voksenId: modtager.voksenId,
      email: modtager.voksen.email!,
      voksenNavn: modtager.voksen.navn,
      nu,
    });
  }
}

async function sendKombineretPaamindelse(params: {
  voksenId: string;
  email: string;
  voksenNavn: string | null;
  nu: Date;
}): Promise<void> {
  const relationer = await prisma.relation.findMany({
    where: { voksenId: params.voksenId, modtagerMails: true },
    include: {
      spiller: { include: { bevaegelser: { select: { antal: true } } } },
    },
  });

  const kandidater: PaamindelseKandidat[] = [];
  const qrTokenForSpiller = new Map<string, string>();
  for (const r of relationer) {
    if (!r.spiller.aktiv) continue;
    qrTokenForSpiller.set(r.spillerId, r.spiller.qrToken);
    const sidsteMail = await prisma.mail.findFirst({
      where: { spillerId: r.spillerId, type: { in: ["advarsel", "rykker"] } },
      orderBy: { tidspunkt: "desc" },
    });
    kandidater.push({
      spillerId: r.spillerId,
      navn: r.spiller.navn,
      saldo: beregnSaldo(r.spiller.bevaegelser),
      sidstPaamindet: sidsteMail?.tidspunkt ?? null,
    });
  }

  const udvalgte = udvaelgTilPaamindelse(kandidater, params.nu);
  if (udvalgte.length === 0) return;

  const boern: PaamindelseBarn[] = udvalgte.map((u) => ({
    navn: u.navn,
    trin: u.trin,
    betalingsUrl: betalingsUrl(qrTokenForSpiller.get(u.spillerId)!),
  }));

  const { emne, tekst, html } = paamindelseSkabelon({
    voksenNavn: params.voksenNavn,
    boern,
    kassererEmail: kraevMiljoevariabel("KASSERER_KONTAKT_EMAIL"),
  });

  const leveringsstatus = await sendMail({ til: params.email, emne, tekst, html });

  await prisma.mail.createMany({
    data: udvalgte.map((u) => ({
      spillerId: u.spillerId,
      type: u.trin,
      sendtTil: params.email,
      leveringsstatus,
    })),
  });
}

/**
 * Ikke kaldt af noget endnu — punkt 6 (webhooken) skal kalde denne, når en
 * betaling er bekræftet. Bygget nu, så mailen findes, når betalingen gør.
 */
export async function sendKvitteringMail(params: {
  spillerId: string;
  beloebKr: number;
  antalSlibninger: number;
  dato: Date;
}): Promise<void> {
  const spiller = await prisma.spiller.findUnique({
    where: { id: params.spillerId },
    include: {
      bevaegelser: { select: { antal: true } },
      relationer: { where: { modtagerMails: true }, include: { voksen: true } },
    },
  });
  if (!spiller) return;

  const nySaldo = beregnSaldo(spiller.bevaegelser);
  const modtagere = spiller.relationer.filter((r) => r.voksen.email);

  for (const modtager of modtagere) {
    const { emne, tekst, html } = kvitteringSkabelon({
      voksenNavn: modtager.voksen.navn,
      barnNavn: spiller.navn,
      beloebKr: params.beloebKr,
      antalSlibninger: params.antalSlibninger,
      nySaldo,
      dato: params.dato,
    });

    const leveringsstatus = await sendMail({
      til: modtager.voksen.email!,
      emne,
      tekst,
      html,
    });

    await prisma.mail.create({
      data: {
        spillerId: spiller.id,
        type: "kvittering",
        sendtTil: modtager.voksen.email!,
        leveringsstatus,
      },
    });
  }
}
