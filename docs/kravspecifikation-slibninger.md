# Kravspecifikation — digitalt slibekort

**Aalborg Ishockey Klub**
Version 1.8 · klar til udvikling

---

## 1. Formål

Klubben tilbyder skøjteslibning mod betaling. I dag foregår det med papklippekort, som skal tælles i hånden, bliver væk og ikke giver noget overblik over, hvem der har betalt.

Systemet her erstatter papkortet med en digital saldo pr. spiller. Skøjtesliberen scanner en QR-kode, saldoen trækkes automatisk, og forældrene får selv besked, når kortet skal fyldes op — med et betalingslink, de kan trykke på med det samme.

Målet er ikke flest mulige funktioner. Målet er, at ordningen kan køre uden at nogen frivillig skal huske noget.

### Sådan måler vi, om det virker

- Skøjtesliberen bruger under 10 sekunder pr. spiller.
- Kassereren bruger under 30 minutter om måneden på ordningen.
- Ingen bliver afvist ved slibemaskinen, fordi et system siger nej.

---

## 2. Begreber

| Ord | Betydning |
|---|---|
| **Slibning** | Én slibning af ét par skøjter. Enheden systemet tæller i. |
| **Slibekort** | Navnet på ordningen. Kortet er en saldo, ikke et fysisk kort. |
| **Saldo** | Antal resterende slibninger for en spiller. Kan gå i minus. |
| **Opfyldning** | Køb af 10 slibninger. |

Ordet **slibninger** bruges konsekvent i appen, i mails og i al kommunikation. Ordet *klip* bruges ikke.

---

## 3. Priser og regler

| Regel | Værdi |
|---|---|
| Enkelt slibning (gennem systemet) | 40 kr. |
| Opfyldning | 10 slibninger for 300 kr. — 30 kr. pr. slibning |
| Laveste tilladte saldo | −2 slibninger |
| Spærring mod dobbeltscanning | 60 minutter pr. spiller |
| Fortrydelsesvindue for skøjtesliberen | 10 sekunder |
| Advarsel til forældre | Når saldoen rammer 1 |
| Rykker til forældre | Når saldoen rammer 0 og igen ved −2 |
| Refusion ved udmeldelse | Nej. Saldoen kan flyttes til en søskende i klubben |
| Overførsel mellem sæsoner | Ubrugte slibninger følger med til næste sæson |
| Transaktionsgebyr | Bæres af klubben |

**Ændret efter opstart:** klubben tager ikke imod kontanter, så planen om
en selvstændig, uregistreret MobilePay-boks ved maskinen er droppet.
Enkeltslibninger købes i stedet gennem systemet, til 40 kr. (ikke 50 kr.
som oprindeligt), på samme side som den almindelige opfyldning
(`/betal/[qrToken]`), uden login — se CLAUDE.md.

---

## 4. Roller

| Rolle | Kan | Kan ikke |
|---|---|---|
| **Skøjtesliber** | Scanne, trække en slibning, fortryde inden for 10 sek., se en spillers saldo | Rette saldi, se mails, se kontaktoplysninger ud over fornavne |
| **Kasserer** | Alt i overblikket: rette saldi, sende påmindelser, trække rapporter | Ændre systemets opsætning |
| **Holdleder** | Se sit eget holds saldi, rette forældreoplysninger på eget hold | Rette saldi, se andre hold |
| **Forælder** | Se sit barns saldo og historik, købe opfyldning, rette egen mailadresse | Se andre spillere |
| **Administrator** | Alt, inklusive brugeradgang og opsætning | — |

Rollerne skal kunne kombineres. Den samme person er ofte både kasserer og administrator.

Holdledere skiftes ud løbende. Der skal derfor være en fast rutine: når en holdleder stopper, fjernes adgangen samme dag. Overblikket skal vise, hvem der har adgang til hvilke hold, så det kan kontrolleres en gang om året uden at grave i databasen.

---

## 5. Brugerrejser

### 5.1 En slibning

1. Sliberen åbner appen på sin telefon. Han er logget ind permanent på den enhed.
2. Han holder kameraet over spillerens QR-kode.
3. Bekræftelsesskærmen viser navn, holdnavn og nuværende saldo.
4. Han trykker **Træk 1 slibning**.
5. Kvitteringen viser den nye saldo, og en **Fortryd**-knap er aktiv i 10 sekunder.
6. Han trykker **Næste spiller** og er tilbage i scanneren.

