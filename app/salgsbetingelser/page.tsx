import type { Metadata } from "next";
import {
  ANTAL_SLIBNINGER,
  ENKELT_ANTAL_SLIBNINGER,
  ENKELT_PRIS_OERE,
  PRIS_OERE,
} from "@/lib/betaling/konstanter";

export const metadata: Metadata = {
  title: "Salgsbetingelser — Slibekort",
};

// Ingen login her — MobilePay (og forældrene) skal kunne åbne siden uden.
// Priserne læses fra de samme konstanter som betalingssiden, så teksten
// aldrig kan vise en anden pris end den, der faktisk trækkes.
//
// Afsnittet om fortrydelse er et udkast, der skal bekræftes af klubben
// (kasserer/formand) — det er en juridisk formulering, ikke noget koden
// kan afgøre.
export default function SalgsbetingelserSide() {
  const kontaktMail = process.env.KASSERER_KONTAKT_EMAIL;

  return (
    <main>
      <h1>Salgsbetingelser</h1>
      <p>
        Gælder for køb af slibninger til skøjteslibning hos Aalborg Ishockey
        Klub, via klubbens slibekort på slibekort.aaik.dk.
      </p>

      <section>
        <h2>Sælger</h2>
        <p>
          Aalborg Ishockey Klub
          <br />
          Willy Brandts Vej 31
          <br />
          9220 Aalborg Ø
          <br />
          CVR: 20078898
        </p>
      </section>

      <section>
        <h2>Hvad du køber</h2>
        <p>
          Slibninger, der lægges på spillerens digitale slibekort. Hver gang
          skøjterne slibes i klubben, trækkes én slibning fra saldoen.
        </p>
        <ul>
          <li>
            {ANTAL_SLIBNINGER} slibninger — {PRIS_OERE / 100} kr.
          </li>
          <li>
            {ENKELT_ANTAL_SLIBNINGER} slibning — {ENKELT_PRIS_OERE / 100} kr.
          </li>
        </ul>
        <p>Priserne er i danske kroner.</p>
      </section>

      <section>
        <h2>Betaling</h2>
        <p>
          Der betales med MobilePay. Klubben tager ikke imod kontanter. Når
          MobilePay har bekræftet betalingen, lægges slibningerne på
          spillerens slibekort med det samme, og du får en kvittering på mail.
        </p>
      </section>

      <section>
        <h2>Levering</h2>
        <p>
          Slibningerne leveres digitalt, som en saldo på slibekortet. Der
          sendes ikke noget fysisk. Slibningerne har ingen udløbsdato.
        </p>
      </section>

      <section>
        <h2>Fortrydelsesret</h2>
        <p>
          Du kan fortryde købet inden for 14 dage efter købet. Er der ikke
          brugt nogen af de købte slibninger, får du hele beløbet tilbage. Er
          nogle brugt, får du tilbagebetalt de slibninger, der er tilbage, til
          den pris, du betalte pr. slibning.
        </p>
        <p>
          Kontakt klubben på{" "}
          {kontaktMail ? <a href={`mailto:${kontaktMail}`}>{kontaktMail}</a> : "klubbens kontaktmail"}
          , hvis du vil fortryde. Beløbet betales tilbage til den MobilePay,
          der blev brugt til købet.
        </p>
      </section>

      <section>
        <h2>Returnering</h2>
        <p>
          Da slibningerne er digitale og ikke en fysisk vare, er der intet at
          returnere.
        </p>
      </section>

      <section>
        <h2>Udmeldelse og flytning af saldo</h2>
        <p>
          Stopper spilleren i klubben, refunderes ubrugte slibninger ikke. Har
          spilleren en søskende i klubben, kan den resterende saldo i stedet
          flyttes over på søskendet — kontakt klubben.
        </p>
      </section>

      <section>
        <h2>Klager</h2>
        <p>
          Er du utilfreds med et køb, så skriv til klubben på{" "}
          {kontaktMail ? <a href={`mailto:${kontaktMail}`}>{kontaktMail}</a> : "klubbens kontaktmail"}
          , så finder vi en løsning. Kommer vi ikke til enighed, kan du klage
          til Forbrugerklagenævnet.
        </p>
      </section>

      <section>
        <h2>Persondata</h2>
        <p>
          Vi gemmer kun det, der skal til for at slibekortet virker: spillerens
          navn og hold samt forældrenes mailadresse og telefonnummer. Det
          bruges til saldo, påmindelser om at fylde kortet op, og kvitteringer.
          Kontakt klubben, hvis du vil have oplysninger rettet eller slettet.
        </p>
      </section>
    </main>
  );
}
