import { NextResponse } from "next/server";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanRetteSaldi, kanSeHold } from "@/lib/roller";
import { gemImport } from "@/lib/import/gem";
import type { ImportSpiller } from "@/lib/import/holdsport";

function erGyldigVoksen(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const voksen = v as Record<string, unknown>;
  return (
    (typeof voksen.email === "string" || voksen.email === null) &&
    (typeof voksen.mobil === "string" || voksen.mobil === null)
  );
}

function erGyldigSpiller(v: unknown): v is ImportSpiller {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.navn === "string" &&
    s.navn.length > 0 &&
    typeof s.hold === "string" &&
    s.hold.length > 0 &&
    Array.isArray(s.voksne) &&
    s.voksne.every(erGyldigVoksen)
  );
}

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

  const body = await request.json().catch(() => null);
  const spillere = body?.spillere;

  if (!Array.isArray(spillere) || spillere.length === 0 || !spillere.every(erGyldigSpiller)) {
    return NextResponse.json(
      { fejl: "Ingen gyldige spillere at importere." },
      { status: 400 },
    );
  }

  const alleHold = new Set(spillere.map((s) => s.hold));
  for (const hold of alleHold) {
    if (!kanSeHold(adgang.adgang, hold)) {
      return NextResponse.json(
        { fejl: `Du har ikke adgang til holdet ${hold}.` },
        { status: 403 },
      );
    }
  }

  const resultat = await gemImport(spillere);
  return NextResponse.json(resultat);
}
