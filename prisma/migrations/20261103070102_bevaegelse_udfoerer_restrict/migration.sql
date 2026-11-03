-- DropForeignKey
ALTER TABLE "bevaegelser" DROP CONSTRAINT "bevaegelser_udfoertAfId_fkey";

-- AddForeignKey
ALTER TABLE "bevaegelser" ADD CONSTRAINT "bevaegelser_udfoertAfId_fkey" FOREIGN KEY ("udfoertAfId") REFERENCES "brugere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
