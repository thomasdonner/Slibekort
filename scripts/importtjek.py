#!/usr/bin/env python3
"""
importtjek.py — forbereder en holdeksport fra Holdsport til slibesystemet.

Brug:
    python3 importtjek.py Holdmedlemmer-u14.xlsx --hold U14
    python3 importtjek.py Holdmedlemmer-u14.xlsx --navne Holdmedlemmer-u14.csv --hold U14

XLSX-eksporten indeholder én række pr. spiller med et primært og et alternativt
sæt kontaktoplysninger.
Den er den rigtige kilde. CSV-eksporten kan gives med --navne, fordi den også
indeholder de voksnes navne, som xlsx-filen mangler.

Skriver:
    import-<hold>.csv   klar til indlæsning, én linje pr. spiller
    rapport-<hold>.txt  hvad der skal ses efter i hånden

Fødselsdato, alder, køn, adresse, trøjenummer, skabsnummer, klubmarkering og
medlemsnummer læses ikke og gemmes ikke. Slibesystemet har ingen brug for dem.
"""

import argparse
import csv
import datetime
import re
import sys
from collections import Counter, defaultdict

BRUGTE_FELTER = ["Fornavn", "Efternavn", "E-mail", "E-mail 2",
                 "Mobil", "Mobil 2", "Telefon", "Telefon 2", "Rolle"]


def tekst(v):
    return "" if v is None else str(v).strip()


def tlf(v):
    c = re.sub(r"\D", "", tekst(v))
    return c[-8:] if len(c) >= 8 else ""


def mail(v):
    return tekst(v).lower()


def del_navn(fornavn, efternavn):
    """Fjerner '#12' fra efternavnet. Trøjenummeret bruges ikke."""
    rent = re.sub(r"#\s*\d+", "", efternavn or "").strip()
    return f"{tekst(fornavn)} {rent}".strip()


def laes_xlsx(sti):
    from openpyxl import load_workbook
    wb = load_workbook(sti, read_only=True, data_only=True)
    raekker = list(wb.active.iter_rows(values_only=True))
    hdr = [tekst(h) for h in raekker[0]]
    return [dict(zip(hdr, r)) for r in raekker[1:] if any(c is not None for c in r)]


def laes_csv(sti):
    with open(sti, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def navnetabel(csv_raekker):
    """Slår voksennavne op ud fra mail og mobil i CSV-eksporten."""
    pr_mail, pr_tlf = {}, defaultdict(list)
    for r in csv_raekker:
        if tekst(r.get("Status")) == "Spiller":
            continue
        navn = f"{tekst(r.get('Fornavn'))} {tekst(r.get('Efternavn'))}".strip()
        if not navn:
            continue
        m = mail(r.get("E-mail"))
        if m:
            pr_mail.setdefault(m, navn)
        for f in ("Mobil", "Telefon"):
            t = tlf(r.get(f))
            if t:
                pr_tlf[t].append(navn)
    return pr_mail, pr_tlf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fil", help="xlsx-eksport fra Holdsport")
    ap.add_argument("--navne", help="csv-eksport af samme hold, bruges til voksnes navne")
    ap.add_argument("--hold", default=None)
    args = ap.parse_args()

    hold = args.hold
    if not hold:
        m = re.search(r"([uU]\d{1,2})", args.fil)
        hold = m.group(1).upper() if m else "UKENDT"

    data = laes_xlsx(args.fil)
    pr_mail, pr_tlf = navnetabel(laes_csv(args.navne)) if args.navne else ({}, defaultdict(list))

    noter = []
    ud = []
    set_navne = set()

    for r in data:
        rolle = tekst(r.get("Rolle"))
        if rolle and rolle != "Spiller":
            continue

        navn = del_navn(r.get("Fornavn"), r.get("Efternavn"))
        if not navn:
            continue
        if navn in set_navne:
            noter.append(("Samme navn optræder to gange på holdet", navn))
        set_navne.add(navn)

        voksne = []
        set_mails = set()
        for mf, tf in (("E-mail", "Mobil"), ("E-mail 2", "Mobil 2")):
            m, t = mail(r.get(mf)), tlf(r.get(tf))
            if not (m or t):
                continue
            if m and m in set_mails:
                noter.append(("Alternativ mail er den samme som den primære — bruges ikke", navn))
                continue
            if m:
                set_mails.add(m)
            n = pr_mail.get(m) or (pr_tlf.get(t) or [""])[0]
            voksne.append({"navn": n, "email": m, "mobil": t})

        med_mail = [v for v in voksne if v["email"]]
        if not med_mail:
            noter.append(("Ingen mailadresse — kan ikke få påmindelser", navn))
        elif len(med_mail) == 1 and len(voksne) > 1:
            noter.append(("Ekstra kontakt uden mailadresse — får ingen påmindelser", navn))

        while len(voksne) < 2:
            voksne.append({"navn": "", "email": "", "mobil": ""})

        ud.append({
            "hold": hold,
            "spiller": navn,
            "voksen1_navn": voksne[0]["navn"],
            "voksen1_email": voksne[0]["email"],
            "voksen1_mobil": voksne[0]["mobil"],
            "alt_navn": voksne[1]["navn"],
            "alt_email": voksne[1]["email"],
            "alt_mobil": voksne[1]["mobil"],
        })

    alle_mails = [m for r in ud for m in (r["voksen1_email"], r["alt_email"]) if m]
    for m, antal in Counter(alle_mails).items():
        if antal > 1:
            noter.append(("Samme mailadresse på flere spillere — sandsynligvis søskende", f"{antal} spillere"))

    ud_fil = f"import-{hold}.csv"
    with open(ud_fil, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(ud[0].keys()))
        w.writeheader()
        w.writerows(ud)

    med_navn = sum(1 for r in ud if r["voksen1_navn"])
    to_kontakter = sum(1 for r in ud if r["alt_email"])
    uden_mail = sum(1 for r in ud if not r["voksen1_email"])

    rap = f"rapport-{hold}.txt"
    with open(rap, "w", encoding="utf-8") as f:
        f.write(f"Importtjek for {hold} — {datetime.date.today()}\n")
        f.write(f"Kilde: {args.fil}\n")
        if args.navne:
            f.write(f"Navne fra: {args.navne}\n")
        f.write(f"\nSpillere:                    {len(ud)}\n")
        f.write(f"Med alternativ mailadresse:  {to_kontakter}\n")
        f.write(f"Med én mailadresse:          {len(ud) - to_kontakter - uden_mail}\n")
        f.write(f"Uden mailadresse:            {uden_mail}\n")
        f.write(f"Voksennavn fundet:           {med_navn}\n")
        f.write("\n" + "-" * 60 + "\n")
        grupper = defaultdict(list)
        for kategori, detalje in noter:
            grupper[kategori].append(detalje)
        if grupper:
            f.write(f"{len(noter)} bemærkninger fordelt på {len(grupper)} typer:\n")
            for kategori in sorted(grupper, key=lambda k: -len(grupper[k])):
                f.write(f"\n{kategori} ({len(grupper[kategori])}):\n")
                for d in sorted(set(grupper[kategori])):
                    f.write(f"  - {d}\n")
        else:
            f.write("Ingen bemærkninger.\n")
    unikke = noter

    print(f"Skrevet {ud_fil} og {rap}")
    print(f"{len(ud)} spillere, {to_kontakter} med to kontakter, {len(unikke)} bemærkninger.")


if __name__ == "__main__":
    sys.exit(main())