Trykker han i stedet **Forkert spiller** på bekræftelsesskærmen, sker der ingenting, og han er tilbage i scanneren.

### 5.2 Forældrene fylder op

1. Saldoen rammer 1. Systemet sender straks en mail til spillerens mailadresser.
2. Mailen indeholder barnets navn, saldoen og en knap: **Betal med MobilePay**.
3. Knappen fører til en betalingsside. Forælderen skal ikke logge ind.
4. Efter godkendt betaling lægges 10 slibninger til saldoen med det samme, og der sendes en kvittering.

### 5.3 En ny spiller

1. Holdleder eller kasserer opretter spilleren, eller importerer holdet fra en CSV-fil eksporteret fra Holdsport.
2. Systemet danner en QR-kode.
3. Holdlederen printer arket og klipper koden ud til skøjteposen.

### 5.4 Import fra Holdsport

Holdsport kan eksportere et hold i to formater. **Brug xlsx-eksporten.** Den indeholder én række pr. spiller med to sæt kontaktoplysninger — `E-mail`/`Mobil` og `E-mail 2`/`Mobil 2` — altså den kobling mellem barn og voksen, systemet har brug for. CSV-eksporten er en flad liste, hvor spillere, trænere, holdledere og forældre står blandet, uden nogen kobling mellem dem.

Xlsx-filen indeholder ikke de voksnes navne, kun deres kontaktoplysninger. Det er tilstrækkeligt. Mailen handler om barnet og fungerer fint uden en navnehilsen, og navnet er et valgfrit felt, forælderen selv kan udfylde, første gang han eller hun åbner betalingslinket. Klubben skal altså kun eksportere én fil pr. hold.

**Sådan læses xlsx-filen:**

| Felt i systemet | Hentes fra | Bemærkning |
|---|---|---|
| Spillerens navn | `Fornavn` + `Efternavn` | `#12` fjernes fra efternavnet og kasseres |
| Primær voksen | `E-mail`, `Mobil` | |
| Alternativ voksen | `E-mail 2`, `Mobil 2` | Bruges kun hvis adressen er forskellig fra den primære |
| Voksnes navne | Ikke i eksporten | Valgfrit felt. Kan udfyldes af forælderen selv |

**Felter der ikke læses:** fødselsdato, alder, køn, adresse, postnummer, by, brugernavn, medlemsnummer, trøjenummer, klubmarkering, skabsnummer, sidste login. Slibesystemet har ingen brug for dem, og de gemmes ikke.

**Importen skal vise en kvitteringsskærm** før noget gemmes, med en optælling af spillere og en liste over det, der mangler. Holdlederen godkender. Ingen import må gennemføres blindt.

**Dubletter:** ved gentagen import af samme hold opdateres eksisterende spillere. Saldi og historik røres aldrig af en import.

**Spillere der rykker op en årgang** (fx fra U14 til U16 ved sæsonskifte) genkendes automatisk, når det nye holds fil importeres — forudsat mindst én af de indtastede mailadresser går igen fra den forælderkontakt, spilleren allerede havde. Saldo, historik og QR-kode følger med uændret, som beskrevet i afsnit 7. Er der intet fælles at genkende spilleren på (ny mailadresse, eller slet ingen), oprettes en ny spiller som normalt, med en bemærkning om at det er værd at tjekke.

### 5.5 En spiller stopper

Kassereren markerer spilleren som inaktiv. Spilleren forsvinder fra listerne, men historikken bevares af hensyn til regnskabet. Se afsnit 11 om sletning.

Der refunderes ikke for ubrugte slibninger. Det skal fremgå af den tekst, forældrene ser, inden de betaler — ikke først når de spørger.

Har spilleren en søskende i klubben, kan kassereren flytte den resterende saldo over på søskendet. Systemet genkender søskende på, at de deler mindst én voksen — den relation findes allerede i datamodellen. Flytningen registreres som to bevægelser, et træk og en tilførsel, så det samlede antal slibninger i omløb er uændret.

---

## 6. Datamodel

**spillere**
`id`, `navn`, `hold`, `qr_token`, `aktiv`, `oprettet`

**voksne**
`id`, `navn` (valgfrit), `email`, `telefon`, `email_bekraeftet`

