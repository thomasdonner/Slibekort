import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { Resend as ResendClient } from "resend";
import { prisma } from "./prisma";
import type { Rolle } from "@prisma/client";

// Ét år, i sekunder. Sliberens telefon skal blive ved med at være logget
// ind — se CLAUDE.md, afsnittet om sikkerhed.
const SESSION_MAX_AGE_SEKUNDER = 365 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SEKUNDER,
  },
  pages: {
    signIn: "/logind",
    verifyRequest: "/logind/tjek-mail",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM,
      async sendVerificationRequest({ identifier: email, url }) {
        const from = process.env.RESEND_FROM;
        if (!from) {
          throw new Error("RESEND_FROM er ikke sat");
        }
        // Oprettes her, ikke ved modulets indlæsning — ellers fejler
        // builden, hvis RESEND_API_KEY ikke er sat endnu (fx et frisk clone).
        const resend = new ResendClient(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from,
          to: email,
          subject: "Login til slibekortet",
          text: `Tryk her for at logge ind:\n${url}\n\nLinket udløber om 24 timer. Har du ikke selv bedt om det, kan du ignorere denne mail.`,
          html: `<p>Tryk her for at logge ind:</p><p><a href="${url}">${url}</a></p><p>Linket udløber om 24 timer. Har du ikke selv bedt om det, kan du ignorere denne mail.</p>`,
        });
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const bruger = await prisma.bruger.findUnique({
        where: { userId: user.id },
      });
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          brugerId: bruger?.id ?? null,
          roller: (bruger?.roller ?? []) as Rolle[],
          aktiv: bruger?.aktiv ?? false,
          delt: bruger?.delt ?? false,
        },
      };
    },
  },
});
