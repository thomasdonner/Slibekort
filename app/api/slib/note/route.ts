import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kraevSliber } from "@/lib/kraev-sliber";
import { rensSkoejteNote } from "@/lib/skoejte-note";

// Sliberen retter spillerens hulning direkte på scannerskærmen — det er
// dem, der står med skøjten og ved, hvad der blev slebet. Samme regler for
// noten som overblikkets formular (lib/skoejte-note.ts).
export async function POST(request: Request) {
  const adgang = await kraevSliber();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }

  const body = await request.json().catch(() => null);
  const spillerId = body?.spillerId;
  if (typeof spillerId !== "string" || !spillerId || typeof body?.note !== "string") {
    return NextResponse.json({ fejl: "spillerId og note mangler." }, { status: 400 });
  }

  const renset = rensSkoejteNote(body.note);
  if (!renset.ok) {
    return NextResponse.json({ fejl: renset.fejl }, { status: 400 });
  }

  const spiller = await prisma.spiller.findUnique({ where: { id: spillerId } });
  if (!spiller || !spiller.aktiv) {
    return NextResponse.json({ fejl: "Ukendt eller inaktiv spiller." }, { status: 404 });
  }

  await prisma.spiller.update({
    where: { id: spillerId },
    data: { skoejteNote: renset.vaerdi },
  });

  return NextResponse.json({ skoejteNote: renset.vaerdi });
}
