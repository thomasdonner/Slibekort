// Étgangsopsætning: registrerer webhooken hos MobilePay og printer den
// hemmelighed, der skal ind i MOBILEPAY_WEBHOOK_SECRET. Testmiljø og
// produktion er hver sin registrering — kør den igen, den dag klubbens
// rigtige nøgler er godkendt og MOBILEPAY_API_BASE_URL peger på
// api.vipps.no i stedet for apitest.vipps.no.
//
// Kør: node scripts/mobilepay-webhook.mjs <webhook-url>
// Fx:  node scripts/mobilepay-webhook.mjs https://slibekort.aalborgishockey.dk/api/mobilepay/webhook
//
// Kræver at MOBILEPAY_API_BASE_URL, MOBILEPAY_CLIENT_ID,
// MOBILEPAY_CLIENT_SECRET, MOBILEPAY_SUBSCRIPTION_KEY og
// MOBILEPAY_MERCHANT_SERIAL_NUMBER allerede er sat i miljøet.

const HAENDELSER = [
  "epayments.payment.created.v1",
  "epayments.payment.authorized.v1",
  "epayments.payment.captured.v1",
  "epayments.payment.cancelled.v1",
  "epayments.payment.aborted.v1",
  "epayments.payment.expired.v1",
  "epayments.payment.terminated.v1",
];

function kraev(navn) {
  const vaerdi = process.env[navn];
  if (!vaerdi) {
    console.error(`${navn} er ikke sat.`);
    process.exit(1);
  }
  return vaerdi;
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Brug: node scripts/mobilepay-webhook.mjs <webhook-url>");
    process.exitCode = 1;
    return;
  }

  const basis = kraev("MOBILEPAY_API_BASE_URL").replace(/\/+$/, "");

  const tokenRes = await fetch(`${basis}/accesstoken/get`, {
    method: "POST",
    headers: {
      client_id: kraev("MOBILEPAY_CLIENT_ID"),
      client_secret: kraev("MOBILEPAY_CLIENT_SECRET"),
      "Ocp-Apim-Subscription-Key": kraev("MOBILEPAY_SUBSCRIPTION_KEY"),
      "Merchant-Serial-Number": kraev("MOBILEPAY_MERCHANT_SERIAL_NUMBER"),
    },
  });
  if (!tokenRes.ok) {
    console.error("Kunne ikke hente adgangstoken:", tokenRes.status, await tokenRes.text());
    process.exitCode = 1;
    return;
  }
  const { access_token: adgangsToken } = await tokenRes.json();

  const webhookRes = await fetch(`${basis}/webhooks/v1/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adgangsToken}`,
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": kraev("MOBILEPAY_SUBSCRIPTION_KEY"),
      "Merchant-Serial-Number": kraev("MOBILEPAY_MERCHANT_SERIAL_NUMBER"),
    },
    body: JSON.stringify({ url, events: HAENDELSER }),
  });
  if (!webhookRes.ok) {
    console.error("Kunne ikke registrere webhook:", webhookRes.status, await webhookRes.text());
    process.exitCode = 1;
    return;
  }

  const { id, secret } = await webhookRes.json();
  console.log(`Webhook registreret (id: ${id}) for: ${url}`);
  console.log(`Sæt MOBILEPAY_WEBHOOK_SECRET til:\n${secret}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
