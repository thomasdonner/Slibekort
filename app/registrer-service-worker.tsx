"use client";

import { useEffect } from "react";

export function RegistrerServiceWorker() {
  useEffect(() => {
    // Ikke i udvikling: cachen (stale-while-revalidate) gør ellers, at en
    // frivillig kan rette kode og se den gamle version igen og igen, uden
    // at forstå hvorfor — se CLAUDE.md. next dev sætter selv NODE_ENV.
    if (process.env.NODE_ENV === "development") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ingen service worker, ingen offline app-skal. Selve
        // slibe-køen i IndexedDB virker stadig uden den.
      });
    }
  }, []);

  return null;
}
