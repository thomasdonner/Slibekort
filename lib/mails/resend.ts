import { Resend } from "resend";

/**
 * Tynd indpakning om Resend. Fejler aldrig ud af processen — en mail der
 * ikke kan sendes, skal ikke vælte en slibning eller en rettelse, den skal
 * bare stå med leveringsstatus "fejlet" til at blive opdaget.
 */
export async function sendMail(params: {
  til: string;
  emne: string;
  tekst: string;
  html: string;
}): Promise<"sendt" | "fejlet"> {
  const apiKey = process.env.RESEND_API_KEY;
  const fra = process.env.RESEND_FROM;

  if (!apiKey || !fra) {
    console.error("RESEND_API_KEY eller RESEND_FROM er ikke sat — mail ikke sendt.");
    return "fejlet";
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fra,
      to: params.til,
      subject: params.emne,
      text: params.tekst,
      html: params.html,
    });
    return "sendt";
  } catch (error) {
    console.error("Kunne ikke sende mail", error);
    return "fejlet";
  }
}
