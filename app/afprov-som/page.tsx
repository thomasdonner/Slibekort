import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { erUdviklingsmiljoe } from "@/lib/udviklingsmiljoe";
import { ENGANGSSLIBNING_HOLD } from "@/lib/spillere/engangsslibning";
import { afprovAlleRoller, afprovHoldleder, afprovRolle } from "./actions";

export default async function AfprovSomSide() {
  // Dobbelt spærring: siden er allerede ikke linket fra noget menu, men
  // skulle den alligevel blive tilgået i en rigtig udgivelse, skal den
  // opføre sig som om den ikke findes — ligesom udviklerværktøjer i
  // andre systemer.
  if (!erUdviklingsmiljoe()) {
    notFound();
  }

  // Engangsslibning (lib/spillere/engangsslibning.ts) er ikke et rigtigt
  // hold — ingen holdleder skal kunne få tildelt adgang til det, heller
  // ikke i dette udviklingsværktøj, så det skal ikke stå i listen.
  const holdRaekker = await prisma.spiller.findMany({
    where: { aktiv: true, hold: { not: ENGANGSSLIBNING_HOLD } },
    select: { hold: true },
    distinct: ["hold"],
    orderBy: { hold: "asc" },
  });
  const holdNavne = holdRaekker.map((r) => r.hold);

  return (
    <main>
      <h1>Afprøv som …</h1>
      <p>
        Kun til stede i udviklingsmiljøet — logger dig ind som en
        prøvebruger med den valgte rolle, uden en rigtig mail. Den
        almindelige login-side med magisk link rører dette værktøj ikke ved.
      </p>

      <section>
        <h2>Enkelt rolle</h2>
        <form action={afprovRolle.bind(null, "sliber")}>
          <button type="submit">Sliber</button>
        </form>
        <form action={afprovRolle.bind(null, "kasserer")}>
          <button type="submit">Kasserer</button>
        </form>
        <form action={afprovRolle.bind(null, "administrator")}>
          <button type="submit">Administrator</button>
        </form>
      </section>

      <section>
        <h2>Holdleder</h2>
        <form action={afprovHoldlederAction}>
          {holdNavne.length > 0 ? (
            <select name="hold" defaultValue={holdNavne[0]}>
              {holdNavne.map((hold) => (
                <option key={hold} value={hold}>
                  {hold}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="hold"
              placeholder="Holdnavn (fx U9)"
              defaultValue="U9"
            />
          )}
          <button type="submit">Log ind som holdleder</button>
        </form>
        <p>
          Ingen spillere importeret endnu?{" "}
          {holdNavne.length === 0 && "Skriv et vilkårligt holdnavn ovenfor."}
        </p>
      </section>

      <section>
        <h2>Kombineret</h2>
        <form action={afprovAlleRoller}>
          <button type="submit">Alle roller på én gang</button>
        </form>
      </section>
    </main>
  );
}

async function afprovHoldlederAction(formData: FormData) {
  "use server";
  const hold = String(formData.get("hold") ?? "").trim();
  if (!hold) return;
  await afprovHoldleder(hold);
}
