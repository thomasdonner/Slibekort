import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { RegistrerServiceWorker } from "./registrer-service-worker";
import { BrugerMenu } from "./bruger-menu";
import { auth } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Slibekort",
  description: "Digitalt slibekort — Aalborg Ishockey Klub",
  // iOS bruger ikke manifest.ts til "Føj til hjemmeskærm" — det kræver
  // disse felter for sig for at åbne fuldskærm med klubbens ikon.
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: {
    capable: true,
    title: "Slibekort",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html lang="da" className={inter.variable}>
      <body>
        <RegistrerServiceWorker />
        <header className="klub-header">
          <Link href="/" className="klub-header-logo">
            {/* eslint-disable-next-line @next/next/no-img-element -- lille, statisk SVG, next/image tilføjer intet her */}
            <img src="/aaik-logo.svg" alt="" />
            <span>Slibekort</span>
          </Link>
          {session?.user && (
            <BrugerMenu
              navn={session.user.name ?? null}
              email={session.user.email ?? ""}
            />
          )}
        </header>
        <div className="klub-stribe" />
        {children}
      </body>
    </html>
  );
}
