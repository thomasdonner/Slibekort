"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LogindState = { fejl?: string };

export async function logInd(
  _forrigeState: LogindState,
  formData: FormData,
): Promise<LogindState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { fejl: "Skriv en gyldig mailadresse." };
  }

  try {
    // redirectTo er IKKE hvor man ender lige efter at have bedt om linket
    // (det styrer pages.verifyRequest i lib/auth.ts, allerede sat til
    // /logind/tjek-mail) — det er hvor Auth.js sender brugeren hen, efter
    // linket i selve mailen er klikket og login er gennemført. "/" er
    // forsidens egen omdirigering til /overblik eller /slib efter rolle;
    // pegede den fejlagtigt på /logind/tjek-mail, endte man tilbage på
    // "Tjek din mail"-siden, selvom man allerede var logget ind.
    await signIn("resend", { email, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { fejl: "Kunne ikke sende login-linket. Prøv igen." };
    }
    // signIn kaster en omdirigering, når det lykkes — den skal videre.
    throw error;
  }

  return {};
}
