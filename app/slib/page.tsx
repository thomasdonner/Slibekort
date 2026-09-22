import { auth } from "@/lib/auth";
import SlibKlient from "./slib-klient";

// Server-komponent kun for at hente `delt` fra sessionen — resten af
// siden er interaktiv (kamera, offline-kø) og skal derfor være en
// klient-komponent, se slib-klient.tsx. Layoutet (layout.tsx) har allerede
// tjekket login og sliber-rollen, dette henter kun den ekstra oplysning.
export default async function SlibSide() {
  const session = await auth();
  return <SlibKlient delt={session?.user.delt ?? false} />;
}
