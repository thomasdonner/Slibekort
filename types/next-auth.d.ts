import type { DefaultSession } from "next-auth";
import type { Rolle } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      brugerId: string | null;
      roller: Rolle[];
      aktiv: boolean;
    } & DefaultSession["user"];
  }
}
