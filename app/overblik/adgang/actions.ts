"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Rolle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanAdministrereBrugere } from "@/lib/roller";
import {
  efterladerIngenAktivAdministrator,
  vurderSletningAfBruger,
} from "@/lib/overblik/bruger-sletning";

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

async function antalAndreAktiveAdministratorer(brugerId: string): Promise<number> {
  return prisma.bruger.count({
    where: { aktiv: true, roller: { has: "administrator" }, NOT: { id: brugerId } },
  });
}

export async function giveAdgang(formData: FormData) {
  await kraevAdministrator();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const navn = String(formData.get("navn") ?? "").trim() || email;
  const roller = formData
    .getAll("roller")
    .filter((r): r is Rolle => GYLDIGE_ROLLER.includes(r as Rolle));
  // Hold vælges som afkrydsninger (hvert hold, der findes), og "andre hold"
  // er en fritekst til et hold, der endnu ikke har spillere. Samme hold må
  // ikke stå to gange.
  const andreHold = String(formData.get("andreHold") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const hold = [
    ...new Set([
      ...formData.getAll("hold").map((h) => String(h).trim()).filter(Boolean),
      ...andreHold,
    ]),
  ];
  // "Delt konto" — fx en iPad der står fast i sliberummet, brugt af
  // skiftende slibere. Se CLAUDE.md og lib/delt-konto.ts.
  const delt = formData.get("delt") === "on";

  if (!email.includes("@")) {
    throw new Error("Skriv en gyldig mailadresse.");
  }
  if (roller.length === 0) {
    throw new Error("Vælg mindst én rolle.");
  }

  // En ændring af en eksisterende bruger må ikke tage den sidste aktive
  // administrator fra klubben (fx ved at fjerne rollen).
  const eksisterende = await prisma.user.findUnique({
    where: { email },
    include: { bruger: true },
  });
  if (eksisterende?.bruger) {
    const taberAdministratorrollen =
      eksisterende.bruger.roller.includes("administrator") &&
      !roller.includes("administrator");
    if (
      taberAdministratorrollen &&
      efterladerIngenAktivAdministrator({
        erAktivAdministrator: eksisterende.bruger.aktiv,
        antalAndreAktiveAdministratorer: await antalAndreAktiveAdministratorer(
          eksisterende.bruger.id,
        ),
      })
    ) {
      throw new Error("Der skal altid være mindst én aktiv administrator.");
    }
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
  // forudsigelig at bruge til at RETTE en bruger hold, ikke kun udvide dem.
  // Hold gælder for holdleder (hvilke hold, der kan ses og rettes) og for
  // sliber (hvilke hold, der kan slibes for; uden hold: alle). Har kontoen
  // ingen af de to roller, gemmes ingen hold.
  await prisma.brugerHold.deleteMany({ where: { brugerId: bruger.id } });
  if ((roller.includes("holdleder") || roller.includes("sliber")) && hold.length > 0) {
    await prisma.brugerHold.createMany({
      data: hold.map((h) => ({ brugerId: bruger.id, hold: h })),
    });
  }

  revalidatePath("/overblik/adgang");
  // Tilbage til listen, så formularen ikke bliver stående i "ret"-tilstand.
  redirect("/overblik/adgang");
}

// Kravspecifikationen, afsnit 4: "når en holdleder stopper, fjernes
// adgangen samme dag." Sletter ikke brugeren — historikken i bevaegelser
// peger stadig på udfoertAfId, og skal kunne slås op bagefter. En bruger, der
// intet har udført (fx oprettet med en forkert mailadresse), kan slettes
// helt med sletBruger.
export async function fjernAdgang(formData: FormData) {
  await kraevAdministrator();
  const brugerId = String(formData.get("brugerId"));

  const bruger = await prisma.bruger.findUnique({ where: { id: brugerId } });
  if (!bruger) throw new Error("Ukendt bruger.");
  if (
    efterladerIngenAktivAdministrator({
      erAktivAdministrator: bruger.aktiv && bruger.roller.includes("administrator"),
      antalAndreAktiveAdministratorer: await antalAndreAktiveAdministratorer(brugerId),
    })
  ) {
    throw new Error("Der skal altid være mindst én aktiv administrator.");
  }

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

// Sletter en bruger helt — fx en konto oprettet med en forkert mailadresse.
// Kun for en bruger, der intet har udført: en bevægelse peger på den, der
// udførte den, og den historik skal kunne spores (se bruger-sletning.ts og
// onDelete: Restrict på Bevaegelse.udfoertAf). Har brugeren udført noget,
// fjernes adgangen i stedet ("Fjern adgang").
//
// Sletter Auth.js' User-række, som tager brugerens sessioner, konti, rolle
// og hold med sig (onDelete: Cascade), samt eventuelle login-links, der
// stadig ligger og venter på den mailadresse.
export async function sletBruger(formData: FormData) {
  const adgang = await kraevAdministrator();
  const brugerId = String(formData.get("brugerId"));

  const bruger = await prisma.bruger.findUnique({
    where: { id: brugerId },
    include: { user: true, _count: { select: { bevaegelser: true } } },
  });
  if (!bruger) throw new Error("Ukendt bruger.");

  const vurdering = vurderSletningAfBruger({
    erDenIndloggedeSelv: bruger.id === adgang.brugerId,
    antalBevaegelser: bruger._count.bevaegelser,
    erAktivAdministrator: bruger.aktiv && bruger.roller.includes("administrator"),
    antalAndreAktiveAdministratorer: await antalAndreAktiveAdministratorer(brugerId),
  });
  if (!vurdering.ok) {
    throw new Error(vurdering.fejl);
  }

  await prisma.$transaction([
    ...(bruger.user.email
      ? [prisma.verificationToken.deleteMany({ where: { identifier: bruger.user.email } })]
      : []),
    prisma.user.delete({ where: { id: bruger.userId } }),
  ]);

  revalidatePath("/overblik/adgang");
}
