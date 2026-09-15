// Samme afgrænsning som service workerens dev-undtagelse (se
// app/registrer-service-worker.tsx): "production" er både `next build`
// og en rigtig udgivet version, "development" er kun `next dev` på en
// udvikler- eller frivillig-maskine. Alt der bruger denne funktion er
// dødt uden for udvikling, uanset om filerne ved et uheld skulle blive
// deployet.
export function erUdviklingsmiljoe(): boolean {
  return process.env.NODE_ENV !== "production";
}
