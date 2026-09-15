import type { MetadataRoute } from "next";

// Gør systemet installerbart: "Føj til hjemmeskærm" på Android/Chrome
// åbner den så i fuldskærm uden browserens adresselinje. iOS bruger sin
// egen mekanisme (apple-touch-icon + meta-tags i layout.tsx), ikke denne
// fil, men det skader ikke at have begge.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Slibekort — Aalborg Ishockey Klub",
    short_name: "Slibekort",
    description: "Digitalt slibekort til Aalborg Ishockey Klub",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#0a0a0a",
    lang: "da",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
