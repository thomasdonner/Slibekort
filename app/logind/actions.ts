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
    await signIn("resend", { email, redirectTo: "/logind/tjek-mail" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { fejl: "Kunne ikke sende login-linket. Prøv igen." };
    }
    // signIn kaster en omdirigering, når det lykkes — den skal videre.
    throw error;
  }

  return {};
}
