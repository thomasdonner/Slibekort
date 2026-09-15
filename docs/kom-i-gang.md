# Kom i gang i Claude Code

## 1. Installér

Kræver en betalt Claude-plan. På Mac, Linux eller WSL:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

På Windows findes en WinGet-pakke. Vil du helt uden om terminalen, kan
Claude Code også bruges i desktop-appen.

## 2. Opret mappen

```bash
mkdir slibninger && cd slibninger
git init
mkdir -p docs scripts
```

## 3. Læg filerne på plads

| Fil | Placering |
|---|---|
| `CLAUDE.md` | i roden |
| `kravspecifikation-slibninger.md` | `docs/` |
| `importtjek.py` | `scripts/` |
| `slibekort-prototype.jsx` | `docs/` — som reference, ikke kode der skal bruges |

Læg **ikke** `import-U14.csv` eller `rapport-U14.txt` i repoet. De
indeholder rigtige mailadresser på forældre og har ikke noget i en
kodebase at gøre.

Opret en `.gitignore` med mindst `.env`, `*.csv` og `rapport-*.txt`.

## 4. Start

```bash
claude
```

## 5. Første besked

Noget i retning af:

> Læs CLAUDE.md og docs/kravspecifikation-slibninger.md. Sæt projektet op
> med den stak, der står i CLAUDE.md, og begynd på punkt 1 i rækkefølgen:
> datamodel og saldoberegning med tests. Stil spørgsmål, hvis noget i
> specifikationen er tvetydigt, frem for at gætte.

Sidste sætning er den vigtigste. Specifikationen er grundig, men den er
skrevet af os to og ikke af nogen, der har prøvet at bygge den endnu.

## 6. Undervejs

- **Commit ofte.** Små commits gør det muligt at gå tilbage, når noget går
  galt — og det gør det.
- **Kør testene.** Særligt dem om saldo og webhooks.
- **Ret CLAUDE.md**, når I træffer nye beslutninger. Den er det, der gør,
  at næste session ikke starter forfra.
- **Konti fra afsnit 12** i specifikationen kan oprettes sideløbende.
  MobilePay-godkendelsen først, den tager længst.

## Hvis noget i specifikationen viser sig forkert

Det kommer det til. Ret det i `docs/kravspecifikation-slibninger.md` med
det samme, så dokumentet stadig beskriver systemet, når nogen skal
overtage det om to år. Et krav, der ikke passer med koden, er værre end
intet krav.
