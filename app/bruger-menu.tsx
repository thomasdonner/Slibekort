"use client";

import { useEffect, useRef, useState } from "react";
import { logUd } from "./actions";
import { IkonLogUd } from "./ikoner";

export function BrugerMenu({
  navn,
  email,
}: {
  navn: string | null;
  email: string;
}) {
  const [aaben, setAaben] = useState(false);
  const rodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function lukVedKlikUdenfor(event: MouseEvent) {
      if (rodRef.current && !rodRef.current.contains(event.target as Node)) {
        setAaben(false);
      }
    }
    document.addEventListener("click", lukVedKlikUdenfor);
    return () => document.removeEventListener("click", lukVedKlikUdenfor);
  }, []);

  const forbogstav = (navn || email).trim().charAt(0).toUpperCase();

  return (
    <div className="bruger-menu" ref={rodRef}>
      <button
        type="button"
        className="bruger-menu-knap"
        onClick={() => setAaben((v) => !v)}
        aria-expanded={aaben}
        aria-label="Kontomenu"
      >
        <span className="bruger-cirkel">{forbogstav}</span>
      </button>
      {aaben && (
        <div className="bruger-menu-indhold" role="menu">
          <p className="bruger-menu-email">{navn || email}</p>
          {navn && <p className="bruger-menu-email-lille">{email}</p>}
          <form action={logUd}>
            <button type="submit" className="knap-tekst">
              <IkonLogUd />
              Log ud
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
