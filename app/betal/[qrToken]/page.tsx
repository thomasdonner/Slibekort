import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { beregnSaldo } from "@/lib/saldo";
import { saldoKlasse } from "@/lib/ui/saldo-klasse";
import {
  ANTAL_SLIBNINGER,
  ENKELT_ANTAL_SLIBNINGER,
  ENKELT_PRIS_OERE,
  PRIS_OERE,
} from "@/lib/betaling/konstanter";
import { startBetaling } from "./actions";

// Ingen login her — kravspecifikationen, afsnit 10: en QR-kode uden
// sliberens login må kun vise saldoen og en knap til at fylde op, aldrig
// trække noget. Samme side, uanset om linket kommer fra en mail eller
// nogen har fotograferet koden direkte.
export default async function BetalSide({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = await params;

  const spiller = await prisma.spiller.findUnique({
    where: { qrToken },
    include: { bevaegelser: { select: { antal: true } } },
  });

  if (!spiller || !spiller.aktiv) {
    notFound();
  }

  const saldo = beregnSaldo(spiller.bevaegelser);

  return (
    <main>
      <h1>{spiller.navn}s slibekort</h1>
      <p>
        Saldo:{" "}
        <span className={`tal ${saldoKlasse(saldo)}`}>{saldo} slibninger</span>
      </p>

      <form action={startBetaling}>
        <input type="hidden" name="qrToken" value={qrToken} />
        <input type="hidden" name="pakke" value="standard" />
        <p>
          {ANTAL_SLIBNINGER} slibninger — {PRIS_OERE / 100} kr.
        </p>
        <button type="submit">Betal med MobilePay</button>
      </form>

      <form action={startBetaling}>
        <input type="hidden" name="qrToken" value={qrToken} />
        <input type="hidden" name="pakke" value="enkelt" />
        <p>
          {ENKELT_ANTAL_SLIBNINGER} slibning — {ENKELT_PRIS_OERE / 100} kr.
          <br />
          Mangler du kun til én gang lige nu, uden at vente på en fuld
          opfyldning?
        </p>
        <button type="submit">Betal med MobilePay</button>
      </form>
    </main>
  );
}
