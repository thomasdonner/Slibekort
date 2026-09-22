"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Rolle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { erUdviklingsmiljoe } from "@/lib/udviklingsmiljoe";

// Ét år, samme levetid som de rigtige sessioner sat via magisk link — se
// lib/auth.ts. Skal bare ligne en almindelig session, ikke afvige fra den.
const SESSION_MAX_AGE_SEKUNDER = 365 * 24 * 60 * 60;

const ROLLE_TIL_NAVN: Record<Rolle, string> = {
  sliber: "Afprøv: Sliber",
  kasserer: "Afprøv: Kasserer",
  holdleder: "Afprøv: Holdleder",
  administrator: "Afprøv: Administrator",
};

// Adskilt fra klubbens rigtige mailadresser, så en fejlagtig mail
// (skulle nogen alligevel forsøge at sende en) aldrig kan ramme et
// rigtigt menneske. Ét fast lokalt domæne, ikke et der findes i DNS.
function afprovEmail(noegle: string): string {
  return `afprov-${noegle}@lokal.afprovning`;
}

async function opretSessionOgLogInd(userId: string, gaaTil: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SEKUNDER * 1000);

  await prisma.session.create({
    data: { sessionToken, userId, expires },
  });

  (await cookies()).set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    expires,
  });

  redirect(gaaTil);
}

async function opretEllerGenbrugBruger(
  noegle: string,
  navn: string,
  roller: Rolle[],
  delt = false,
) {
  const email = afprovEmail(noegle);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: navn, emailVerified: new Date() },
  });
  await prisma.bruger.upsert({
    where: { userId: user.id },
    update: { roller, navn, aktiv: true, delt },
    create: { userId: user.id, navn, roller, aktiv: true, delt },
  });
  return user.id;
}

export async function afprovRolle(rolle: Rolle) {
  if (!erUdviklingsmiljoe()) {
    throw new Error("Kun tilgængelig i udviklingsmiljø");
  }

  const userId = await opretEllerGenbrugBruger(rolle, ROLLE_TIL_NAVN[rolle], [
    rolle,
  ]);
  const gaaTil = rolle === "sliber" ? "/slib" : "/overblik";
  await opretSessionOgLogInd(userId, gaaTil);
}

// Til at afprøve den delte konto (fx en iPad i sliberummet, se
// CLAUDE.md) — samme opsætning som en almindelig sliber, blot med
// Bruger.delt sat, så /slib beder om et navn ved hver slibning.
export async function afprovDeltSliber() {
  if (!erUdviklingsmiljoe()) {
    throw new Error("Kun tilgængelig i udviklingsmiljø");
  }

  const userId = await opretEllerGenbrugBruger(
    "sliber-delt",
    "Afprøv: Delt konto (iPad)",
    ["sliber"],
    true,
  );
  await opretSessionOgLogInd(userId, "/slib");
}

export async function afprovHoldleder(holdNavn: string) {
  if (!erUdviklingsmiljoe()) {
    throw new Error("Kun tilgængelig i udviklingsmiljø");
  }

  const userId = await opretEllerGenbrugBruger(
    "holdleder",
    ROLLE_TIL_NAVN.holdleder,
    ["holdleder"],
  );
  const bruger = await prisma.bruger.findUniqueOrThrow({ where: { userId } });
  await prisma.brugerHold.upsert({
    where: { brugerId_hold: { brugerId: bruger.id, hold: holdNavn } },
    update: {},
    create: { brugerId: bruger.id, hold: holdNavn },
  });
  await opretSessionOgLogInd(userId, "/overblik");
}

export async function afprovAlleRoller() {
  if (!erUdviklingsmiljoe()) {
    throw new Error("Kun tilgængelig i udviklingsmiljø");
  }

  const alleRoller: Rolle[] = [
    "sliber",
    "kasserer",
    "holdleder",
    "administrator",
  ];
  const userId = await opretEllerGenbrugBruger(
    "alle-roller",
    "Afprøv: Alle roller",
    alleRoller,
  );
  await opretSessionOgLogInd(userId, "/overblik");
}
