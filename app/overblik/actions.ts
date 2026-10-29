"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi, kanRetteSaldoForHold, kanSeHold } from "@/lib/roller";
import { rensSkoejteNote } from "@/lib/skoejte-note";
import { relationerDerSkalFlyttes } from "@/lib/overblik/voksen-fletning";
import { erNyligPaamindet } from "@/lib/mails/regler";
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
  if (!adgang.ok) {
    throw new Error("Ingen adgang til at rette saldi.");
  }

  const spillerId = String(formData.get("spillerId"));
  const antal = Number(formData.get("antal"));
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isInteger(antal) || antal === 0) {
    throw new Error("Antal skal være et heltal forskelligt fra 0.");
  }

  // Kasserer og administrator kan rette alle; en holdleder kun spillere
  // på sine egne hold. Spillerens hold slås op først, fordi adgangen
  // afhænger af det — kan brugeren ikke rette netop denne spiller, svarer
  // vi det samme uanset om spilleren findes eller ej.
  const spiller = await hentSpillerEllerFejl(spillerId);
  if (!kanRetteSaldoForHold(adgang.adgang, spiller.hold)) {
    throw new Error("Ingen adgang til at rette saldi for denne spiller.");
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

// Spillerens hulning på skøjten — fritekst, vist for sliberen ved
// scanning. Alle, der kan se spilleren i overblikket, kan rette den
// (kasserer/administrator: alle hold, holdleder: egne hold), da det er
// praktisk viden om udstyr og ikke noget regnskabsmæssigt som saldoen.
export async function gemSkoejteNote(formData: FormData) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    throw new Error("Ingen adgang til at rette noten.");
  }

  const spillerId = String(formData.get("spillerId"));
  const spiller = await hentSpillerEllerFejl(spillerId);
  if (!kanSeHold(adgang.adgang, spiller.hold)) {
    throw new Error("Ingen adgang til det hold.");
  }

  const renset = rensSkoejteNote(String(formData.get("skoejteNote") ?? ""));
  if (!renset.ok) {
    throw new Error(renset.fejl);
  }

  await prisma.spiller.update({
    where: { id: spillerId },
    data: { skoejteNote: renset.vaerdi },
  });

  revalidatePath(`/overblik/spillere/${spillerId}`);
}

// Fjerner én bevægelse fra "Bevægelser der kræver et kig" på /overblik,
// uden at røre selve bevægelsen eller dens note — historikken på
// spillerens side viser den uændret, det er kun den samlede liste over
// ting der mangler et kig, der bliver kortere. Samme rolle som kan rette
// saldi (kasserer/administrator), da det typisk er accounting-flag
// (spærretid, mulig dobbeltbetaling), ikke noget en holdleder handler på.
export async function markerBevaegelseSet(formData: FormData) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanRetteSaldi(adgang.adgang)) {
    throw new Error("Ingen adgang til at afkrydse bevægelser.");
  }

  const bevaegelseId = String(formData.get("bevaegelseId"));
  const bevaegelse = await prisma.bevaegelse.findUnique({
    where: { id: bevaegelseId },
    include: { spiller: true },
  });
  if (!bevaegelse) throw new Error("Ukendt bevægelse.");
  if (!kanSeHold(adgang.adgang, bevaegelse.spiller.hold)) {
    throw new Error("Ingen adgang til det hold.");
  }

  await prisma.bevaegelse.update({
    where: { id: bevaegelseId },
    data: { haandteret: true },
  });

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
  if (!adgang.ok) {
    throw new Error("Ingen adgang til at sende påmindelser.");
  }

  const spillerId = String(formData.get("spillerId"));
  const spiller = await hentSpillerEllerFejl(spillerId);
  // Alle, der kan se spilleren (kasserer/administrator: alle hold,
  // holdleder: egne hold), må sende — typisk fordi de lige har rettet
  // forælderens mailadresse og vil have påmindelsen afsted med det samme.
  if (!kanSeHold(adgang.adgang, spiller.hold)) {
    throw new Error("Ingen adgang til det hold.");
  }

  // Kun en kort spærre mod dobbeltklik — selve 48-timersgrænsen ignoreres
  // med vilje her (se `tving` i tjekOgSendPaamindelser).
  const sidsteMail = await prisma.mail.findFirst({
    where: { spillerId, type: { in: ["advarsel", "rykker"] } },
    orderBy: { tidspunkt: "desc" },
  });
  if (erNyligPaamindet(sidsteMail?.tidspunkt ?? null, new Date())) {
    throw new Error(
      "Der blev netop sendt en påmindelse — vent et par minutter, før du sender igen.",
    );
  }

  await tjekOgSendPaamindelser(spillerId, { tving: true });

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

  // Findes mailadressen allerede hos en anden voksen, er det samme person
  // (jf. lib/overblik/voksen-fletning.ts): de to flettes, så adressen kan
  // stå på flere spillere uden at nogen får dobbelte påmindelser.
  const anden = email ? await prisma.voksen.findUnique({ where: { email } }) : null;

  if (anden && anden.id !== voksenId) {
    const gamleRelationer = await prisma.relation.findMany({ where: { voksenId } });
    const eksisterendeSpillere = await prisma.relation.findMany({
      where: { voksenId: anden.id },
      select: { spillerId: true },
    });
    const skalFlyttes = relationerDerSkalFlyttes(
      gamleRelationer,
      eksisterendeSpillere.map((r) => r.spillerId),
    );

    await prisma.$transaction([
      ...skalFlyttes.map((r) =>
        prisma.relation.create({
          data: {
            spillerId: r.spillerId,
            voksenId: anden.id,
            modtagerMails: r.modtagerMails,
          },
        }),
      ),
      prisma.relation.deleteMany({ where: { voksenId } }),
      // Den eksisterende voksen beholder sine oplysninger — formularen var
      // udfyldt med den GAMLE voksens navn og telefon, så at overskrive
      // med dem ville ændre en kontakt, ingen har rørt. Kun tomme felter
      // udfyldes.
      prisma.voksen.update({
        where: { id: anden.id },
        data: { navn: anden.navn || navn || null, telefon: anden.telefon || telefon || null },
      }),
      prisma.voksen.delete({ where: { id: voksenId } }),
    ]);
  } else {
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
        // Kun hvis en anden netop har lagt samme adresse ind, mellem vores
        // opslag og vores gem — ellers fanger fletningen ovenfor det.
        throw new Error("Mailadressen blev netop oprettet hos en anden — prøv igen.");
      }
      throw error;
    }
  }

  revalidatePath(`/overblik/spillere/${spillerId}`);
}
