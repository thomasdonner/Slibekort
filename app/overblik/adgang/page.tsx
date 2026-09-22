import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanAdministrereBrugere } from "@/lib/roller";
import { fjernAdgang, giveAdgang, logAlleEnhederUd } from "./actions";

export default async function AdgangSide() {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanAdministrereBrugere(adgang.adgang)) {
    redirect("/overblik");
  }

  const brugere = await prisma.bruger.findMany({
    include: { user: true, holdAdgang: true },
    orderBy: { navn: "asc" },
  });

  const sessionAntal = await prisma.session.groupBy({
    by: ["userId"],
    _count: { _all: true },
  });
  const sessionKort = new Map(sessionAntal.map((s) => [s.userId, s._count._all]));

  return (
    <main>
      <h1>Adgangsstyring</h1>
      <p>
        Kun administrator kan give eller fjerne adgang — se CLAUDE.md for
        hvorfor det ikke også er kasserer.
      </p>

      <section>
        <h2>Giv eller ret adgang</h2>
        <form action={giveAdgang}>
          <label>
            E-mail
            <input type="email" name="email" required />
          </label>
          <label>
            Navn
            <input type="text" name="navn" />
          </label>
          <fieldset>
            <legend>Roller</legend>
            <label>
              <input type="checkbox" name="roller" value="sliber" /> Sliber
            </label>
            <label>
              <input type="checkbox" name="roller" value="kasserer" /> Kasserer
            </label>
            <label>
              <input type="checkbox" name="roller" value="holdleder" /> Holdleder
            </label>
            <label>
              <input type="checkbox" name="roller" value="administrator" />{" "}
              Administrator
            </label>
          </fieldset>
          <label>
            Hold (kun for holdleder, kommasepareret)
            <input type="text" name="hold" placeholder="U14, U16" />
          </label>
          <fieldset>
            <legend>Delt konto</legend>
            <label>
              <input type="checkbox" name="delt" /> Delt konto (fx en iPad,
              der står fast i sliberummet, brugt af skiftende slibere)
            </label>
          </fieldset>
          <button type="submit">Gem adgang</button>
        </form>
      </section>

      <section>
        <h2>Hvem har adgang</h2>
        <table>
          <thead>
            <tr>
              <th>Navn</th>
              <th>E-mail</th>
              <th>Roller</th>
              <th>Hold</th>
              <th>Delt konto</th>
              <th>Status</th>
              <th>Enheder logget ind</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {brugere.map((b) => (
              <tr key={b.id}>
                <td>{b.navn}</td>
                <td>{b.user.email}</td>
                <td>{b.roller.join(", ")}</td>
                <td>{b.holdAdgang.map((h) => h.hold).join(", ")}</td>
                <td>{b.delt ? "Ja" : ""}</td>
                <td>{b.aktiv ? "Aktiv" : "Spærret"}</td>
                <td>{sessionKort.get(b.userId) ?? 0}</td>
                <td>
                  {b.aktiv && (
                    <form action={fjernAdgang}>
                      <input type="hidden" name="brugerId" value={b.id} />
                      <button type="submit" className="knap-fare">
                        Fjern adgang
                      </button>
                    </form>
                  )}
                  <form action={logAlleEnhederUd}>
                    <input type="hidden" name="brugerId" value={b.id} />
                    <button type="submit">Log enheder ud</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
