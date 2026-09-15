import { describe, expect, it } from "vitest";
import { beregnIndholdsHash, beregnSignatur, verificerWebhook } from "./webhook";

// Værdierne herunder er IKKE opdigtede — de er det dokumenterede
// arbejdseksempel fra Vipps MobilePays udviklerdokumentation
// (Webhooks API — "How to authenticate the webhook event"). Genberegnet
// og bekræftet byte for byte før koden blev skrevet, se CLAUDE.md.
const HEMMELIGHED =
  "A0+AeKBRG2KRGvnNwJpQlb6IJFk48CKXCIcrLoHncVJKDILsQSxS6NWCccwWm6r6FhGKhiHTBsG2wo/xU6FY/A==";
const INDHOLD = JSON.stringify({
  "some-unique-content": "ee6e441b-cc4a-46f8-895d-a5af79bcc233/hello-world",
});
const DATO = "Thu, 30 Mar 2023 08:38:32 GMT";
const HOST = "webhook.site";
const STI = "/e2cee29b-012e-4f1d-8ef4-e95fd74a7a63";
const FORVENTET_HASH = "lNlsp1XA03N34HrQsVzPgJKtC+r7l/RBF4V3JQUWMj4=";
const FORVENTET_SIGNATUR = "agAiSyogQbDHpeucoNwYz+yAr5nJ+v+zasdkSbqzv+U=";

describe("beregnIndholdsHash", () => {
  it("matcher det dokumenterede eksempel", () => {
    expect(beregnIndholdsHash(INDHOLD)).toBe(FORVENTET_HASH);
  });
});

describe("beregnSignatur", () => {
  it("matcher det dokumenterede eksempel", () => {
    const signatur = beregnSignatur({
      hemmelighed: HEMMELIGHED,
      metode: "POST",
      stiOgQuery: STI,
      dato: DATO,
      host: HOST,
      indholdsHash: FORVENTET_HASH,
    });
    expect(signatur).toBe(FORVENTET_SIGNATUR);
  });
});

describe("verificerWebhook", () => {
  const gyldigeHeaders = {
    "x-ms-date": DATO,
    host: HOST,
    "x-ms-content-sha256": FORVENTET_HASH,
    authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${FORVENTET_SIGNATUR}`,
  };

  it("godkender en gyldig, dokumenteret signatur", () => {
    expect(
      verificerWebhook({
        hemmelighed: HEMMELIGHED,
        metode: "POST",
        stiOgQuery: STI,
        raaIndhold: INDHOLD,
        headers: gyldigeHeaders,
      }),
    ).toBe(true);
  });

  it("afviser hvis indholdet er ændret efter signering", () => {
    expect(
      verificerWebhook({
        hemmelighed: HEMMELIGHED,
        metode: "POST",
        stiOgQuery: STI,
        raaIndhold: INDHOLD + " ",
        headers: gyldigeHeaders,
      }),
    ).toBe(false);
  });

  it("afviser en forkert hemmelighed", () => {
    expect(
      verificerWebhook({
        hemmelighed: "en-helt-anden-hemmelighed",
        metode: "POST",
        stiOgQuery: STI,
        raaIndhold: INDHOLD,
        headers: gyldigeHeaders,
      }),
    ).toBe(false);
  });

  it("afviser hvis authorization-headeren er manipuleret", () => {
    expect(
      verificerWebhook({
        hemmelighed: HEMMELIGHED,
        metode: "POST",
        stiOgQuery: STI,
        raaIndhold: INDHOLD,
        headers: {
          ...gyldigeHeaders,
          authorization: gyldigeHeaders.authorization.slice(0, -4) + "AAAA",
        },
      }),
    ).toBe(false);
  });

  it("afviser en forkert sti (kunne ellers genbruges mod et andet endpoint)", () => {
    expect(
      verificerWebhook({
        hemmelighed: HEMMELIGHED,
        metode: "POST",
        stiOgQuery: "/et-andet-endpoint",
        raaIndhold: INDHOLD,
        headers: gyldigeHeaders,
      }),
    ).toBe(false);
  });
});
