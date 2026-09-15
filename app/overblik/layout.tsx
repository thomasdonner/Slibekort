import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { OVERBLIK_ROLLER } from "@/lib/roller";

export default async function OverblikLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/logind");
  }

  const harAdgang =
    session.user.aktiv &&
    session.user.roller.some((rolle) => OVERBLIK_ROLLER.includes(rolle));

  if (!harAdgang) {
    return (
      <main>
        <h1>Ingen adgang</h1>
        <p>Din konto har ikke adgang til overblikket.</p>
      </main>
    );
  }

  return <>{children}</>;
}
