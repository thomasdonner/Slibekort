import { NextResponse } from "next/server";
import { readSheet } from "read-excel-file/node";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi, kanSeHold } from "@/lib/roller";
import { parseHoldsportRaekker, raekkerTilObjekter } from "@/lib/import/holdsport";

export async function POST(request: Request) {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok) {
    return NextResponse.json({ fejl: adgang.fejl }, { status: adgang.status });
  }
  // Kun kasserer og administrator importerer — se app/import/layout.tsx.
  if (!kanRetteSaldi(adgang.adgang)) {
    return NextResponse.json(
      { fejl: "Ingen adgang til at importere spillere." },
      { status: 403 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const fil = formData?.get("fil");
  const hold = formData?.get("hold");

  if (!(fil instanceof File) || typeof hold !== "string" || !hold.trim()) {
    return NextResponse.json(
      { fejl: "Vælg en xlsx-fil og angiv et hold." },
      { status: 400 },
    );
  }

  if (!kanSeHold(adgang.adgang, hold.trim())) {
    return NextResponse.json(
      { fejl: "Du har ikke adgang til det hold." },
      { status: 403 },
    );
  }

  let raekker: unknown[][];
  try {
    const buffer = Buffer.from(await fil.arrayBuffer());
    raekker = await readSheet(buffer);
  } catch {
    return NextResponse.json(
      { fejl: "Kunne ikke læse filen. Er det en gyldig xlsx-fil?" },
      { status: 400 },
    );
  }

  const objekter = raekkerTilObjekter(raekker);
  const resultat = parseHoldsportRaekker(objekter, hold.trim());

  return NextResponse.json(resultat);
}
