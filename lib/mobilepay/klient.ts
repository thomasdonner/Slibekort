// Tynd klient til Vipps MobilePays ePayment API. Ingen SDK — det officielle
// er et OpenAPI-spec, ikke et vedligeholdt npm-bibliotek, og det hele er tre
// simple fetch-kald. Se CLAUDE.md for kilderne til de nøjagtige kontrakter.
//
// Test mod https://apitest.vipps.no (MOBILEPAY_API_BASE_URL), skift til
// https://api.vipps.no når klubbens rigtige nøgler er godkendt.
import { kraevMiljoevariabel } from "@/lib/env";

function basisUrl(): string {
  return kraevMiljoevariabel("MOBILEPAY_API_BASE_URL").replace(/\/+$/, "");
}

function faelleshHeaders(): Record<string, string> {
  return {
    "Ocp-Apim-Subscription-Key": kraevMiljoevariabel("MOBILEPAY_SUBSCRIPTION_KEY"),
    "Merchant-Serial-Number": kraevMiljoevariabel("MOBILEPAY_MERCHANT_SERIAL_NUMBER"),
  };
}

// Adgangstokens holder 1-24 timer. Et modulvariabel-cache er nok — der er
// kun ét sæt nøgler, og processen genstartes jævnligt (Vercel).
let cachetToken: { vaerdi: string; udloeberVedMs: number } | null = null;

async function hentAdgangsToken(): Promise<string> {
  if (cachetToken && cachetToken.udloeberVedMs > Date.now()) {
    return cachetToken.vaerdi;
  }

  const res = await fetch(`${basisUrl()}/accesstoken/get`, {
    method: "POST",
    headers: {
      ...faelleshHeaders(),
      client_id: kraevMiljoevariabel("MOBILEPAY_CLIENT_ID"),
      client_secret: kraevMiljoevariabel("MOBILEPAY_CLIENT_SECRET"),
    },
  });

  if (!res.ok) {
    throw new Error(`Kunne ikke hente adgangstoken: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Et minuts margin, så vi ikke bruger et token der lige er udløbet.
  cachetToken = {
    vaerdi: data.access_token,
    udloeberVedMs: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachetToken.vaerdi;
}

async function autoriseretFetch(sti: string, init: RequestInit): Promise<Response> {
  const token = await hentAdgangsToken();
  return fetch(`${basisUrl()}${sti}`, {
    ...init,
    headers: {
      ...faelleshHeaders(),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

export async function opretBetaling(params: {
  reference: string;
  beloebOere: number;
  returnUrl: string;
}): Promise<{ redirectUrl: string }> {
  const res = await autoriseretFetch("/epayment/v1/payments", {
    method: "POST",
    headers: { "Idempotency-Key": params.reference },
    body: JSON.stringify({
      amount: { currency: "DKK", value: params.beloebOere },
      paymentMethod: { type: "WALLET" },
      reference: params.reference,
      userFlow: "WEB_REDIRECT",
      returnUrl: params.returnUrl,
    }),
  });

  if (!res.ok) {
    throw new Error(`Kunne ikke oprette betaling: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { redirectUrl: string };
  return { redirectUrl: data.redirectUrl };
}

export async function indfrielseBetaling(params: {
  reference: string;
  beloebOere: number;
}): Promise<{ indfrietOere: number }> {
  const res = await autoriseretFetch(
    `/epayment/v1/payments/${encodeURIComponent(params.reference)}/capture`,
    {
      method: "POST",
      // Deterministisk, ikke tilfældig — en gensendt webhook skal give det
      // samme indfrielsesforsøg igen, ikke et nyt.
      headers: { "Idempotency-Key": `capture-${params.reference}` },
      body: JSON.stringify({
        modificationAmount: { currency: "DKK", value: params.beloebOere },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Kunne ikke indfri betaling: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    aggregate: { capturedAmount: { value: number } };
  };
  return { indfrietOere: data.aggregate.capturedAmount.value };
}
