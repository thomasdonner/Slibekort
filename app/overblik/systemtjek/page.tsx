import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { kraevOverblikAdgang } from "@/lib/kraev-overblik-adgang";
import { kanAdministrereBrugere } from "@/lib/roller";
import { IkonAdvarsel, IkonCheck } from "@/app/ikoner";

// Kun tilstedeværelsen af hver miljøvariabel tjekkes her, aldrig værdien
// for de hemmelige (nøgler, tokens) — siden må ikke kunne bruges til at
// læse en hemmelighed af, kun til at se om den mangler. De få værdier der
// vises (adresser, URL'er) er ikke hemmelige i sig selv.
function sat(navn: string): boolean {
  return Boolean(process.env[navn]?.trim());
}

type Raekke = { navn: string; sat: boolean; vaerdi?: string };

function Status({ sat }: { sat: boolean }) {
  return (
    <span className={`status-tjek ${sat ? "tal-sund" : "tal-kritisk"}`}>
      {sat ? <IkonCheck /> : <IkonAdvarsel />}
      {sat ? "Sat op" : "Mangler"}
    </span>
  );
}

function Gruppe({ titel, raekker }: { titel: string; raekker: Raekke[] }) {
  return (
    <section>
      <h2>{titel}</h2>
      <table>
        <tbody>
          {raekker.map((r) => (
            <tr key={r.navn}>
              <td>
                <code>{r.navn}</code>
              </td>
              <td>
                <Status sat={r.sat} />
              </td>
              <td>{r.vaerdi ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function SystemtjekSide() {
  const adgang = await kraevOverblikAdgang();
  if (!adgang.ok || !kanAdministrereBrugere(adgang.adgang)) {
    redirect("/overblik");
  }

  let dbForbundet = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbForbundet = false;
  }

  const grupper: { titel: string; klar: boolean; raekker: Raekke[] }[] = [
    {
      titel: "Database",
      klar: sat("DATABASE_URL") && dbForbundet,
      raekker: [
        { navn: "DATABASE_URL", sat: sat("DATABASE_URL") },
        { navn: "Forbindelse", sat: dbForbundet, vaerdi: dbForbundet ? "Forbundet" : "Fejler — se serverloggen" },
      ],
    },
    {
      titel: "Login (Auth.js)",
      klar: sat("AUTH_SECRET"),
      raekker: [{ navn: "AUTH_SECRET", sat: sat("AUTH_SECRET") }],
    },
    {
      titel: "Mail (Resend)",
      klar: sat("RESEND_API_KEY") && sat("RESEND_FROM"),
      raekker: [
        { navn: "RESEND_API_KEY", sat: sat("RESEND_API_KEY") },
        { navn: "RESEND_FROM", sat: sat("RESEND_FROM"), vaerdi: process.env.RESEND_FROM },
      ],
    },
    {
      titel: "Betaling (MobilePay)",
      klar:
        sat("MOBILEPAY_CLIENT_ID") &&
        sat("MOBILEPAY_CLIENT_SECRET") &&
        sat("MOBILEPAY_SUBSCRIPTION_KEY") &&
        sat("MOBILEPAY_MERCHANT_SERIAL_NUMBER"),
      raekker: [
        {
          navn: "MOBILEPAY_API_BASE_URL",
          sat: sat("MOBILEPAY_API_BASE_URL"),
          vaerdi: process.env.MOBILEPAY_API_BASE_URL?.includes("apitest")
            ? `${process.env.MOBILEPAY_API_BASE_URL} (testmiljø)`
            : process.env.MOBILEPAY_API_BASE_URL,
        },
        { navn: "MOBILEPAY_CLIENT_ID", sat: sat("MOBILEPAY_CLIENT_ID") },
        { navn: "MOBILEPAY_CLIENT_SECRET", sat: sat("MOBILEPAY_CLIENT_SECRET") },
        { navn: "MOBILEPAY_SUBSCRIPTION_KEY", sat: sat("MOBILEPAY_SUBSCRIPTION_KEY") },
        { navn: "MOBILEPAY_MERCHANT_SERIAL_NUMBER", sat: sat("MOBILEPAY_MERCHANT_SERIAL_NUMBER") },
        {
          navn: "MOBILEPAY_WEBHOOK_SECRET",
          sat: sat("MOBILEPAY_WEBHOOK_SECRET"),
          vaerdi: sat("MOBILEPAY_WEBHOOK_SECRET")
            ? undefined
            : "Sættes ved: npm run mobilepay:webhook -- <url>",
        },
      ],
    },
    {
      titel: "Andet",
      klar: sat("APP_URL") && sat("KASSERER_KONTAKT_EMAIL"),
      raekker: [
        { navn: "APP_URL", sat: sat("APP_URL"), vaerdi: process.env.APP_URL },
        {
          navn: "KASSERER_KONTAKT_EMAIL",
          sat: sat("KASSERER_KONTAKT_EMAIL"),
          vaerdi: process.env.KASSERER_KONTAKT_EMAIL,
        },
        { navn: "NODE_ENV", sat: true, vaerdi: process.env.NODE_ENV },
      ],
    },
  ];

  const antalKlar = grupper.filter((g) => g.klar).length;

  return (
    <main>
      <h1>Systemtjek</h1>
      <p>
        Viser kun om hver indstilling er sat op, aldrig selve hemmelighederne
        — så du selv kan se, hvad der mangler, uden at nogen nøgle vises på
        skærmen.
      </p>

      <div className="stat-raekke">
        <div className={`stat-kort ${antalKlar < grupper.length ? "stat-kort-advarsel" : ""}`}>
          <span className="stat-tal">
            {antalKlar} / {grupper.length}
          </span>
          <span className="stat-label">Dele klar</span>
        </div>
      </div>

      {grupper.map((g) => (
        <Gruppe key={g.titel} titel={g.titel} raekker={g.raekker} />
      ))}
    </main>
  );
}
