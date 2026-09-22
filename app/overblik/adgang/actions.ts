"use server";

import { revalidatePath } from "next/cache";
import type { Rolle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanAdministrereBrugere } from "@/lib/roller";

const GYLDIGE_ROLLER: Rolle[] = [
  "sliber",
  "kasserer",
  "holdleder",
  "administrator",
];

async function kraevAdministrator() {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanAdministrereBrugere(adgang.adgang)) {
    throw new Error("Kun administrator kan give eller ændre adgang.");
  }
  return adgang;
}

export async function giveAdgang(formData: FormData) {
  await kraevAdministrator();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const navn = String(formData.get("navn") ?? "").trim() || email;
  const roller = formData
    .getAll("roller")
    .filter((r): r is Rolle => GYLDIGE_ROLLER.includes(r as Rolle));
  const holdTekst = String(formData.get("hold") ?? "").trim();
  const hold = holdTekst
    ? holdTekst.split(",").map((h) => h.trim()).filter(Boolean)
    : [];
  // "Delt konto" — fx en iPad der står fast i sliberummet, brugt af
  // skiftende slibere. Se CLAUDE.md og lib/delt-konto.ts.
  const delt = formData.get("delt") === "on";

  if (!email.includes("@")) {
    throw new Error("Skriv en gyldig mailadresse.");
  }
  if (roller.length === 0) {
    throw new Error("Vælg mindst én rolle.");
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  const bruger = await prisma.bruger.upsert({
    where: { userId: user.id },
    create: { userId: user.id, navn, roller, aktiv: true, delt },
    update: { navn, roller, aktiv: true, delt },
  });

  // Erstatter hold-adgangen helt frem for at lægge til — det gør formen
  // forudsigelig at bruge til at RETTE en holdleders hold, ikke kun
  // udvide den.
  await prisma.brugerHold.deleteMany({ where: { brugerId: bruger.id } });
  if (roller.includes("holdleder") && hold.length > 0) {
    await prisma.brugerHold.createMany({
      data: hold.map((h) => ({ brugerId: bruger.id, hold: h })),
    });
  }

  revalidatePath("/overblik/adgang");
}

// Kravspecifikationen, afsnit 4: "når en holdleder stopper, fjernes
// adgangen samme dag." Sletter ikke brugeren — historikken i bevaegelser
// peger stadig på udfoertAfId, og skal kunne slås op bagefter.
export async function fjernAdgang(formData: FormData) {
  await kraevAdministrator();
  const brugerId = String(formData.get("brugerId"));

  await prisma.bruger.update({
    where: { id: brugerId },
    data: { aktiv: false },
  });

  revalidatePath("/overblik/adgang");
}

// Kravspecifikationen, afsnit 10: "Adgangen kan tilbagekaldes fra
// overblikket, hvis telefonen bortkommer." Sletter alle sessioner for
// brugeren — næste forsøg på at bruge appen kræver et nyt login-link.
export async function logAlleEnhederUd(formData: FormData) {
  await kraevAdministrator();
  const brugerId = String(formData.get("brugerId"));

  const bruger = await prisma.bruger.findUnique({ where: { id: brugerId } });
  if (!bruger) throw new Error("Ukendt bruger.");

  await prisma.session.deleteMany({ where: { userId: bruger.userId } });

  revalidatePath("/overblik/adgang");
}
