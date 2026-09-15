# CLAUDE.md

Projektinstruktioner for slibesystemet i Aalborg Ishockey Klub.
Læs `docs/kravspecifikation-slibninger.md` for den fulde beskrivelse.
Denne fil er det korte overblik, der gælder i hver session.

## Hvad vi bygger

Et digitalt slibekort. Skøjtesliberen scanner en QR-kode på spillerens
skøjtepose, saldoen falder med én slibning, og når der er 1 tilbage, får
forældrene en mail med et MobilePay-link, der fylder kortet op.

Erstatter papklippekort. Skal køre uden at nogen frivillig husker noget.

## Hvem der vedligeholder det

En enkelt frivillig, som passer klubbens WordPress-side ved siden af.
Ikke en professionel udvikler, og ikke nogen der arbejder i koden dagligt.

Det styrer alle tekniske valg:

- **Kedelig kode slår smart kode.** Ingen abstraktioner der sparer ti
  linjer og koster en times forståelse.
- **Få afhængigheder.** Hver pakke er noget nogen skal opdatere om to år.
- **Ingen magi.** Eksplicit frem for konventionsbaseret, hvor der er valg.
- **Kommentarer forklarer hvorfor, ikke hvad.**

## Sprog

- Al brugervendt tekst er på dansk.
- Domænebegreber holdes på dansk i koden: `slibning`, `spiller`, `saldo`,
  `hold`, `voksen`, `bevaegelse`. Det gør, at koden og samtalen i hallen
  bruger de samme ord.
- Øvrig kode, variabelnavne og commit-beskeder på engelsk.
- Ordet **slibninger** — aldrig *klip*. Gælder i UI, mails og kode.

## Stak

| Lag | Valg | Hvorfor |
|---|---|---|
| Framework | Next.js, App Router, TypeScript | Ét projekt til både UI og API |
| Database | Postgres i EU-region | Neon eller Supabase, EU skal vælges aktivt |
| ORM | Prisma | Bredt kendt, så en fremtidig frivillig kan læse det |
| Login | Auth.js med magisk link pr. mail | Ingen adgangskoder at glemme |
| Mail | Resend, klubbens eget domæne | SPF og DKIM skal sættes op |
| Betaling | MobilePay ePayment API | Klubbens egen forhandleraftale, ingen mellemmand |
| Hosting | Vercel | Subdomæne via CNAME fra one.com |
| Offline | Service worker + IndexedDB-kø | Slibelokalet har dårligt signal |
| Design | Almindelig CSS, `app/globals.css`, intet framework | Tailwind/et komponentbibliotek er endnu en afhængighed og endnu en syntaks at kende — rene tag-selektorer (`button`, `table`, `section`, `[role="alert"]`) rammer alle sider uden at hver komponent skal have klassenavne |

WordPress-siden på one.com røres ikke. Systemet ligger på et subdomæne.

**Design taget fra aaik.dk:** logoet (`public/aaik-logo.svg`, hentet direkte
fra klubbens hjemmeside) og farverne — rød accent (`#dd2f2f`, klubbens egen
CTA-rød) og en sort topbjælke (`.klub-header` i `app/globals.css`), samme
opbygning som forsidens sorte menulinje. Farverne er målt direkte på deres
side (computed styles), ikke gættet ud fra et skærmbillede. Kassererens
overblik er stadig lyst og roligt at læse tal i — det er kun topbjælken,
knapperne og links, der er brandede, ikke hele baggrunden.

Uigenkaldelige handlinger ("Markér som stoppet", "Fjern adgang") er med
vilje omridsede, ikke fyldte røde knapper — ellers ville de drukne blandt
alle de almindelige røde handlingsknapper, nu hvor rød er accentfarven.

**Skrifttypen er sidenhen skiftet til Inter**, indlæst via `next/font/google`
i `app/layout.tsx` (selv-hostet af Next, ingen ekstern anmodning, ingen ny
afhængighed) — Calibri/Candara-stakken fra aaik.dk stod fint til en
markedsføringsside, men virkede tung og lidt forældet til et dashboard, der
skal læses hurtigt. Farverne fra aaik.dk er bevaret, kun typografien er
ændret.

**En rigtig kontomenu findes nu** (`app/bruger-menu.tsx`, avataren øverst
til højre i topbjælken) — der var ingen måde at logge ud på før. Bruger
Auth.js' `signOut({ redirectTo: "/logind" })` fra en Server Action
(`app/actions.ts`), præcis det mønster Auth.js selv anbefaler i sin egen
dokumentation.

**"Mere moderne, mere spændende"** (endnu en runde, efter ønske):
- Nøgletal øverst i overblikket (`.stat-raekke`/`.stat-kort`) — spillere,
  hold, og "kræver et kig" som store tal, ikke kun en tabel man skal læse
  sig igennem for at forstå, hvor mange der reelt trænger til
  opmærksomhed.
- "Bevægelser der kræver et kig" er lavet om fra en punktopstilling til en
  rigtig aktivitetsliste (`.flag-liste`/`.flag-raekke`) — hver række har en
  rød venstrekant og et advarselsikon, ligesom en notifikationsliste i en
  rigtig app.
- En diagonal stribe under topbjælken (`.klub-stribe`, `repeating-linear-
  gradient`) — låner fra spillertrøjens sort/rød striber på fotoet på
  aaik.dk, så det ikke bare er endnu en grå admin-bjælke.
- Knapper har fået et blødt, farvet lys ved hover (`--accent-gloed`) i
  stedet for en almindelig grå skygge — samme kedelige CSS-teknik
  (box-shadow), men med klubbens egen farve.
- Kvitteringsskærmen i scanneren (den skærm sliberen ser oftest af alle)
  har fået et hakikon og en stor, farvet, animeret saldo i stedet for én
  tekstlinje — en "det lykkedes"-fornemmelse, ikke bare en statusopdatering.
  **Bemærk:** `.tal`-klassen sætter `text-align: right` til tabeller —
  kombineret med `.kvittering-saldo` (som skal stå centreret) gav det
  første forsøg et tal, der lå ude i højre side af skærmen i stedet for
  under navnet. Rettet med en eksplicit `text-align: center` i
  `.kvittering-saldo`, som en generel advarsel om at blande `.tal` med
  en centreret container.

