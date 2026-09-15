import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { KAN_RETTE_SALDI_ROLLER } from "@/lib/roller";

export default async function ImportLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/logind");
  }

  // Kun kasserer og administrator kan importere — holdlederen ser og
  // retter kontaktoplysninger for eget hold, men importerer ikke selv nye
  // spillere ind i systemet (se CLAUDE.md).
  const harAdgang =
    session.user.aktiv &&
    session.user.roller.some((rolle) => KAN_RETTE_SALDI_ROLLER.includes(rolle));

  if (!harAdgang) {
    return (
      <main>
        <h1>Ingen adgang</h1>
        <p>Din konto har ikke adgang til at importere spillere.</p>
      </main>
    );
  }

  return <>{children}</>;
}
