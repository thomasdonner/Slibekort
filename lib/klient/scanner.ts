import { beregnSaldo } from "@/lib/saldo";
import { erIndenforSpaerretid } from "@/lib/slibning";
import {
  gemKoePost,
  gemRosterPost,
  hentKoeForSpiller,
  hentRosterPost,
  sletKoePost,
  hentKoe,
  type KoePost,
} from "./db";

export type Bekraeftelse = {
  spillerId: string;
  qrToken: string;
  navn: string;
  hold: string;
  saldo: number;
  spaerret: boolean;
  sidsteSlibningTidspunkt: string | null;
  fraCache: boolean;
};

/**
 * Slår en spiller op til bekræftelsesskærmen. Prøver serveren først, og
 * falder tilbage til det, telefonen så sidst, hvis der ingen forbindelse er.
 * Uden forbindelse OG uden en tidligere scanning af akkurat denne spiller
 * på akkurat denne telefon kan opslaget ikke gennemføres — det er den
 * praktiske grænse for "sliberen mærker ingen forskel".
 */
export async function hentSpillerTilBekraeftelse(
  qrToken: string,
): Promise<Bekraeftelse | { fejl: string }> {
  try {
    const res = await fetch("/api/slib/opslag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    });

    if (res.ok) {
      const data = await res.json();
      await gemRosterPost({
        qrToken,
        spillerId: data.spillerId,
        navn: data.navn,
        hold: data.hold,
        saldo: data.saldo,
        sidsteSlibningTidspunkt: data.sidsteSlibningTidspunkt,
        hentetTidspunkt: new Date().toISOString(),
      });
      return {
        spillerId: data.spillerId,
        qrToken,
        navn: data.navn,
        hold: data.hold,
        saldo: data.saldo,
        spaerret: data.spaerret,
        sidsteSlibningTidspunkt: data.sidsteSlibningTidspunkt,
        fraCache: false,
      };
    }

    if (res.status === 404) {
      return { fejl: "Ukendt eller inaktiv QR-kode." };
    }
    if (res.status === 401 || res.status === 403) {
      return { fejl: "Login er udløbet. Log ind igen." };
    }
  } catch {
    // Ingen forbindelse — falder igennem til cachen herunder.
  }

  const cache = await hentRosterPost(qrToken);
  if (!cache) {
    return {
      fejl: "Ingen forbindelse, og spilleren er ikke set på denne telefon før.",
    };
  }

  const koe = await hentKoeForSpiller(cache.spillerId);
  const saldo = beregnSaldo([
    { antal: cache.saldo },
    ...koe.map((post) => ({ antal: post.antalEffekt })),
  ]);

  const sidsteTraekITKoe = koe
    .filter((post) => post.type === "traek")
    .map((post) => new Date(post.oprettet))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const sidsteSlibning =
    [
      cache.sidsteSlibningTidspunkt ? new Date(cache.sidsteSlibningTidspunkt) : null,
      sidsteTraekITKoe ?? null,
    ]
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    spillerId: cache.spillerId,
    qrToken,
    navn: cache.navn,
    hold: cache.hold,
    saldo,
    spaerret: erIndenforSpaerretid(sidsteSlibning, new Date()),
    sidsteSlibningTidspunkt: sidsteSlibning ? sidsteSlibning.toISOString() : null,
    fraCache: true,
  };
}

/**
 * Lægger en slibning i køen og forsøger med det samme at sende den.
 * Returnerer klientId'et, så kvitteringsskærmen kan bruge det til at
 * fortryde, selvom den endnu ikke er nået frem til serveren.
 */
export async function traekSlibning(params: {
  qrToken: string;
  spillerId: string;
  tvangstraek: boolean;
  udfoertAfNavn?: string;
}): Promise<{ klientId: string; saldo: number }> {
  const klientId = crypto.randomUUID();

  await gemKoePost({
    klientId,
    type: "traek",
    qrToken: params.qrToken,
    spillerId: params.spillerId,
    antalEffekt: -1,
    tvangstraek: params.tvangstraek,
    udfoertAfNavn: params.udfoertAfNavn,
    oprettet: new Date().toISOString(),
  });

  const cache = await hentRosterPost(params.qrToken);
  const koe = await hentKoeForSpiller(params.spillerId);
  const saldo = beregnSaldo([
    { antal: cache?.saldo ?? 0 },
    ...koe.map((post) => ({ antal: post.antalEffekt })),
  ]);

  void synkroniserKoe();

  return { klientId, saldo };
}

/**
 * Fortryder en slibning inden for vinduet. Hvis den oprindelige slibning
 * slet ikke er sendt til serveren endnu, fjernes den bare fra køen —
 * ellers sender en modsatrettet bevægelse, som selv går gennem køen.
 */
