// Lille håndskrevet lag over IndexedDB. Ingen af de gængse pakker (idb,
// dexie) tilføjer nok til at være det værd for to simple tabeller.

const DB_NAVN = "slibekort";
const DB_VERSION = 1;

export type RosterPost = {
  qrToken: string;
  spillerId: string;
  navn: string;
  hold: string;
  saldo: number;
  sidsteSlibningTidspunkt: string | null;
  hentetTidspunkt: string;
};

export type KoePost = {
  klientId: string;
  type: "traek" | "fortryd";
  qrToken: string;
  spillerId: string;
  antalEffekt: number;
  tvangstraek?: boolean;
  oprindeligBevaegelseId?: string;
  oprettet: string;
};

function aabnDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAVN, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("roster")) {
        db.createObjectStore("roster", { keyPath: "qrToken" });
      }
      if (!db.objectStoreNames.contains("koe")) {
        db.createObjectStore("koe", { keyPath: "klientId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaktion<T>(
  butik: "roster" | "koe",
  tilstand: IDBTransactionMode,
  brug: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await aabnDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(butik, tilstand);
    const request = brug(tx.objectStore(butik));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function gemRosterPost(post: RosterPost): Promise<void> {
  await transaktion("roster", "readwrite", (store) => store.put(post));
}

export async function hentRosterPost(
  qrToken: string,
): Promise<RosterPost | undefined> {
  return transaktion("roster", "readonly", (store) => store.get(qrToken));
}

export async function gemKoePost(post: KoePost): Promise<void> {
  await transaktion("koe", "readwrite", (store) => store.put(post));
}

export async function sletKoePost(klientId: string): Promise<void> {
  await transaktion("koe", "readwrite", (store) => store.delete(klientId));
}

export async function hentKoe(): Promise<KoePost[]> {
  return transaktion("koe", "readonly", (store) => store.getAll());
}

export async function hentKoeForSpiller(spillerId: string): Promise<KoePost[]> {
  const alle = await hentKoe();
  return alle.filter((post) => post.spillerId === spillerId);
}
