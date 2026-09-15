"use client";

import { useActionState } from "react";
import { logInd, type LogindState } from "./actions";
import { IkonAdvarsel } from "@/app/ikoner";

const startTilstand: LogindState = {};

export default function LogindSide() {
  const [tilstand, formAction, afventer] = useActionState(
    logInd,
    startTilstand,
  );

  return (
    <main>
      <h1>Log ind</h1>
      <p>Skriv din mailadresse, så sender vi et login-link.</p>
      <form action={formAction}>
        <input
          type="email"
          name="email"
          required
          placeholder="din@mail.dk"
          autoComplete="email"
        />
        <button type="submit" disabled={afventer}>
          {afventer ? "Sender..." : "Send login-link"}
        </button>
      </form>
      {tilstand.fejl && (
        <p role="alert">
          <IkonAdvarsel />
          <span>{tilstand.fejl}</span>
        </p>
      )}
    </main>
  );
}
