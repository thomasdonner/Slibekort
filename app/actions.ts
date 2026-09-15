"use server";

import { signOut } from "@/lib/auth";

export async function logUd() {
  await signOut({ redirectTo: "/logind" });
}
