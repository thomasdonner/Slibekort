-- CreateEnum
CREATE TYPE "BevaegelseType" AS ENUM ('slibning', 'koeb', 'rettelse', 'fortrudt');

-- CreateEnum
CREATE TYPE "BetalingStatus" AS ENUM ('oprettet', 'godkendt', 'gennemfoert', 'afvist', 'udloebet', 'annulleret');

-- CreateEnum
CREATE TYPE "MailType" AS ENUM ('advarsel', 'rykker', 'kvittering');

-- CreateEnum
CREATE TYPE "Rolle" AS ENUM ('sliber', 'kasserer', 'holdleder', 'administrator');

-- CreateTable
CREATE TABLE "spillere" (
    "id" TEXT NOT NULL,
    "navn" TEXT NOT NULL,
    "hold" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "oprettet" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spillere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voksne" (
    "id" TEXT NOT NULL,
    "navn" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "emailBekraeftet" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "voksne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationer" (
    "spillerId" TEXT NOT NULL,
    "voksenId" TEXT NOT NULL,
    "modtagerMails" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "relationer_pkey" PRIMARY KEY ("spillerId","voksenId")
);

-- CreateTable
CREATE TABLE "bevaegelser" (
    "id" TEXT NOT NULL,
    "spillerId" TEXT NOT NULL,
    "type" "BevaegelseType" NOT NULL,
    "antal" INTEGER NOT NULL,
    "tidspunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "udfoertAfId" TEXT,
    "note" TEXT,
    "klientId" TEXT NOT NULL,
    "oprindeligId" TEXT,

    CONSTRAINT "bevaegelser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "betalinger" (
    "id" TEXT NOT NULL,
    "spillerId" TEXT NOT NULL,
    "beloeb" INTEGER NOT NULL,
    "antalSlibninger" INTEGER NOT NULL,
    "udbyderReference" TEXT NOT NULL,
    "status" "BetalingStatus" NOT NULL DEFAULT 'oprettet',
    "tidspunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opdateret" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "betalinger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mails" (
    "id" TEXT NOT NULL,
    "spillerId" TEXT NOT NULL,
    "type" "MailType" NOT NULL,
    "sendtTil" TEXT NOT NULL,
    "tidspunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leveringsstatus" TEXT,

    CONSTRAINT "mails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brugere" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "navn" TEXT NOT NULL,
    "roller" "Rolle"[],
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "oprettet" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brugere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bruger_hold" (
    "id" TEXT NOT NULL,
    "brugerId" TEXT NOT NULL,
    "hold" TEXT NOT NULL,
    "tildelt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bruger_hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "spillere_qrToken_key" ON "spillere"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "spillere_navn_hold_key" ON "spillere"("navn", "hold");

-- CreateIndex
CREATE UNIQUE INDEX "voksne_email_key" ON "voksne"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bevaegelser_klientId_key" ON "bevaegelser"("klientId");

-- CreateIndex
CREATE UNIQUE INDEX "bevaegelser_oprindeligId_key" ON "bevaegelser"("oprindeligId");

-- CreateIndex
CREATE UNIQUE INDEX "betalinger_udbyderReference_key" ON "betalinger"("udbyderReference");

-- CreateIndex
CREATE UNIQUE INDEX "brugere_userId_key" ON "brugere"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bruger_hold_brugerId_hold_key" ON "bruger_hold"("brugerId", "hold");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "relationer" ADD CONSTRAINT "relationer_spillerId_fkey" FOREIGN KEY ("spillerId") REFERENCES "spillere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationer" ADD CONSTRAINT "relationer_voksenId_fkey" FOREIGN KEY ("voksenId") REFERENCES "voksne"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bevaegelser" ADD CONSTRAINT "bevaegelser_spillerId_fkey" FOREIGN KEY ("spillerId") REFERENCES "spillere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bevaegelser" ADD CONSTRAINT "bevaegelser_udfoertAfId_fkey" FOREIGN KEY ("udfoertAfId") REFERENCES "brugere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bevaegelser" ADD CONSTRAINT "bevaegelser_oprindeligId_fkey" FOREIGN KEY ("oprindeligId") REFERENCES "bevaegelser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "betalinger" ADD CONSTRAINT "betalinger_spillerId_fkey" FOREIGN KEY ("spillerId") REFERENCES "spillere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mails" ADD CONSTRAINT "mails_spillerId_fkey" FOREIGN KEY ("spillerId") REFERENCES "spillere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brugere" ADD CONSTRAINT "brugere_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bruger_hold" ADD CONSTRAINT "bruger_hold_brugerId_fkey" FOREIGN KEY ("brugerId") REFERENCES "brugere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
