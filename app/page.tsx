import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OVERBLIK_ROLLER } from "@/lib/roller";

// Startsiden, når app-ikonet trykkes på hjemmeskærmen. Sender folk direkte
// til det, de rent faktisk skal bruge, i stedet for en tom forside.
export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/logind");
  }

  if (session.user.roller.some((rolle) => OVERBLIK_ROLLER.includes(rolle))) {
    redirect("/overblik");
  }

  if (session.user.roller.includes("sliber")) {
    redirect("/slib");
  }

  return (
    <main>
      <h1>Slibekort</h1>
      <p>Aalborg Ishockey Klub</p>
      <p>Din konto har endnu ikke fået tildelt en rolle. Kontakt kassereren.</p>
    </main>
  );
}