## Regler der ikke må ændres uden at spørge

- 10 slibninger koster 300 kr.
- En enkelt slibning koster 40 kr., købt gennem systemet (ikke kontant —
  klubben tager ikke imod kontanter).
- Saldoen må gå til −2, ikke længere. Ingen bliver afvist ved maskinen.
- Spærring mod dobbeltscanning: 60 minutter pr. spiller, kan overtrumfes
  af sliberen og logges som manuelt godkendt.
- Fortrydelsesvindue: 10 sekunder på telefonen, 24 timer for kassereren.
- Advarsel ved saldo 1, rykker ved 0 og igen ved −2. Maksimalt én
  påmindelse pr. spiller pr. 48 timer.
- Alternativ mailadresse får mailen samtidig med den primære, ikke som
  reserve. Er de to adresser ens, sendes kun én mail.
- Ingen refusion ved udmeldelse. Saldoen kan flyttes til en søskende.

## Beslutninger undervejs

- **Prisma er pinnet til 6.19.3**, ikke den nyeste 7/8. Fra version 7 kræver
  Prisma driver-adapters og en separat `prisma.config.ts` i stedet for
  `url` direkte i schemaet — mere at forstå for den frivillige, uden at
  det løser noget vi har brug for. Opgradér først når det er nødvendigt,
  og læs release notes først.
- **`bevaegelser.antal` er signeret**: negativt for en slibning, positivt
  for et køb eller en fortrudt slibning. En rettelse kan gå begge veje.
  Saldoen er dermed en ren summering af `antal`, uden at kode skal tolke
  på `type` for at vide, om det lægges til eller trækkes fra.
- **Der findes en `brugere`-tabel, adskilt fra `voksne`.** Kravspecifikationens
  afsnit 6 nævner den ikke, men afsnit 4 og 10 kræver login og roller for
  personale (sliber, kasserer, holdleder, administrator), og roller skal
  kunne kombineres. `voksen` er en forældrekontakt (modtager mails).
  `bruger` er en systemkonto (logger ind, har roller i `roller`-feltet,
  et Postgres-array). Samme person kan optræde i begge — det er stadig to
  forskellige ting. Holdlederens adgang til bestemte hold er modelleret i
  `bruger_hold` (punkt 4) — kasserer og administrator ser og retter alle
  hold uanset, se `lib/roller.ts`.
- **Auth.js' egne tabeller** (`users`, `accounts`, `sessions`,
  `verification_tokens`) er de fra Auth.js' Prisma-adapter, med deres
  sædvanlige (engelske) navne — det er infrastruktur, ikke domænesprog.
  Login sker udelukkende med magisk link, så `accounts` bruges reelt ikke,
  men adapteren forventer at den findes i schemaet.
- **Ingen login-session udløber af sig selv** (`maxAge` sat til et år) —
  det er sådan kravet om at "sliberens telefon forbliver logget ind"
  implementeres, uden en separat enhedstoken-mekanisme. Tilbagekaldelse
  sker ved at slette brugerens session-rækker, som overblikket kan gøre
  under "Log enheder ud" (`/overblik/adgang`).