**relationer**
`spiller_id`, `voksen_id`, `modtager_mails`

En spiller kan have flere voksne. En voksen kan have flere børn i klubben — søskende skal ikke give dobbelte mails, hvis begge har lav saldo samtidig.

**bevaegelser**
`id`, `spiller_id`, `type` (slibning / koeb / rettelse / fortrudt), `antal`, `tidspunkt`, `udfoert_af`, `note`, `klient_id`

Saldoen gemmes ikke som et felt, der rettes i. Den beregnes som summen af bevægelser, eller vedligeholdes som en cache der altid kan genberegnes. Det gør systemet muligt at revidere, og det gør enhver fejl mulig at spore.

`klient_id` er en unik nøgle, telefonen danner ved hver scanning. Den forhindrer, at en scanning tælles to gange, hvis telefonen sender den igen efter dårligt netværk.

**betalinger**
`id`, `spiller_id`, `beloeb`, `antal_slibninger`, `udbyder_reference`, `status`, `tidspunkt`

**mails**
`id`, `spiller_id`, `type`, `sendt_til`, `tidspunkt`, `leveringsstatus`

---

## 7. Kantsituationer

Det er her systemet enten holder eller går i stykker. Hver situation skal have et defineret svar.

| Situation | Systemets svar |
|---|---|
| Samme spiller scannes to gange inden for 60 min. | Advarsel med tidspunktet for sidste slibning. Sliberen kan trykke **Træk alligevel** — det logges som manuelt godkendt. |
| Saldoen er 0 eller lavere | Slibningen gennemføres og saldoen går i minus, indtil −2. Forældrene får rykker. |
| Saldoen er −2 | Sliberen får besked om at slibe alligevel og give kassereren besked. Trækket kan gennemtvinges og logges. |
| Ingen netværksforbindelse | Scanningen gemmes lokalt på telefonen og sendes, når forbindelsen er tilbage. Sliberen mærker ingen forskel. |
| Forkert spiller scannet, opdaget inden bekræftelse | **Forkert spiller** annullerer uden at røre saldoen. |
| Forkert spiller scannet, opdaget efter bekræftelse | **Fortryd** i 10 sekunder. Derefter kan kassereren rette det inden for 24 timer. |
| To forskellige mailadresser på samme barn | Begge får mailen. Betaler den ene, får den anden en kvittering, ikke en ny rykker. |
| Alternativ mail er identisk med den primære | Den ignoreres. Der sendes én mail, ikke to. |
| Søskende med lav saldo samme dag | Én samlet mail til den voksne med begge børn. |
| Betalingen fejler undervejs | Saldoen ændres først, når betalingen er bekræftet. En afbrudt betaling gør ingenting. |
| Forælderen betaler to gange | Begge betalinger registreres. Kassereren får en advarsel om mulig dobbeltbetaling. |
| Spilleren skifter hold (fx midt i sæsonen, eller rykker op en årgang ved sæsonskifte) | Saldoen følger spilleren. QR-koden er uændret. Genkendes automatisk ved import, når en fælles forældrekontakt bekræfter det er samme spiller — se afsnit 5.4. |
| Spilleren stopper med saldo tilbage | Har spilleren en søskende i klubben, tilbyder overblikket kassereren at flytte saldoen. Ellers bortfalder den. |
| QR-koden bliver væk | Kassereren udsteder en ny. Den gamle gøres ugyldig. |
| Nogen fotograferer en QR-kode | Uden sliberens login kan koden kun vise saldoen — ikke trække noget. |

---

## 8. Mails

Tre mails, ikke flere. Hver mail har ét formål og én knap.

### 8.1 Sidste slibning tilbage

> **Emne:** [Fornavn] har 1 slibning tilbage
>
> Hej [voksnes fornavn, hvis kendt — ellers bare "Hej"]
>
> [Fornavn] har 1 slibning tilbage på slibekortet. Fyld op nu, så er skøjterne klar til næste træning.
>
> **10 slibninger — 300 kr.**
> [Betal med MobilePay]
>
> Linket åbner MobilePay, og kortet fyldes op med det samme.
>
> Ser noget forkert ud — fx hvis [Fornavn] ikke har fået slebet skøjter så mange gange, som kortet viser — så skriv til [kassererens mail].
>
> Aalborg Ishockey Klub

