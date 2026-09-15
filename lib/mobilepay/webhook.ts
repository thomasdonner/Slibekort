import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Vipps MobilePays signaturskema for webhooks: en HMAC-SHA256 over
// METODE\nSTI\nDATO;HOST;INDHOLDSHASH, med webhookens hemmelighed brugt
// direkte som UTF-8-nøgle. Algoritmen her er verificeret mod det
// dokumenterede eksempel i deres udviklerdokumentation, se testen og
// CLAUDE.md for kilden — ikke gættet ud fra hukommelse alene.

export function beregnIndholdsHash(raaIndhold: string): string {
  return createHash("sha256").update(raaIndhold, "utf8").digest("base64");
}

export function beregnSignatur(params: {
  hemmelighed: string;
  metode: string;
  stiOgQuery: string;
  dato: string;
  host: string;
  indholdsHash: string;
}): string {
  const strengTilSignering = `${params.metode}\n${params.stiOgQuery}\n${params.dato};${params.host};${params.indholdsHash}`;
  return createHmac("sha256", Buffer.from(params.hemmelighed, "utf8"))
    .update(strengTilSignering, "utf8")
    .digest("base64");
}

export type WebhookHeaders = {
  "x-ms-date": string;
  host: string;
  "x-ms-content-sha256": string;
  authorization: string;
};

export function verificerWebhook(params: {
  hemmelighed: string;
  metode: string;
  stiOgQuery: string;
  raaIndhold: string;
  headers: WebhookHeaders;
}): boolean {
  const indholdsHash = beregnIndholdsHash(params.raaIndhold);
  if (indholdsHash !== params.headers["x-ms-content-sha256"]) {
    return false;
  }

  const signatur = beregnSignatur({
    hemmelighed: params.hemmelighed,
    metode: params.metode,
    stiOgQuery: params.stiOgQuery,
    dato: params.headers["x-ms-date"],
    host: params.headers.host,
    indholdsHash,
  });

  const forventet = Buffer.from(
    `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signatur}`,
    "utf8",
  );
  const modtaget = Buffer.from(params.headers.authorization, "utf8");

  // timingSafeEqual kaster ved forskellig længde, så det tjekkes først —
  // det lækker kun længden, ikke indholdet, og gør stadig sammenligningen
  // sikker mod timing-angreb på selve signaturen.
  return forventet.length === modtaget.length && timingSafeEqual(forventet, modtaget);
}
