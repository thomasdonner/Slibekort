// Kravspecifikationen, afsnit 8: "Tre mails, ikke flere. Hver mail har ét
// formål og én knap." Advarsel og rykker skabelonen er den samme, uanset
// om et barn er alene i mailen eller deler den med en søskende — se
// afsnit 5.5/6 om hvorfor søskende samles i én mail.
//
// HTML-udgaven er skrevet i tabel-baseret markup med inline stilarter med
// vilje, ikke en ekstern klasse eller et rigtigt CSS-ark — det er den
// eneste markup, der er til at stole på på tværs af mailklienter (Gmail,
// Outlook, Apple Mail …), som hver især kun forstår en delmængde af CSS.
// `tekst`-udgaven er stadig den fulde, uforkortede besked for klienter
// eller skærmlæsere der ikke viser html.

export type SkabelonResultat = { emne: string; tekst: string; html: string };

// Klubbens egne farver — samme værdier som app/globals.css, se CLAUDE.md
// for hvor de kommer fra (målt direkte på aaik.dk).
const FARVE_ACCENT = "#dd2f2f";
const FARVE_ACCENT_TEKST = "#ffffff";
const FARVE_TEKST = "#1c1b1b";
const FARVE_TEKST_SVAG = "#6b6b6b";
const FARVE_KANT = "#e6e6e7";
const FARVE_BAGGRUND = "#f4f4f5";
const FARVE_SUND = "#1a7a4a";
const FARVE_SUND_LYS = "#e8f5ee";

function escapeHtml(tekst: string): string {
  return tekst.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function hilsen(voksenNavn: string | null): string {
  return voksenNavn ? `Hej ${voksenNavn}` : "Hej";
}

// Fælles ramme om alle tre mails — en rød stribe øverst (klubbens
// accentfarve, ikke et billede: en gradient eller et logo ville kunne slå
// fejl eller blive blokeret i en mailklient, en ren baggrundsfarve kan
// ikke), et lille "AALBORG ISHOCKEY KLUB"-mærke, og selve indholdet.
function mailRamme(indhold: string): string {
  return `
<div style="background-color:${FARVE_BAGGRUND};padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
    <tr>
      <td style="background-color:#ffffff;border:1px solid ${FARVE_KANT};border-radius:12px;overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color:${FARVE_ACCENT};height:6px;line-height:6px;font-size:6px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 28px 0;">
              <p style="margin:0;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${FARVE_ACCENT};">
                Aalborg Ishockey Klub
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 28px;font-size:15px;line-height:1.6;color:${FARVE_TEKST};">
              ${indhold}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 12px 0;text-align:center;font-size:12px;color:${FARVE_TEKST_SVAG};">
        Slibekortet &middot; Aalborg Ishockey Klub
      </td>
    </tr>
  </table>
</div>`.trim();
}

// Et bulletproof-nok knap-mønster til mail: en farvelagt tabel-celle med
// et link indeni, ikke en <button> (findes ikke i mail) eller en ren CSS
// baggrund på et <a> alene (Outlook gengiver den upålideligt).
function mailKnap(url: string, tekst: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 4px;">
  <tr>
    <td style="background-color:${FARVE_ACCENT};border-radius:8px;">
      <a href="${url}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:bold;color:${FARVE_ACCENT_TEKST};text-decoration:none;">
        ${escapeHtml(tekst)}
      </a>
    </td>
  </tr>
</table>`.trim();
}

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

  const tekst = [
    `${hilsen(data.voksenNavn)},`,
    "",
    tekstAfsnit.join("\n\n"),
    "",
    `Ser noget forkert ud, så skriv til ${data.kassererEmail}.`,
    "",
    "Aalborg Ishockey Klub",
  ].join("\n");

  // Flere børn adskilles med en tynd linje, så hvert barns egen knap ikke
  // kan forveksles med et søskendes — vigtigst netop her, hvor to helt
  // ens blokke kan stå lige efter hinanden.
  const htmlAfsnit = data.boern
    .map(
      (barn) => `
<p style="margin:0 0 4px;font-weight:bold;color:${FARVE_TEKST};">${escapeHtml(barn.navn)}</p>
<p style="margin:0 0 16px;">${escapeHtml(barnForklaring(barn))}</p>
${mailKnap(barn.betalingsUrl, "Betal med MobilePay — 300 kr.")}
<p style="margin:8px 0 0;font-size:13px;color:${FARVE_TEKST_SVAG};">10 slibninger for 300 kr.</p>`,
    )
    .join(
      `<hr style="border:none;border-top:1px solid ${FARVE_KANT};margin:24px 0;">`,
    );

  const html = mailRamme(`
<p style="margin:0 0 20px;font-size:16px;">${escapeHtml(hilsen(data.voksenNavn))},</p>
${htmlAfsnit}
<p style="margin:24px 0 0;font-size:13px;color:${FARVE_TEKST_SVAG};">
  Ser noget forkert ud? Skriv til <a href="mailto:${data.kassererEmail}" style="color:${FARVE_ACCENT};">${data.kassererEmail}</a>.
</p>`);

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

  // Kvitteringens tre tal i en lysegrøn boks — samme farve som en sund
  // saldo får i selve overblikket (--sund/--sund-lys), så "det lykkedes"
  // ser ens ud, uanset om man kigger i overblikket eller i indbakken.
  const html = mailRamme(`
<p style="margin:0 0 20px;font-size:16px;">${escapeHtml(hilsen(data.voksenNavn))},</p>
<p style="margin:0 0 20px;">Tak for betalingen. <strong>${data.antalSlibninger} slibninger</strong> er lagt til ${escapeHtml(data.barnNavn)}s slibekort.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${FARVE_SUND_LYS};border-radius:8px;">
  <tr>
    <td style="padding:16px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:${FARVE_SUND};">
        <tr>
          <td style="padding:3px 0;">Beløb</td>
          <td align="right" style="padding:3px 0;font-weight:bold;">${data.beloebKr} kr.</td>
        </tr>
        <tr>
          <td style="padding:3px 0;">Dato</td>
          <td align="right" style="padding:3px 0;font-weight:bold;">${dato}</td>
        </tr>
        <tr>
          <td style="padding:3px 0;">Ny saldo</td>
          <td align="right" style="padding:3px 0;font-weight:bold;">${data.nySaldo} slibninger</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`);

  return { emne, tekst, html };
}
