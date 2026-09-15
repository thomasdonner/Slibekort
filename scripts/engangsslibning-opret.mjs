// Étgangsopsætning: opretter (eller genfinder) den ene delte spiller-række
// for engangsslibninger — brugt af nogen uden for det almindelige
// holdsystem (fx en motionist), der betaler sliberen på stedet og får
// slebet med det samme — se CLAUDE.md, "Beslutninger undervejs —
// motionister og andre uden for systemet."
// Kør: npm run engangsslibning:opret
//
// Printbart QR-ark bagefter: /overblik/qr-ark?spillerId=<id nedenfor>,
// eller find den fra overblikkets forside ("Engangsslibning" i menuen).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Skal matche lib/spillere/engangsslibning.ts — kan ikke importeres
// herfra, da dette er et almindeligt Node-script uden TypeScript, ligesom
// prisma/seed.mjs og scripts/mobilepay-webhook.mjs.
const ENGANGSSLIBNING_NAVN = "Engangsslibning";
const ENGANGSSLIBNING_HOLD = "Engangsslibning";

async function main() {
  const spiller = await prisma.spiller.upsert({
    where: {
      navn_hold: { navn: ENGANGSSLIBNING_NAVN, hold: ENGANGSSLIBNING_HOLD },
    },
    update: {},
    create: { navn: ENGANGSSLIBNING_NAVN, hold: ENGANGSSLIBNING_HOLD },
  });

  console.log(`Spiller-id: ${spiller.id}`);
  console.log(`QR-kode: ${spiller.qrToken}`);
  console.log(
    `Print koden på: (APP_URL)/overblik/qr-ark?spillerId=${spiller.id}`,
  );
  console.log(
    "Klip den ud og hæng den fast i sliberummet — samme kode bruges igen og igen.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