### 8.2 Kortet er brugt op

Samme opbygning. Teksten skal gøre det tydeligt, at barnet stadig får slebet skøjter — ingen forælder skal frygte, at barnet bliver afvist ved maskinen.

### 8.3 Kvittering

Sendes efter betaling. Indeholder beløb, antal slibninger, ny saldo og dato. Fungerer som forældrenes dokumentation.

**Modtagere:** den primære mailadresse, plus den alternative hvis den er en anden. Er de to adresser ens, sendes kun én mail. Den alternative adresse findes typisk, hvor forældrene ikke bor sammen, og begge husstande har brug for beskeden — den er derfor en ekstra modtager, ikke en reserve, der først bruges hvis den første fejler. En reserveløsning ville i praksis aldrig træde i kraft, fordi en mail sjældent melder tilbage, at den ikke er læst.

**Regler for udsendelse:** maksimalt én påmindelse pr. spiller pr. 48 timer. Mails sendes fra klubbens eget domæne med SPF og DKIM opsat, ellers havner de i spam og hele automatikken er værdiløs.

---

## 9. Betaling

**Løsning:** MobilePay direkte, via Vipps MobilePays **ePayment API** på klubbens egen forhandleraftale. Ingen mellemmand.

- Forælderen trykker på knappen i mailen og lander på en betalingsside oprettet til netop den spiller.
- Betalingen godkendes i MobilePay-appen.
- MobilePay sender en webhook tilbage til systemet, som lægger 10 slibninger til saldoen.
- Webhooken behandles kun én gang, uanset hvor mange gange den sendes. Betalingens reference gemmes og bruges som nøgle.

**Forudsætning:** aftalen skal omfatte produktet *Payment integration*. En almindelig MobilePay-boks eller MyShop er ikke nok — de sender ingen besked tilbage, og så skal indbetalinger parres med spillere i hånden. API-nøgler hentes i forhandlerportalen under klubbens salgsenhed.

**Omkostning:** afhænger af klubbens aftale, typisk omkring 1% af beløbet. Ingen fast månedlig gateway-udgift. Klubben bærer gebyret, jf. afsnit 14.

**Fordel ved at gå direkte:** pengene går uden mellemled til klubbens konto, og den samme platform kan senere levere faste betalingsaftaler, hvis klubben på et tidspunkt vil have optankning helt uden forældrenes medvirken. Det er ikke med i version 1.

**Hvis betalingen fejler:** saldoen ændres først, når webhooken er modtaget og verificeret. En afbrudt eller afvist betaling ændrer ingenting.

**Kontanter tages ikke imod.** En spiller, der mangler slibninger og ikke
kan vente på en fuld opfyldning, betaler i stedet med det samme via
MobilePay for én slibning til 40 kr. — nøjagtig samme betalingsside som en
almindelig opfyldning, se afsnit 3. Sliberen trækker slibningen bagefter
helt almindeligt, som enhver anden scanning.

**Motionister og andre uden for det almindelige holdsystem** (personer,
der aldrig importeres via Holdsport) kan også slibe og betale på denne
måde. De scanner en fast, delt QR-kode ophængt i sliberummet i stedet for
en personlig kode på en skøjtepose — se CLAUDE.md for hvordan den
oprettes.

## 10. Sikkerhed

- QR-koden indeholder udelukkende en tilfældig, ikke-gættelig nøgle. Ikke navn, ikke fødselsdato, ikke løbenummer.
- Åbnes en QR-kode uden sliberens login, vises kun saldoen og en knap til at fylde op. Der kan ikke trækkes noget.
- Sliberens telefon logges ind én gang og forbliver logget ind. Adgangen kan tilbagekaldes fra overblikket, hvis telefonen bortkommer.
- Kasserer og administrator logger ind med engangslink pr. mail. Ingen adgangskoder at glemme eller genbruge.
- Betalingsoplysninger passerer aldrig gennem systemet. MobilePay håndterer dem.
- Systemet ligger på et selvstændigt subdomæne, adskilt fra klubbens WordPress-site.

---

## 11. Persondata

Klubben er dataansvarlig. Følgende gælder:

**Vi gemmer:** spillerens navn og holdnavn. De voksnes mailadresse, eventuelt telefonnummer og navn, hvis de selv angiver det. Historikken over slibninger og betalinger.