- **`npm run brugere:opret` er nu kun en bootstrap af den første
  administrator**, ikke den almindelige vej til at give adgang — det er
  `/overblik/adgang`, administrator-only. Kasserer kan ikke selv give
  andre adgang (afsnit 4: "Administrator: Alt, inklusive brugeradgang og
  opsætning" — det er administratorens ekstra beføjelse ud over kasserens).
- **`/api/slib/traek` blokerer aldrig et træk**, heller ikke når
  spærretiden på 60 minutter er ramt. Advarslen med "Træk alligevel" er en
  ting der sker interaktivt via `/api/slib/opslag`, FØR sliberen trykker —
  beslutningen er taget der. Ruten er kun et sikkerhedsnet mod at to
  telefoner scanner samme spiller samtidig, og rammer den (typisk en
  forsinket offline-scanning), skriver den bare en note på bevægelsen i
  stedet for at afvise eller tabe den. "Bevægelser der kræver et kig" på
  `/overblik` viser alt med en note, uanset årsag. (Tidligere version af
  denne beslutning lod klienten selv holde styr på "konflikt"-tilstand i
  IndexedDB — det gjorde dem usynlige for kassereren. Rettet i punkt 4.)
- **`/api/slib/fortryd` tjekker fortrydelsesvinduet mod klientens eget
  tidsstempel** (hvornår sliberen trykkede Fortryd), ikke serverens
  modtagelsestidspunkt — ellers ville en forsinket afsendelse fra den
  offline kø kunne underkende noget, der blev besluttet rettidigt.
  Bufferen i `lib/slibning.ts` dækker herefter kun urforskel mellem telefon
  og server. Rammer vinduet alligevel (reel forsinkelse over ca. 15
  sekunder), fjernes forsøget fra køen uden at blive prøvet igen —
  slibningen står uændret, og kassereren kan rette den manuelt.
- **Service workeren er håndskrevet**, ikke next-pwa/Workbox — den cacher
  kun besøgte sider (stale-while-revalidate), så scanneren kan åbnes igen
  uden forbindelse. Selve slibningerne går gennem en IndexedDB-kø i
  `lib/klient/`, ikke gennem service workerens cache.
- **QR-scanning bruger browserens indbyggede `BarcodeDetector`**, ikke et
  npm-bibliotek. Virker i Chrome/Edge/Android; på telefoner uden support
  (bl.a. ældre iOS Safari) falder scannersiden tilbage til manuel
  indtastning af koden. Skift til et bibliotek, hvis det i praksis er et
  problem på de telefoner, sliberne rent faktisk bruger.
- **Xlsx læses med `read-excel-file`, ikke `xlsx` (SheetJS) eller
  `exceljs`.** SheetJS' seneste rettede version distribueres ikke længere
  via npm; den npm-udgivne 0.18.5 har kendte sårbarheder. `exceljs` er fin,
  men trækker en halv snes tunge afhængigheder (archiver, jszip, dayjs …)
  ind for noget der kun skal læses, aldrig skrives. `read-excel-file` er
  skrivebeskyttet og langt lettere.
- **`spillere` har en unik nøgle på (navn, hold)**, og `voksne.email` er
  nullbar-men-unik. Det er sådan en gentaget import genkender en
  eksisterende spiller (opdaterer den, rører aldrig `bevaegelser`) og en
  eksisterende voksen (samme mail = samme voksen, typisk et søskendepar).
  To forskellige spillere med samme navn på samme hold kan importen ikke
  skelne — det flager `parseHoldsportRaekker` som en bemærkning,
  holdlederen må rette navnet i Holdsport. En kontakt uden mailadresse
  (kun telefon) kan af samme grund ikke genkendes på tværs af importer og
  får en ny `voksen`-række hver gang — accepteret, fordi den slags kontakt
  alligevel ikke kan modtage mailpåmindelser.
- **Importsiden ligger på `/import`**, ikke nestet under noget endnu —
  kassererens overblik (punkt 4) kan linke til den, når det findes.
  Adgang: **kun kasserer og administrator**, ikke holdleder — se
  "Beslutninger undervejs — import kun for kasserer/administrator"
  længere nede for hvorfor det blev strammet fra afsnit 5.3's oprindelige
  "kasserer, holdleder eller administrator".
- **Overblikket bruger Server Actions, ikke API-ruter**, i modsætning til
  scanneren og importsiden. De sidste to har rigtige grunde (kamera,
  offline-kø, multipart filupload); overblikket har ingen af delene, så
  almindelige Next.js-formularer mod `app/overblik/actions.ts` er den
  kedeligste løsning. Hver handling tjekker selv adgang og hold — en
  Server Action er sit eget endpoint, uanset hvilken side der viser
  knappen, så det er ikke nok at siden er gated af layoutet.
- **Kun kasserer og administrator retter saldi**, ikke holdleder (afsnit
  4). Holdleder ser sit holds saldi og kan rette voksnes kontaktoplysninger
  for spillere på egne hold, intet andet.
- **Søskende-saldooverførsel er to `rettelse`-bevægelser i én
  transaktion** (træk hos den stoppende spiller, tilførsel hos søskendet),
  ikke en særskilt bevægelsestype. Søskende findes ved at slå relationer op
  for spillerens egne voksne og se hvem andre der deler en af dem
  (`lib/overblik/soskende.ts`) — helt efter kravspecifikationens egen
  definition i afsnit 5.5.
- **Ny QR-kode er bare et nyt `qrToken`** (et `crypto.randomUUID()`, ikke
  en cuid — ingen praktisk forskel, begge er unikke og ugættelige). Den
  gamle kode holder automatisk op med at virke, fordi opslag sker på
  `qrToken`, og kun én række kan have en given værdi.
- **Sæsonrapporten er en fil-download, ikke en side i overblikket** — en
  fil, kassereren kan åbne i et regneark, er det, "trække en rapport" i
  praksis betyder for denne bruger. Startede som CSV, er sidenhen ændret
  til rigtige `.xlsx`-filer efter ønske — se "Beslutninger undervejs —
  saldorapport pr. hold og som Excel" for detaljerne og hvorfor.
- **"Sende påmindelser" findes nu** som en knap på spillerens side i
  overblikket (`sendPaamindelseNu`). Den respekterer med vilje de samme 48
  timer som den automatiske udsendelse — at trykke på knappen to gange
  samme dag skal ikke sende to mails. Skal en mail tvinges igennem
  hurtigere, er det en manuel sletning i `mails`-tabellen, ikke en
  UI-genvej uden om reglen.
- **Påmindelsesmails udløses ved enhver bevægelse, der oprigtigt kan have
  ændret saldoen** (`tjekOgSendPaamindelser`, kaldt fra `/api/slib/traek`,
  `rettSaldo`, `registrerKoeb` og søskende-overførslen i `markerStoppet`),
  ikke ved `/api/slib/fortryd`. En fortrydelse retter en fejlscanning —
  den skal aldrig i sig selv kunne udløse en ny påmindelse (fx hvis en
  fortrudt slibning tilfældigvis bringer saldoen tilbage til præcis 1).
  Funktionen selv er uskadelig at kalde for meget: den tjekker altid den
  aktuelle saldo og spærretid, uanset hvad der udløste kaldet.
- **Kaldene til `tjekOgSendPaamindelser` sker via `next/server`'s `after()`**
  fra API-ruterne, ikke ved at afvente dem — sliberens telefon eller
  kassererens formular skal ikke vente på et Resend-kald. En mail der
  fejler logges, den vælter aldrig den bevægelse, den er en reaktion på.
  Den manuelle "Send påmindelse nu"-knap afventer derimod kaldet direkte,
  så kassereren ser resultatet med det samme.
- **Søskende med lav saldo samme dag samles i én mail** ved at gruppere
  efter voksenId, ikke efter et tidsvindue — enhver gang et barn skal
  mailes, tjekkes samtidig om nogen af dets søskende (via samme voksen)
  også aktuelt kvalificerer og ikke allerede er advaret for nylig
  (`lib/mails/regler.ts`, `udvaelgTilPaamindelse`). To søskende, hvis
  bevægelser rammer inden for få øjeblikke af hinanden på hver deres
  telefon, kan i sjældne tilfælde stadig udløse hver sin mail — accepteret,
  for at undgå et distribueret lås-system for noget så usandsynligt.
- **Betalingslinket i mailen peger på `${APP_URL}/betal/[qrToken]`** — se
  punkt 6 for hvorfor det er qrToken og ikke spillerens id.

## MobilePay ePayment API — hvor detaljerne kommer fra

Præcise kontrakter (endpoints, headers, JSON-felter, webhook-signaturens
algoritme) er slået op i Vipps MobilePays udviklerdokumentation, ikke
gættet fra hukommelse — samme forsigtighed som med Prisma 7 tidligere:
en betalingsintegration er det sidste sted at antage noget.

- [Create the payment](https://developer.vippsmobilepay.com/docs/APIs/epayment-api/api-guide/operations/create/)
- [Capture the payment](https://developer.vippsmobilepay.com/docs/APIs/epayment-api/api-guide/operations/capture/)
- [Webhooks (event-typer)](https://developer.vippsmobilepay.com/docs/APIs/epayment-api/api-guide/webhooks/)
- [Webhook request authentication (signaturalgoritmen)](https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication/)
- [Access token endpoint](https://developer.vippsmobilepay.com/api/access-token/)

Webhook-signaturens algoritme er desuden verificeret mod dokumentationens
eget regnede eksempel, byte for byte, før den blev skrevet ind i koden —
se testene i `lib/mobilepay/webhook.test.ts`, de bruger de samme tal.

## Beslutninger undervejs — punkt 6

- **Auth+capture, ikke automatisk indfrielse.** ePayment API'et er en
  to-trins model: `authorized` betyder kunden har godkendt i appen, ikke at
  pengene er trukket. Webhook-handleren beder eksplicit om indfrielse
  (`capture`) ved `authorized`, og krediterer først slibninger ved den
  efterfølgende `captured`-hændelse — det er den, der reelt betyder
  "bekræftet", jf. kravspecifikationens "saldoen ændres først, når
  webhooken er modtaget og verificeret."
- **Krediteringen er dobbelt idempotent**: en `updateMany` med
  `status: { not: "gennemfoert" }` inde i en transaktion sikrer at kun én
  gensendt `captured`-webhook fører til én kreditering — og kvitteringsmailen
  sendes kun, når den transaktion faktisk ændrede noget, ikke ved hvert
  webhook-forsøg. Selve indfrielseskaldet er idempotent på sin egen måde:
  dets `Idempotency-Key` er udledt af betalingsreferencen, ikke tilfældig,
  så en gensendt `authorized`-hændelse beder om den samme indfrielse igen.
- **`/betal/[qrToken]` kræver ikke login og virker uden en app-session** —
  kravspecifikationen, afsnit 5.2: "Forælderen skal ikke logge ind." Den
  bruger `qrToken`, ikke spillerens database-id, fordi det er præcis den
  situation afsnit 10 beskriver: en QR-kode uden sliberens login må kun
  vise saldoen og en knap til at fylde op, aldrig trække noget — det
  gælder både betalingslinket fra mailen OG nogen der fotograferer den
  fysiske kode.
- **Mulig dobbeltbetaling** (afsnit 7) opdages ved at kigge på spillerens
  andre `gennemfoert`-betalinger inden for den seneste time
  (`lib/betaling/regler.ts`) og skrive en bemærkning på den nye
  `koeb`-bevægelse — den dukker så op i "Bevægelser der kræver et kig" på
  `/overblik`, samme genbrugte liste som punkt 4 og 5 allerede bruger.
  Begge betalinger gennemføres stadig, ingen bliver afvist.
- **Webhooken registreres med et separat étgangsscript**
  (`npm run mobilepay:webhook -- <url>`), ikke ved at appen selv
  registrerer sig selv ved opstart — det er en sjælden, bevidst handling
  (én gang pr. miljø), og en app der registrerer webhooks ved hver deploy
  ville hurtigt ramme MobilePays grænse på 25 registreringer pr.
  hændelsestype.
- **Ikke testet mod en rigtig MobilePay-konto** (hverken sandkasse eller
  produktion) — der er ingen adgang til det i denne opsætning. Det der
  kunne testes uden en levende konto, er testet: webhook-signaturen mod
  dokumentationens eget regnede eksempel, og dobbeltbetalings-reglen som
  ren logik. Det uprøvede er selve HTTP-kaldene til MobilePay (opret,
  indfri, adgangstoken) og hele turen igennem en rigtig betaling — det bør
  afprøves i testmiljøet, før nogen forælder ser knappen.

## Beslutninger undervejs — punkt 7

- **QR-koden indeholder en fuld URL (`${APP_URL}/betal/[qrToken]`), ikke
  bare token'et alene** — en rettelse, ikke en ny beslutning. Punkt 2's
  scanner blev bygget til at bruge den rå scannede værdi direkte som
  token, hvilket var forkert i lyset af afsnit 10: "uden sliberens login
  kan koden kun vise saldoen" beskriver hvad der sker, når NOGEN
  fotograferer koden med en almindelig telefon — det virker kun hvis
  koden indeholder en URL, en almindelig kameraapp kan åbne. Sliberens
  egen scanning trækker nu token'et ud af URL'en igen
  (`lib/qr/token.ts`, `udtraekQrToken`), og fungerer stadig med et bart
  token ved manuel indtastning. `lib/betaling/url.ts` er den ene,
  delte kilde til den URL — mailen (punkt 5) og QR-arket skal give
  præcis den samme, ellers stemmer den trykte kode ikke med den, en
  påmindelse sender.
- **`qrcode-generator` frem for `qrcode`**: samme afvejning som
  `read-excel-file` i punkt 3 — `qrcode-generator` har ingen
  afhængigheder overhovedet, mens `qrcode` trækker 29 pakker med sig
  (mest `yargs`, til en kommandolinje vi aldrig bruger). Den har desuden
  sin egen indbyggede, skalerbare SVG-eksport, så der var ikke engang
  brug for selv at tegne matrixen om til SVG.
- **QR-arket ligger under `/overblik/qr-ark`**, med `?hold=` eller
  `?spillerId=` — samme adgangsstyring (hold-scoping for holdleder) som
  resten af overblikket, ingen ny rolle eller adgangsmodel. Linket dukker
  op tre steder, der matcher kravspecifikationens egen rækkefølge
  (afsnit 5.3): efter en import, på spillerens egen side (fx efter en ny
  QR-kode er udstedt), og i overblikkets navigation for at finde et hold
  igen senere.

## Første rigtige test — hvad den fandt

Systemet er kørt for første gang mod en rigtig (gratis) Neon-database.
Rigtig import af testdata, rigtig scanning, rigtig sammenlægning af
søskende i én mail (afprøvet ved at kalde "Send påmindelse nu" og se
mail-rækken dukke op på begge børns sider, med samme tidsstempel og
modtager). Resend og MobilePay er stadig ikke forbundet til noget rigtigt,
så selve afsendelsen og betalingen er fortsat uprøvet — men alt det, en
database kunne afsløre, er nu afprøvet mod en rigtig database, ikke kun
tests.

Det fandt én rigtig fejl:

- **Hydration-mismatch på `/slib`.** `understoetterKamera` (om
  `BarcodeDetector` findes) blev sat med en lazy `useState`-initializer.
  Den kører på både server og klient, men de to miljøer regner reelt ud
  til to forskellige svar (serveren har intet `window`, den ender altid på
  `false`; en Chrome-baseret klient ender på `true`) — det er selve
  årsagen til React's hydration-fejl, ikke noget en lazy initializer kan
  løse. Rettet ved at gå tilbage til `useState(false)` (matcher serveren)
  og rette værdien i en `useEffect` efter mount, med en velbegrundet
  `eslint-disable` af `set-state-in-effect`-reglen på den ene linje — det
  er præcis den kendte, korrekte undtagelse fra reglen, ikke en genvej
  uden om den. Havde ikke vist sig i en type-check eller i en `next
  build`, kun ved rent faktisk at åbne siden i en browser.

**Rollernes forskelle er også afprøvet direkte**, ikke kun læst i koden: en
midlertidig holdleder-konto (kun rollen `holdleder`, kun tildelt U14) viste
sig at have præcis den begrænsede adgang, koden lover — ingen
"Adgangsstyring" eller "Download saldorapport" i navigationen, ingen
"Ret saldo"/"Registrér køb"/"Send påmindelse"/"Udsted ny QR"/"Spilleren
stopper" på en spillers side (kun "Voksne"-formularerne og historikken),
og `/overblik/adgang` sender én tilbage til `/overblik` i stedet for at
vise siden.

**En faldgrube ved lokal test, værd at kende:** service workeren fra
punkt 2 gemmer besøgte sider (stale-while-revalidate) — under denne test
blev det først forvekslet med en fejl i selve appen, fordi ændringer i
`layout.tsx` og `page.tsx` ikke slog igennem i browseren, selv efter en
genstart af `next dev`. Det var ikke Next.js eller Turbopack, det var
browserens egen cache, der gjorde sit arbejde efter hensigten. Rettet ved
at lade service workeren slet ikke registrere sig, når
`NODE_ENV === "development"` (`app/registrer-service-worker.tsx`) — ellers
ville enhver fremtidig frivillig ramme den samme forvirring, hver gang de
retter noget og ikke kan se det.

## Beslutninger undervejs — installerbar app

Efter ønske: systemet kan nu "Føjes til hjemmeskærmen" og åbner fuldskærm,
uden browserens adresselinje — særligt værd for sliberen, der åbner den
samme side igen og igen på sin egen telefon.

- **`app/manifest.ts`** er Next.js' egen fil-konvention for en Web App
  Manifest, ikke en håndskrevet `.json`-fil et sted i `public/` — Next
  server­erer den selv på `/manifest.webmanifest` og linker den i
  `<head>` uden at det skal gøres i hånden.
- **iOS bruger ikke manifestet** til ikon og fuldskærm, uanset hvor
  korrekt det er — det kræver sine egne meta-tags og en
  `apple-touch-icon`, sat i `app/layout.tsx`s `metadata`
  (`appleWebApp`, `icons.apple`). Begge dele er derfor sat op, ikke kun
  manifestet.
- **Ikonerne (`public/icon-*.png`, `apple-touch-icon.png`) er rastede fra
  `aaik-logo.svg` med `sharp`**, som allerede var installeret transitivt
  (formentlig via Next.js selv) — ikke tilføjet som en ny afhængighed i
  `package.json`, kun brugt én gang til at generere faste PNG-filer, der
  nu ligger som almindelige billeder i `public/`. De "maskable" varianter
  har hvid baggrund og luft rundt om logoet, så Android ikke beskærer det,
  når det lægges i en cirkel eller afrundet firkant.
- **Forsiden (`/`) er nu en omdirigering, ikke en tom side** — det er
  det, app-ikonet åbner, så det skal sende folk direkte til det, de
  faktisk skal bruge (`/overblik` for kasserer/holdleder/administrator,
  `/slib` for sliber), i stedet for en side uden noget på.

## Beslutninger undervejs — `/afprov-som`

Ønske: kunne vise systemet frem for bestyrelsen (forskellige roller,
inklusive sliberens scanner) uden at have en rigtig Resend-konto klar, og
uden at være afhængig af at jeg selv styrer en browser undervejs.

**Vigtigt: dette rører IKKE ved den rigtige login-metode.** Der var
tidligere en eksplicit diskussion om at erstatte det magiske mail-link med
brugernavn/adgangskode eller en fysisk QR-login i sliberummet —
beslutningen dengang var at beholde login som det var
(`lib/auth.ts`, Auth.js + Resend, uændret). `/afprov-som` er ikke det,
og er ikke en genvej uden om den beslutning: det er et ekstra,
udviklings­kun værktøj ved siden af, som findes for at kunne demonstrere
rollerne — den rigtige `/logind`-side virker present og uændret.

- **Hård spærring i `lib/udviklingsmiljoe.ts`**, checket både i
  `app/afprov-som/page.tsx` (kalder `notFound()`) og i hver server
  action i `app/afprov-som/actions.ts` (kaster en fejl). To steder med
  vilje — siden kan ikke vise formularen, og selv et direkte kald af en
  action uden om siden virker ikke, uanset hvordan nogen skulle finde
  frem til den. Slås fra så snart `NODE_ENV === "production"`, samme
  afgrænsning som service worker-undtagelsen fra punkt 2.
- **Faste, genbrugte prøvebrugere**, ikke opret-og-slet som det
  midlertidige `/api/demo-login-midlertidig`-mønster brugt undervejs i
  denne session. Adresserne (`afprov-<rolle>@lokal.afprovning`) findes
  ikke i nogen rigtig mailudbyder, og roller/navn opdateres ved hvert
  besøg (`upsert`), så værktøjet altid afspejler den nyeste kode.
- **Sætter sessionen på samme måde som Auth.js selv** —
  `prisma.session.create` plus `(await cookies()).set("authjs.session-token", …)`
  i en server action, samme cookie-navn og samme ét-års levetid som en
  rigtig session fra det magiske link. Ingen ny mekanisme, kun en anden
  vej til at oprette den samme slags session.
- **Holdleder-formularen henter hold fra de rigtige spillerdata**
  (`prisma.spiller.findMany({ distinct: ["hold"] })`), så en demo bruger
  et hold der faktisk har spillere og data at vise — falder tilbage til
  en fritekst-indtastning, hvis der endnu ikke er importeret noget.
- **"Alle roller på én gang"** findes til at vise administratorens fulde
  overblik uden at skulle klikke fire separate roller igennem.

Brug: åbn `http://localhost:3000/afprov-som` i egen browser, mens
`npm run dev` kører, og vælg en rolle. Værktøjet er ikke linket fra nogen
menu — det er en adresse man selv skal kende og skrive.

## Beslutninger undervejs — "kræver et kig" for holdleder

Ønske: holdlederen kan ikke selv rette saldi (kun kasserer/administrator
kan, se afsnit 4 og `lib/roller.ts`), så den fulde "bevægelser der kræver
et kig"-liste viste dem ting, de ikke kunne handle på (fx en
tvangsgennemtrukket spærretid). I stedet skal holdlederen kunne se hvilke
af deres spillere har lav saldo, så de kan rykke forældrene for et nyt
slibekort.

- **Filtreret på saldo (1 og under), og kontante betalinger er filtreret
  helt fra.** I `app/overblik/page.tsx` filtreres `flaggedeBevaegelser`
  til kun spillere med saldo ≤ 1, men **kun** når
  `!kanRetteSaldi(adgang.adgang)` — altså kun for holdleder, fordi det er
  den eneste rolle i `OVERBLIK_ROLLER`, der ikke opfylder
  `kanRetteSaldi`. Kasserer og administrator ser fortsat alle flagede
  bevægelser uanset saldo eller årsag, uændret fra før.
- **Kontant betaling registreret af kasseren vises aldrig for
  holdlederen**, selv hvis spillerens saldo i øvrigt er lav nok — det er
  allerede håndteret af kasseren, ikke noget holdlederen skal reagere på.
  Teksten er samlet i én konstant, `KONTANT_BETALING_NOTE`
  (`lib/overblik/noter.ts`), brugt både der hvor noten sættes
  (`registrerKoeb` i `app/overblik/actions.ts`) og der hvor den filtreres
  fra — så de to steder ikke kan komme til at afvige fra hinanden, hvis
  teksten en dag ændres.

## Beslutninger undervejs — import kun for kasserer/administrator

Ønske: holdlederen skal ikke kunne importere spillere til holdet. Dette
strammer punkt 3's oprindelige adgang (afsnit 5.3: "kasserer, holdleder
eller administrator") — en bevidst afvigelse fra kravspecifikationen efter
udtrykkeligt ønske, ikke en fejlrettelse.

- **Spærret tre steder, ikke kun ét** — samme "hver handling tjekker selv
  adgang"-mønster som resten af overblikket: `app/import/layout.tsx`
  (siden viser "Ingen adgang" i stedet for formularen),
  `app/api/import/forhaandsvisning/route.ts` og
  `app/api/import/bekraeft/route.ts` (begge afviser med 403, uanset om
  nogen skulle ramme dem uden om siden). Et layout alene ville kun skjule
  knappen, ikke reelt forhindre et direkte kald.
- **Genbruger `kanRetteSaldi`/`KAN_RETTE_SALDI_ROLLER`** (kasserer og
  administrator) i stedet for en ny rolle-liste specifikt til import — det
  er allerede præcis det samme sæt roller, ingen grund til en ekstra
  konstant der kan komme til at afvige fra den første.
- **"Importér hold"-linket i `/overblik`s navigation** er nu betinget af
  `kanRetteSaldi(adgang.adgang)`, samme betingelse som
  "Download saldorapport" ved siden af — holdlederen ser slet ikke
  knappen, ikke bare en fejl hvis de trykker på den.
- Holdlederen beholder uændret sin eksisterende adgang til at rette
  kontaktoplysninger for spillere på egne hold — kun selve importen af nye
  spillere er fjernet.
- **Saldoen slås op i den allerede hentede `spillere`-liste**
  (`saldoById`, en `Map` fra spiller-id til saldo), ikke en ny
  databaseforespørgsel — den liste er allerede afgrænset til aktive
  spillere og (for holdleder) egne hold, så ingen ekstra hold-tjek er
  nødvendigt her.
- Stat-kortet "Kræver et kig" øverst tæller den samme, allerede filtrerede
  liste, så tallet stemmer overens med listen nedenunder for begge
  rollegrupper.

## Datamodel

Saldoen er **ikke** et felt der rettes i. Den er summen af rækker i
`bevaegelser`. Enhver ændring er en ny række, aldrig en opdatering.
Det er det, der gør fejl sporbare og penge til at stole på.

Hver scanning bærer et `klient_id` fra telefonen. Serveren afviser en
gentagelse med samme id. Uden det tæller en genafsendt offline-scanning
dobbelt.

Tabeller: `spillere`, `voksne`, `relationer`, `bevaegelser`, `betalinger`,
`mails`. Felter står i kravspecifikationen, afsnit 6.

Dertil `brugere` (personale med login og roller), `bruger_hold`
(holdlederens adgang til bestemte hold) og Auth.js' egne tabeller (`users`,
`accounts`, `sessions`, `verification_tokens`) — se "Beslutninger undervejs"
ovenfor for hvorfor de ikke står i kravspecifikationen.

## Data vi aldrig gemmer

Fra Holdsport-eksporten læses kun navn og kontaktoplysninger.

Aldrig i databasen: fødselsdato, alder, køn, adresse, postnummer, by,
brugernavn, medlemsnummer, trøjenummer, skabsnummer.

Det er børns data. Hvert felt vi ikke gemmer, er et felt vi ikke skal
beskytte, slette eller forklare.

**Oplysningspligten (afsnit 11) er udkastet, ikke publiceret endnu.**
Teksten til forældrene — hvad vi registrerer, hvorfor, og hvor længe —
er skrevet og ligger uden for dette repo, klar til at blive sat ind som
en side på aaik.dk (WordPress-siden røres jo ikke af selve systemet).
Husk at få den sat op, og at bekræfte at der er indgået
databehandleraftaler med hosting-, database- og mailudbyder samt
MobilePay, før den publiceres — det sidste kan koden ikke selv bekræfte.

## Import

Kilden er Holdsports **xlsx**-eksport, én fil pr. hold, én række pr.
spiller. `#12` i efternavnet fjernes og kasseres. `E-mail 2` bruges kun,
når den er forskellig fra `E-mail`.

`scripts/importtjek.py` gør allerede dette og skriver en rapport over det,
holdlederen skal rette. Genbrug logikken derfra frem for at skrive den om.

Ingen import må gennemføres uden en kvitteringsskærm, holdlederen godkender.

## Test

Det her skal have rigtige tests, ikke fordi projektet er stort, men fordi
ingen opdager en forkert saldo før måneder senere:

- Saldoberegning fra bevægelser.
- Dobbeltscanning afvises på `klient_id`.
- Webhook fra MobilePay behandles kun én gang.
- Fortryd ruller både saldo og eventuel udsendt mail tilbage.
- Import af den samme fil to gange ændrer ingen saldi.

## Miljøvariabler

Ingen nøgler i repoet. `.env.example` holdes opdateret med navnene.
MobilePay-nøgler hentes i forhandlerportalen under klubbens salgsenhed.

## Rækkefølge

Byg mod MobilePays testmiljø. Godkendelsen af de rigtige nøgler tager tid
og skal ikke blokere resten.

1. ✅ Datamodel og saldoberegning med tests.
2. ✅ Scannerside med bekræftelse, fortryd og offline-kø.
3. ✅ Import fra xlsx med kvitteringsskærm.
4. ✅ Kassererens overblik.
5. ✅ Mails.
6. ✅ Betaling og webhook.
7. ✅ QR-ark til print.

Al kode er skrevet. Ingen af de syv punkter er afprøvet mod rigtig,
kørende infrastruktur — der har ikke været en Postgres, en Resend-konto
eller en MobilePay-konto (end ikke sandkassen) tilgængelig undervejs. Det
der kunne verificeres uden dem, er verificeret: alle regler der er pure
funktioner har tests (saldo, spærretider, mailudvælgelse,
webhook-signaturen mod MobilePays eget dokumenterede regneeksempel), og
build/typecheck/lint er kørt grønt efter hvert punkt. Før nogen forælder
eller sliber ser systemet:

1. Opret de rigtige kontier (afsnit 12) og sæt `.env` op for rigtigt.
2. `npx prisma migrate dev` mod en rigtig Postgres.
3. `npm run brugere:opret` for den første administrator, log ind, brug
   `/overblik/adgang` til resten.
4. Importér ét hold, print QR-arket, gennemfør én rigtig slibning på en
   rigtig telefon.
5. `npm run mobilepay:webhook -- <url>`, og gennemfør én rigtig betaling i
   MobilePays testmiljø — det er det ene stykke, kildekoden alene ikke kan
   bevise virker.

## Beslutninger undervejs — `/overblik/systemtjek`

Ønske: den frivillige, der vedligeholder systemet alene, skal selv kunne
se om Resend, MobilePay og databasen er sat rigtigt op i `.env` — uden at
skulle spørge en udvikler eller vente på en kryptisk fejlbesked fra en
rigtig sliber/forælder.

- **Viser kun om en variabel er sat, aldrig dens værdi, for alt der er
  en hemmelighed** (API-nøgler, `AUTH_SECRET`, `MOBILEPAY_CLIENT_SECRET`
  osv.) — siden må ikke selv blive en vej til at læse en hemmelighed af.
  De få værdier der faktisk vises (`APP_URL`, `RESEND_FROM`,
  `KASSERER_KONTAKT_EMAIL`, `MOBILEPAY_API_BASE_URL`, `NODE_ENV`) er ikke
  hemmelige — det er adresser og indstillinger, og at kunne se dem er
  præcis pointen (fx at opdage at `APP_URL` stadig peger på `localhost`,
  eller at `RESEND_FROM` har et forkert domæne).
- **Administrator-only**, samme gating-mønster som `/overblik/adgang`
  (`kanAdministrereBrugere`, redirect til `/overblik` ellers) — dette er
  drift/opsætning, ikke noget kasserer eller holdleder har brug for.
- **Databasen tjekkes reelt** (`SELECT 1`), ikke kun om `DATABASE_URL` er
  sat — en sat men forkert forbindelsesstreng skal også vise sig som
  "Fejler", ikke som "Sat op".
- Ingen ny afhængighed, ingen live-kald til Resend eller MobilePay for at
  bekræfte at nøglerne faktisk virker (kun at de er sat) — en dybere
  kontrol ville kræve bredere API-rettigheder end den bevidst
  begrænsede "Sending access"-nøgle, vi bad om hos Resend.

## Beslutninger undervejs — enkelt slibning til 40 kr.

Ønske: klubben tager slet ikke imod kontanter, så den oprindelige plan i
kravspecifikationens afsnit 3 — en enkelt slibning købes "uden for
systemet" ved en selvstændig, uregistreret MobilePay-boks ved maskinen,
50 kr., ikke registreret nogen steder — er ikke længere en mulighed.
Punktet stod også i afsnit 13 som bevidst udeladt af version 1
("Registrering af enkeltslibninger"). Begge dele er nu ændret efter
udtrykkeligt ønske: enkeltkøbet er bragt ind i systemet, til 40 kr.

- **Genbruger hele betalingsvejen fra punkt 6**, ikke en ny mekanisme —
  samme `/betal/[qrToken]`-side (stadig uden login, afsnit 10), samme
  MobilePay-integration, samme webhook-kreditering. Siden viser nu to
  formularer i stedet for én: den vante 10-for-300 og den nye 1-for-40.
- **Klienten sender aldrig et beløb, kun et pakke-id** (`"standard"`
  eller `"enkelt"`). `hentPakke` i `lib/betaling/konstanter.ts` er den
  ene kilde til hvad de to id'er reelt koster — en manipuleret formular
  kan højst bede om en af de to rigtige pakker, aldrig et selvvalgt
  beløb. Det er den samme forsigtighed som allerede fandtes omkring
  betalinger, nu bare med to gyldige pakker i stedet for én.
- **Prisen pr. slibning er bevidst højere end ved opfyldning** (40 kr.
  mod 30 kr.) — bulk-købet skal stadig være det oplagte valg, enkeltkøbet
  er til situationen "mangler kun til én gang lige nu."
- **Ingen ændring af påmindelsesmailen** — den nævner stadig kun
  10-for-300 (`lib/mails/skabeloner.ts`), fordi det er det rigtige valg
  at pege forældre imod ved en almindelig påmindelse. Enkeltkøbet findes
  kun på selve betalingssiden, til den der har brug for det med det
  samme.
- **Kravspecifikationen er opdateret** (afsnit 3 og 13), så den ikke
  længere modsiger det, der reelt er bygget.

## Beslutninger undervejs — engangsslibning (motionister m.fl.)

Ønske: en spiller, der ikke optræder i det almindelige holdsystem (typisk
en motionist, der kommer forbi en gang imellem), skal kunne slibe og
betale med MobilePay på stedet — uden at skulle importeres via Holdsport,
og uden at klubben nogensinde tager imod kontanter (heller ikke hos
kasserer, se afsnit 3 og 9).

**Kasserens gamle "Registrér kontant køb" er fjernet helt, ikke
omdøbt** (`registrerKoeb` i `app/overblik/actions.ts`, formularen på
spillerens side, og noten "Kontant betaling registreret af kasserer") —
den gav ikke længere mening. Ingen erstatning i overblikket; en manuel
kredit uden om MobilePay sker via "Ret saldo", som allerede findes.

**Den endelige løsning, efter et par forsøg undervejs, er den kedeligst
mulige: genbrug betalingsvejen fra punkt 6/7 fuldstændig uændret, tilføj
kun én delt spiller.**

- **Én permanent, delt spiller-række, "Engangsslibning"**
  (`lib/spillere/engangsslibning.ts`, navn og hold begge sat til samme
  værdi), oprettet med `npm run engangsslibning:opret`
  (`scripts/engangsslibning-opret.mjs`, samme mønster som
  `brugere:opret`). QR-koden printes én gang via den eksisterende
  `/overblik/qr-ark?spillerId=`-side og hænges op i sliberummet, hvor
  den bruges igen og igen af forskellige personer.
- **Sådan betales der:** personen scanner selv den printede kode med sin
  egen telefon og lander på den almindelige, login-fri betalingsside
  (`/betal/[qrToken]`) — vælger "1 slibning – 40 kr." og betaler med en
  rigtig MobilePay-transaktion, akkurat som en forælder der fylder op.
  Saldoen krediteres automatisk af webhooken.
- **Sådan slibes der:** sliberen scanner bagefter samme kode i sin egen
  app og trykker det helt almindelige "Træk 1 slibning" — præcis som med
  enhver anden spiller. **Ingen ny handling på sliberens skærm.** Et
  tidligere forsøg byggede en dedikeret "Betal og slib nu"-knap til at
  registrere en betaling foretaget direkte til sliberen (uden om
  MobilePay); den er fjernet igen — vi går udelukkende med vejen ovenfor,
  hvor betalingen altid går gennem den rigtige MobilePay-integration.
- **Udeladt fra alt hold-baseret**, ikke skjult med CSS: den almindelige
  spillerliste og hold-optælling i `/overblik`, hold-listen på
  `/overblik/qr-ark`, og saldorapportens CSV
  (`/api/overblik/rapport`) filtrerer alle eksplicit
  `hold: { not: ENGANGSSLIBNING_HOLD }`. Ingen `voksne`-relation, altså
  ingen mailpåmindelser nogensinde — korrekt, for saldoen står aldrig og
  venter på nogen.
- **Et direkte link i overblikkets navigation** ("Engangsslibning", kun
  for `kanRetteSaldi`) peger på dens egen side
  (`/overblik/spillere/<id>`), fundet ved et separat opslag på det
  reserverede hold-navn — nødvendigt, netop fordi den ikke står i den
  almindelige liste man ellers ville klikke sig ind fra. Findes den ikke
  (scriptet aldrig kørt), vises linket bare ikke — ingen fejl.
- **Et statistik-kort ("Engangsslibninger") i `/overblik`**, ved siden af
  Spillere/Hold/Kræver et kig, viser antallet af `type: "slibning"`-
  bevægelser på dens spiller-id — ikke saldoen, som altid ender i 0 (købt
  og trukket er to adskilte bevægelser, ligesom alle andre steder i
  systemet, jf. afsnit 6), og derfor intet fortæller om, hvor meget koden
  reelt bruges.

## Beslutninger undervejs — saldorapport pr. hold og som Excel

Ønske: kunne downloade saldorapporten for ét hold (eller engangsslibning)
ad gangen, ikke kun alle hold samlet, og som en rigtig Excel-fil, ikke CSV.

- **`write-excel-file` er den nye afhængighed**, ikke `exceljs` eller
  `xlsx` (SheetJS) — samme afvejning som `read-excel-file`, der allerede
  bruges til import (punkt 3), og fra samme forfatter: den har præcis én
  afhængighed (`fflate`, til selve zip-formatet en `.xlsx`-fil er), mod
  et halvt hundrede for `exceljs`. `xlsx` er droppet af samme grund som
  tidligere — den vedligeholdte udgave distribueres ikke længere via npm.
  Skriver direkte til en `Buffer` (`.toBuffer()`), ingen midlertidig fil
  på disken.
- **Ny side, `/overblik/rapport`**, samme mønster som `/overblik/qr-ark`:
  lister hvert hold (undtagen Engangsslibning, af samme grund som den er
  udeladt fra selve spillerlisten) plus "Alle hold samlet" og, hvis den
  findes, "Engangsslibning" — hver et separat download-link til
  `/api/overblik/rapport`, nu med et valgfrit `?hold=`.
- **`?hold=Engangsslibning` virker**, selvom Engangsslibning er udeladt
  fra *listen* af valgbare hold — samme princip som `?spillerId=` på
  QR-ark-siden: en eksplicit forespørgsel efter noget bestemt er noget
  andet end en oversigt over hvad der findes at vælge imellem. Uden
  `?hold=` er den fortsat udeladt fra den samlede rapport, som den var
  før.
- **`/api/overblik/rapport` er selv adgangs­styret uafhængigt af siden**,
  ligesom alle andre steder i overblikket — samme `kraevOverblikAdgang`
  plus `kanRetteSaldi`/`kanSeHold`-tjek som før, blot nu med `?hold=` som
  endnu en ting at validere en holdleder ikke skulle kunne omgå (ikke at
  det er muligt for dem at nå ruten i første omgang, `kanRetteSaldi`
  stopper dem allerede).
