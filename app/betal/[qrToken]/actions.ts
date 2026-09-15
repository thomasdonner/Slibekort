"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { kraevMiljoevariabel } from "@/lib/env";
import { opretBetaling } from "@/lib/mobilepay/klient";
import { hentPakke } from "@/lib/betaling/konstanter";

export async function startBetaling(formData: FormData) {
  const qrToken = String(formData.get("qrToken"));

  // Formularen sender kun et pakke-id, aldrig et beløb — se
  // lib/betaling/konstanter.ts. hentPakke er den ene kilde til, hvad de to
  // gyldige id'er reelt koster.
  const pakke = hentPakke(String(formData.get("pakke")));
  if (!pakke) {
    throw new Error("Ukendt pakke.");
  }

  const spiller = await prisma.spiller.findUnique({ where: { qrToken } });
  if (!spiller || !spiller.aktiv) {
    throw new Error("Ukendt eller inaktiv spiller.");
  }

  // Egen reference, ikke MobilePays — kravspecifikationen, afsnit 9:
  // "Betalingens reference gemmes og bruges som nøgle." Gemmes FØR selve
  // MobilePay-kaldet, så webhooken altid kan finde en række at opdatere,
  // uanset hvor tidligt den skulle nå frem.
  const reference = crypto.randomUUID();

  await prisma.betaling.create({
    data: {
      spillerId: spiller.id,
      beloeb: pakke.prisOere,
      antalSlibninger: pakke.antalSlibninger,
      udbyderReference: reference,
      status: "oprettet",
    },
  });

  const { redirectUrl } = await opretBetaling({
    reference,
    beloebOere: pakke.prisOere,
    returnUrl: `${kraevMiljoevariabel("APP_URL")}/betal/${qrToken}/tak`,
  });

  redirect(redirectUrl);
}
