import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";

// Sessionstjek her, ikke i middleware.ts: databasesessioner kræver Prisma,
// og Prisma kører ikke i middlewarens Edge-runtime. Et layout kører i
// Node.js, så det er her adgangen skal tjekkes.
export default async function SlibLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/logind");
  }

  if (!session.user.aktiv || !session.user.roller.includes("sliber")) {
    return (
      <main>
        <h1>Ingen adgang</h1>
        <p>
          Din konto har ikke adgang til at slibe. Kontakt kassereren, hvis
          det er en fejl.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
