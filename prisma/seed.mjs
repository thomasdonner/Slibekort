// Bootstrap af den allerførste administrator. Overblikket har nu selv en
// side til at give og ændre adgang (/overblik/adgang), men den kræver at
// være logget ind som administrator — dette script er vejen ud af det
// hønen-og-ægget-problem, og en nødudgang hvis databasen skulle stå uden
// nogen administrator. Kør: npm run brugere:opret <mail> <rolle...>
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , email, ...roller] = process.argv;

  if (!email || roller.length === 0) {
    console.error("Brug: npm run brugere:opret <mail> <rolle...>");
    console.error("Roller: sliber, kasserer, holdleder, administrator");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  const bruger = await prisma.bruger.upsert({
    where: { userId: user.id },
    create: { userId: user.id, navn: email, roller },
    update: { roller },
  });

  console.log(`${email} har nu rollerne: ${bruger.roller.join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
