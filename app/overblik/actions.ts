"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi, kanSeHold } from "@/lib/roller";
import { beregnSaldo } from "@/lib/saldo";
import { tjekOgSendPaamindelser } from "@/lib/mails/send";

// En rettelse kan lande en spiller præcis på 1 — det er en rigtig
// ledger-hændelse, ikke en fortrydelse af en fejl, så den skal stadig
// kunne udløse en påmindelse.
function planlaegPaamindelsestjek(spillerId: string) {
  after(() =>
    tjekOgSendPaamindelser(spillerId).catch((error) =>
      console.error("Kunne ikke tjekke/sende påmindelse", error),
    ),
  );
}

async function hentSpillerEllerFejl(spillerId: string) {
  const spiller = await prisma.spiller.findUnique({ where: { id: spillerId } });
  if (!spiller) throw new Error("Ukendt spiller.");
  return spiller;
}

export async function rettSaldo(formData: FormData) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanRetteSaldi(adgang.adgang)) {
    throw new Error("Ingen adgang til at rette saldi.");
  }

  const spillerId = String(formData.get("spillerId"));
  const antal = Number(formData.get("antal"));
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isInteger(antal) || antal === 0) {
    throw new Error("Antal skal være et heltal forskelligt fra 0.");
  }

  const spiller = await hentSpillerEllerFejl(spillerId);
  if (!kanSeHold(adgang.adgang, spiller.hold)) {
    throw new Error("Ingen adgang til det hold.");
  }

  await prisma.bevaegelse.create({
    data: {
      spillerId,
      type: "rettelse",
      antal,
      udfoertAfId: adgang.brugerId,
      klientId: crypto.randomUUID(),
      note: note || "Manuel rettelse",
    },
  });

  planlaegPaamindelsestjek(spillerId);
  revalidatePath(`/overblik/spillere/${spillerId}`);
  revalidatePath("/overblik");
}

export async function udstedNyQr(formData: FormData) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanRetteSaldi(adgang.adgang)) {
    throw new Error("Ingen adgang til at udstede en ny QR-kode.");
  }

  const spillerId = String(formData.get("spillerId"));
  const spiller = await hentSpillerEllerFejl(spillerId);
  if (!kanSeHold(adgang.adgang, spiller.hold)) {
    throw new Error("Ingen adgang til det hold.");
  }

  await prisma.spiller.update({
    where: { id: spillerId },
    data: { qrToken: crypto.randomUUID() },
  });

  revalidatePath(`/overblik/spillere/${spillerId}`);
}

// Kravspecifikationen, afsnit 5.5: stopper en spiller med saldo tilbage,
// og har hun en søskende i klubben, kan saldoen flyttes i stedet for at
// bortfalde. To bevægelser, et træk og en tilførsel, så antal slibninger
// i omløb er uændret — se kravspecifikationen for hvorfor.
export async function markerStoppet(formData: FormData) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanRetteSaldi(adgang.adgang)) {
    throw new Error("Ingen adgang til at markere en spiller som stoppet.");
  }

  const spillerId = String(formData.get("spillerId"));
  const overfoerTilSpillerId = formData.get("overfoerTilSpillerId");

  const spiller = await hentSpillerEllerFejl(spillerId);
  if (!kanSeHold(adgang.adgang, spiller.hold)) {
    throw new Error("Ingen adgang til det hold.");
  }

  const bevaegelser = await prisma.bevaegelse.findMany({ where: { spillerId } });
  const saldo = beregnSaldo(bevaegelser);

  if (saldo !== 0 && typeof overfoerTilSpillerId === "string" && overfoerTilSpillerId) {
    const soskende = await hentSpillerEllerFejl(overfoerTilSpillerId);

    await prisma.$transaction([
      prisma.bevaegelse.create({
        data: {
          spillerId,
          type: "rettelse",
          antal: -saldo,
          udfoertAfId: adgang.brugerId,
          klientId: crypto.randomUUID(),
          note: `Saldo overført til søskende: ${soskende.navn}`,
        },
      }),
      prisma.bevaegelse.create({
        data: {
          spillerId: overfoerTilSpillerId,
          type: "rettelse",
          antal: saldo,
          udfoertAfId: adgang.brugerId,
          klientId: crypto.randomUUID(),
          note: `Saldo overført fra søskende: ${spiller.navn}`,
        },
      }),
      prisma.spiller.update({ where: { id: spillerId }, data: { aktiv: false } }),
    ]);
    planlaegPaamindelsestjek(overfoerTilSpillerId);
  } else {
    await prisma.spiller.update({ where: { id: spillerId }, data: { aktiv: false } });
  }

  revalidatePath(`/overblik/spillere/${spillerId}`);
  revalidatePath("/overblik");
}

// Kravspecifikationen, afsnit 4: "sende påmindelser" er noget kasserer kan.
// Respekterer de samme 48 timer som den automatiske udsendelse, med vilje
// — for at kunne tvinge en mail igennem inden for det vindue skal man
// slette rækken i `mails` selv, ikke klikke sig forbi reglen i UI'et.
export async function sendPaamindelseNu(formData: FormData) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanRetteSaldi(adgang.adgang)) {
    throw new Error("Ingen adgang til at sende påmindelser.");
  }

  const spillerId = String(formData.get("spillerId"));
  const spiller = await hentSpillerEllerFejl(spillerId);
  if (!kanSeHold(adgang.adgang, spiller.hold)) {
    throw new Error("Ingen adgang til det hold.");
  }

  await tjekOgSendPaamindelser(spillerId);

  revalidatePath(`/overblik/spillere/${spillerId}`);
}

export async function opdaterVoksenKontakt(formData: FormData) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    throw new Error("Ingen adgang.");
  }

  const voksenId = String(formData.get("voksenId"));
  const spillerId = String(formData.get("spillerId"));
  const navn = String(formData.get("navn") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telefon = String(formData.get("telefon") ?? "").trim();

  const spiller = await hentSpillerEllerFejl(spillerId);
  if (!kanSeHold(adgang.adgang, spiller.hold)) {
    throw new Error("Ingen adgang til det hold.");
  }

  // Bekræfter at voksenId rent faktisk hører til denne spiller — ellers
  // kunne enhver med adgang til ét hold rette en helt anden families
  // kontaktoplysninger, bare ved at kende deres voksen-id.
  const relation = await prisma.relation.findUnique({
    where: { spillerId_voksenId: { spillerId, voksenId } },
  });
  if (!relation) {
    throw new Error("Den voksne er ikke tilknyttet denne spiller.");
  }

  try {
    await prisma.voksen.update({
      where: { id: voksenId },
      data: {
        navn: navn || null,
        email: email || null,
        telefon: telefon || null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("En anden voksen har allerede denne mailadresse.");
    }
    throw error;
  }

  revalidatePath(`/overblik/spillere/${spillerId}`);
}
