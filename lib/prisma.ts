import { PrismaClient } from "@prisma/client";

// Next.js genindlæser moduler ved hver ændring i udvikling. Uden denne
// cache på det globale objekt ville hver genindlæsning åbne en ny
// forbindelse til databasen, indtil den løber tør.
const global_ = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = global_.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global_.prisma = prisma;
}