export async function fortrydSlibning(params: {
  qrToken: string;
  spillerId: string;
  oprindeligKlientId: string;
  oprindeligBevaegelseId: string | null;
  udfoertAfNavn?: string;
}): Promise<{ saldo: number }> {
  if (!params.oprindeligBevaegelseId) {
    await sletKoePost(params.oprindeligKlientId);
    const cache = await hentRosterPost(params.qrToken);
    const koe = await hentKoeForSpiller(params.spillerId);
    return {
      saldo: beregnSaldo([
        { antal: cache?.saldo ?? 0 },
        ...koe.map((post) => ({ antal: post.antalEffekt })),
      ]),
    };
  }

  const klientId = crypto.randomUUID();
  await gemKoePost({
    klientId,
    type: "fortryd",
    qrToken: params.qrToken,
    spillerId: params.spillerId,
    antalEffekt: 1,
    oprindeligBevaegelseId: params.oprindeligBevaegelseId,
    udfoertAfNavn: params.udfoertAfNavn,
    oprettet: new Date().toISOString(),
  });

  const cache = await hentRosterPost(params.qrToken);
  const koe = await hentKoeForSpiller(params.spillerId);
  const saldo = beregnSaldo([
    { antal: cache?.saldo ?? 0 },
    ...koe.map((post) => ({ antal: post.antalEffekt })),
  ]);

  void synkroniserKoe();

  return { saldo };
}

type SynkroniseretDetalje = { klientId: string; bevaegelseId: string };

/**
 * Sender alt afventende i køen. Kaldes ved genoprettet forbindelse og ved
 * opstart. Et emit på window lader kvitteringsskærmen opdatere sig, hvis
 * en slibning når frem til serveren, mens skærmen stadig er åben.
 *
 * /api/slib/traek blokerer aldrig (se dens egen kommentar), så et forsøg
 * derfra fejler kun ved manglende forbindelse. /api/slib/fortryd kan
 * derimod afvise endegyldigt (fortrydelsesvinduet udløbet, eller allerede
 * fortrudt) — så et forsøg herfra fjernes fra køen uden at blive prøvet
 * igen. Den underliggende slibning står så uforandret, og kassereren kan
 * rette den manuelt i overblikket.
 */
export async function synkroniserKoe(): Promise<void> {
  const koe = await hentKoe();

  for (const post of koe) {
    try {
      const svar = await sendKoePost(post);
      if (svar === "mislykkedes_endeligt") {
        await sletKoePost(post.klientId);
        continue;
      }

      await gemRosterPost({
        qrToken: post.qrToken,
        spillerId: post.spillerId,
        navn: svar.navn,
        hold: svar.hold,
        saldo: svar.saldo,
        sidsteSlibningTidspunkt: svar.sidsteSlibningTidspunkt,
        hentetTidspunkt: new Date().toISOString(),
      });
      await sletKoePost(post.klientId);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<SynkroniseretDetalje>("slibekort:synkroniseret", {
            detail: { klientId: post.klientId, bevaegelseId: svar.bevaegelseId },
          }),
        );
      }
    } catch {
      // Stadig ingen forbindelse. Prøv igen ved næste kald.
      return;
    }
  }
}

type SendSvar =
  | "mislykkedes_endeligt"
  | {
      bevaegelseId: string;
      saldo: number;
      navn: string;
      hold: string;
      sidsteSlibningTidspunkt: string | null;
    };

async function sendKoePost(post: KoePost): Promise<SendSvar> {
  if (post.type === "traek") {
    const res = await fetch("/api/slib/traek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spillerId: post.spillerId,
        klientId: post.klientId,
        tvangstraek: post.tvangstraek ?? false,
        udfoertAfNavn: post.udfoertAfNavn,
      }),
    });
    if (!res.ok) throw new Error("traek fejlede");
    const data = await res.json();
    return await genopslag(post, data);
  }

  const res = await fetch("/api/slib/fortryd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bevaegelseId: post.oprindeligBevaegelseId,
      klientId: post.klientId,
      besluttetTidspunkt: post.oprettet,
      udfoertAfNavn: post.udfoertAfNavn,
    }),
  });
  if (res.status === 409) return "mislykkedes_endeligt";
  if (!res.ok) throw new Error("fortryd fejlede");
  const data = await res.json();
  return await genopslag(post, data);
}

// /traek og /fortryd svarer kun med saldo, ikke navn/hold/spærretid. Et
// hurtigt opslag bagefter holder rostercachen fuldstændig, ikke kun saldoen.
async function genopslag(
  post: KoePost,
  svar: { bevaegelseId?: string; saldo: number },
): Promise<Exclude<SendSvar, "mislykkedes_endeligt">> {
  const opslag = await fetch("/api/slib/opslag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrToken: post.qrToken }),
  }).then((r) => r.json());

  return {
    bevaegelseId: svar.bevaegelseId ?? "",
    saldo: svar.saldo,
    navn: opslag.navn,
    hold: opslag.hold,
    sidsteSlibningTidspunkt: opslag.sidsteSlibningTidspunkt,
  };
}
