-- AlterTable
ALTER TABLE "bevaegelser" ADD COLUMN     "udfoertAfNavn" TEXT;

-- AlterTable
ALTER TABLE "brugere" ADD COLUMN     "delt" BOOLEAN NOT NULL DEFAULT false;
