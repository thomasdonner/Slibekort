import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kraevMiljoevariabel } from "@/lib/env";
import { verificerWebhook } from "@/lib/mobilepay/webhook";
import { indfrielseBetaling } from "@/lib/mobilepay/klient";
import { erMuligDobbeltbetaling, statusForAfvistHaendelse } from "@/lib/betaling/regler";
import { sendKvitteringMail } from "@/lib/mails/send";

type MobilePayHaendelse = {
  reference: string;
  name: string;
  amount: { value: number; currency: string };
};

export async function POST(request: Request) {
  // Den RÅ tekst skal bruges til signaturen — genserialisering af et
  // parset objekt ville ikke nødvendigvis give byte-for-byte det samme.
  const raaIndhold = await request.text();

  const gyldig = verificerWebhook({
    hemmelighed: kraevMiljoevariabel("MOBILEPAY_WEBHOOK_SECRET"),
    metode: "POST",
    stiOgQuery: new URL(request.url).pathname,
    raaIndhold,
    headers: {
      "x-ms-date": request.headers.get("x-ms-date") ?? "",
      host: request.headers.get("host") ?? "",
      "x-ms-content-sha256": request.headers.get("x-ms-content-sha256") ?? "",
      authorization: request.headers.get("authorization") ?? "",
    },
  });

  if (!gyldig) {
    return NextResponse.json({ fejl: "Ugyldig signatur." }, { status: 401 });
  }

  const haendelse = JSON.parse(raaIndhold) as MobilePayHaendelse;

  const betaling = await prisma.betaling.findUnique({
    where: { udbyderReference: haendelse.reference },
  });
  if (!betaling) {
    // Ukendt reference — ikke en betaling vi selv har oprettet. Svarer 200
    // alligevel, ellers bliver den bare ved med at blive gensendt.
    return NextResponse.json({ ok: true });
  }

  if (haendelse.name === "epayments.payment.authorized.v1") {
    await prisma.betaling.update({
      where: { id: betaling.id },
      data: { status: "godkendt" },
    });
    // Indfrielsen er selv idempotent (deterministisk Idempotency-Key
    // afledt af referencen), så det er trygt at kalde den igen ved en
    // gensendt webhook.
    await indfrielseBetaling({
      reference: haendelse.reference,
      beloebOere: betaling.beloeb,
    });
    return NextResponse.json({ ok: true });
  }

  if (haendelse.name === "epayments.payment.captured.v1") {
    const resultat = await prisma.$transaction(async (tx) => {
      // Kravspecifikationen, afsnit 9: "Saldoen ændres først, når
      // webhooken er modtaget og verificeret." where-betingelsen her er
      // det der garanterer, at en gensendt webhook kun krediterer én gang.
      const opdateret = await tx.betaling.updateMany({
        where: { id: betaling.id, status: { not: "gennemfoert" } },
        data: { status: "gennemfoert" },
      });
      if (opdateret.count === 0) {
        return { krediteret: false };
      }

      const tidligereGennemfoerte = await tx.betaling.findMany({
        where: {
          spillerId: betaling.spillerId,
          status: "gennemfoert",
          id: { not: betaling.id },
        },
        select: { tidspunkt: true },
      });
      const muligDobbelt = erMuligDobbeltbetaling(
        tidligereGennemfoerte.map((b) => b.tidspunkt),
        new Date(),
      );

      await tx.bevaegelse.create({
        data: {
          spillerId: betaling.spillerId,
          type: "koeb",
          antal: betaling.antalSlibninger,
          klientId: `betaling-${betaling.udbyderReference}`,
          note: muligDobbelt
            ? "Mulig dobbeltbetaling — tjek betalinger for denne spiller"
            : null,
        },
      });

      return { krediteret: true };
    });

    if (resultat.krediteret) {
      await sendKvitteringMail({
        spillerId: betaling.spillerId,
        beloebKr: betaling.beloeb / 100,
        antalSlibninger: betaling.antalSlibninger,
        dato: new Date(),
      });
    }
    return NextResponse.json({ ok: true });
  }

  const afvistStatus = statusForAfvistHaendelse(haendelse.name);
  if (afvistStatus) {
    await prisma.betaling.update({
      where: { id: betaling.id },
      data: { status: afvistStatus },
    });
  }

  return NextResponse.json({ ok: true });
}
