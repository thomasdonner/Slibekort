// Kravspecifikationen, afsnit 8: "Tre mails, ikke flere. Hver mail har ét
// formål og én knap." Advarsel og rykker skabelonen er den samme, uanset
// om et barn er alene i mailen eller deler den med en søskende — se
// afsnit 5.5/6 om hvorfor søskende samles i én mail.

export type SkabelonResultat = { emne: string; tekst: string; html: string };

export type MailTrin = "advarsel" | "rykker";

export type PaamindelseBarn = {
  navn: string;
  trin: MailTrin;
  betalingsUrl: string;
};

export type PaamindelseSkabelonData = {
  voksenNavn: string | null;
  boern: PaamindelseBarn[];
  kassererEmail: string;
};

function escapeHtml(tekst: string): string {
  return tekst.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function hilsen(voksenNavn: string | null): string {
  return voksenNavn ? `Hej ${voksenNavn}` : "Hej";
}

function enkeltBarnEmne(barn: PaamindelseBarn): string {
  return barn.trin === "advarsel"
    ? `${barn.navn} har 1 slibning tilbage`
    : `${barn.navn}s slibekort skal fyldes op`;
}

function barnForklaring(barn: PaamindelseBarn): string {
  return barn.trin === "advarsel"
    ? `${barn.navn} har 1 slibning tilbage på slibekortet. Fyld op nu, så er skøjterne klar til næste træning.`
    : `${barn.navn}s slibekort er brugt op. ${barn.navn} får stadig slebet skøjter — fyld op, når det passer.`;
}

export function paamindelseSkabelon(
  data: PaamindelseSkabelonData,
): SkabelonResultat {
  if (data.boern.length === 0) {
    throw new Error("paamindelseSkabelon kræver mindst ét barn.");
  }

  const emne =
    data.boern.length === 1
      ? enkeltBarnEmne(data.boern[0])
      : `${data.boern.map((b) => b.navn).join(" og ")} har brug for at få fyldt op på slibekortet`;

  const tekstAfsnit = data.boern.map((barn) =>
    [
      barnForklaring(barn),
      "",
      "10 slibninger — 300 kr.",
      `Betal med MobilePay: ${barn.betalingsUrl}`,
    ].join("\n"),
  );

  const htmlAfsnit = data.boern.map(
    (barn) => `
    <p>${escapeHtml(barnForklaring(barn))}</p>
    <p><strong>10 slibninger — 300 kr.</strong></p>
    <p><a href="${barn.betalingsUrl}">Betal med MobilePay</a></p>`,
  );

  const tekst = [
    `${hilsen(data.voksenNavn)},`,
    "",
    tekstAfsnit.join("\n\n"),
    "",
    `Ser noget forkert ud, så skriv til ${data.kassererEmail}.`,
    "",
    "Aalborg Ishockey Klub",
  ].join("\n");

  const html = `
    <p>${escapeHtml(hilsen(data.voksenNavn))},</p>
    ${htmlAfsnit.join("\n")}
    <p>Ser noget forkert ud, så skriv til <a href="mailto:${data.kassererEmail}">${data.kassererEmail}</a>.</p>
    <p>Aalborg Ishockey Klub</p>
  `.trim();

  return { emne, tekst, html };
}

export type KvitteringSkabelonData = {
  voksenNavn: string | null;
  barnNavn: string;
  beloebKr: number;
  antalSlibninger: number;
  nySaldo: number;
  dato: Date;
};

function formaterDato(dato: Date): string {
  const dag = String(dato.getDate()).padStart(2, "0");
  const maaned = String(dato.getMonth() + 1).padStart(2, "0");
  return `${dag}.${maaned}.${dato.getFullYear()}`;
}

export function kvitteringSkabelon(
  data: KvitteringSkabelonData,
): SkabelonResultat {
  const dato = formaterDato(data.dato);
  const emne = `Kvittering — ${data.barnNavn}s slibekort er fyldt op`;

  const tekst = [
    `${hilsen(data.voksenNavn)},`,
    "",
    `Tak for betalingen. ${data.antalSlibninger} slibninger er lagt til ${data.barnNavn}s slibekort.`,
    "",
    `Beløb: ${data.beloebKr} kr.`,
    `Dato: ${dato}`,
    `Ny saldo: ${data.nySaldo} slibninger`,
    "",
    "Aalborg Ishockey Klub",
  ].join("\n");

  const html = `
    <p>${escapeHtml(hilsen(data.voksenNavn))},</p>
    <p>Tak for betalingen. ${data.antalSlibninger} slibninger er lagt til ${escapeHtml(data.barnNavn)}s slibekort.</p>
    <ul>
      <li>Beløb: ${data.beloebKr} kr.</li>
      <li>Dato: ${dato}</li>
      <li>Ny saldo: ${data.nySaldo} slibninger</li>
    </ul>
    <p>Aalborg Ishockey Klub</p>
  `.trim();

  return { emne, tekst, html };
}