**Vi gemmer ikke:** fødselsdato, adresse, cpr-nummer, billeder eller noget om helbred.

**Databehandlere:** hosting, database, mailudsender og MobilePay. Der skal indgås databehandleraftale med hver, og data skal ligge i EU. Vælg EU-region aktivt ved oprettelsen — flere udbydere står som standard på USA.

**Sletning:** spillere slettes 12 måneder efter, at de er markeret inaktive. Betalingsbilag opbevares dog i 5 år efter bogføringsloven og gemmes adskilt fra kontaktoplysningerne.

**Oplysningspligt:** forældrene skal ved opstart have en kort besked om, hvad der registreres, hvorfor, og hvem de kan kontakte. En halv side på hjemmesiden er nok.

---

## 12. Drift

### Konti klubben skal oprette

Alle i klubbens navn. Kassereren og web-administratoren har begge fuld adgang. Ingen personlige konti.

| Hvad | Formål | Bemærkning |
|---|---|---|
| Vipps MobilePay | Betaling | Produktet *Payment integration* tilføjes klubbens eksisterende aftale |
| Hostingplatform | Kører appen | Fx Vercel eller Render |
| Database | Gemmer data | EU-region skal vælges aktivt |
| Mailudsender | Sender påmindelser | Fx Resend eller Postmark |
| GitHub-organisation | Opbevarer koden | Så klubben ejer kildekoden |
| Adgangskodeboks | Deler adgange | Fx Bitwarden |

**Subdomæne:** oprettes i one.coms kontrolpanel og peges med en CNAME til hostingplatformen. WordPress-sitet røres ikke.

**Løbende omkostning:** anslået 50-100 kr. om måneden ved klubbens størrelse, ud over transaktionsgebyrerne.

### Årshjul

- **Sæsonstart:** importér holdlisterne, print nye QR-ark til nye spillere.
- **Sæsonslut:** kassereren trækker en rapport over resterende saldi. Beløbet er forudbetalt af forældrene og skal fremgå som en forpligtelse i regnskabet.

---

## 13. Ikke med i version 1

Bevidst udeladt for at få noget i luften:

- App i App Store og Google Play. Systemet er en hjemmeside, der kan lægges på telefonens hjemmeskærm.
- SMS-påmindelser.
- Automatisk synkronisering med Holdsport. Version 1 bruger CSV-import.
- Faste betalingsaftaler.
- Statistik ud over det, kassereren har brug for.

~~Registrering af enkeltslibninger til 50 kr.~~ — ændret efter opstart,
se afsnit 3: klubben tager ikke imod kontanter, så enkeltslibninger
registreres nu gennem systemet, til 40 kr.

---

## 14. Trufne beslutninger

Besluttet af bestyrelsen. Indarbejdet i afsnittene ovenfor.

1. **Refusion ved udmeldelse:** der refunderes ikke.
2. **Overførsel mellem sæsoner:** ubrugte slibninger følger med til næste sæson.
3. **Transaktionsgebyr:** bæres af klubben.
4. **Fuld adgang:** kassereren og web-administratoren.
5. **Holdledere:** får adgang til eget hold og kan rette forældreoplysninger på det hold.
6. **Laveste saldo:** −2 slibninger.
7. **Søskende:** stopper et barn med ubrugte slibninger, kan saldoen flyttes til en søskende i klubben.

Alle beslutninger er truffet. Eneste udestående er valget af betalingsløsning, se afsnit 9.

## 15. Næste skridt

Bestyrelsens beslutninger er truffet, og betalingsløsningen er valgt. Rækkefølgen herfra:

1. **Bestil MobilePay-produktet først.** Godkendelsen af *Payment integration* på forhandleraftalen tager tid og er den eneste opgave, klubben ikke selv styrer tempoet på. Alt andet kan gøres på en eftermiddag.
2. **Opret de øvrige konti** i afsnit 12. Vælg EU-region ved database og mailudsender.
3. **Byg systemet** mod MobilePays testmiljø. Hele flowet kan færdiggøres og testes, inden de rigtige nøgler er godkendt.
4. **Ryd op i Holdsport** — de fire bemærkninger på U14 og tilsvarende på de øvrige hold.
5. **Kør ét hold i en måned** med rigtige spillere og rigtige betalinger.
6. **Rul ud til resten** ved sæsonstart.
