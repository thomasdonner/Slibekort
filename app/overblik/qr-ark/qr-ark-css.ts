// QR-arkets typografi, både på skærmen og til print. Ligger i en egen fil
// (ikke inde i page.tsx), fordi en Next-side kun må eksportere bestemte
// ting — og fordi printreglerne er det, der skal kunne kontrolleres for sig.
export const QR_ARK_CSS = `
  .qr-gitter {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .qr-kort {
    border: 1px dashed #999;
    padding: 0.5rem;
    text-align: center;
    break-inside: avoid;
  }
  .qr-billede svg {
    width: 100%;
    height: auto;
  }
  .qr-note {
    font-weight: 600;
    font-size: 0.85rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .qr-gruppe h2 {
    margin-top: 1.5rem;
    font-size: 1.1rem;
  }

  /* Print: A4, hele sidens bredde, fire koder pr. række, så et helt hold
     fylder så få sider som muligt. Koderne er stadig ca. 4 cm brede — langt
     over det, en telefon skal bruge for at aflæse dem. */
  @media print {
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      background: #fff;
      color: #000;
    }
    /* Sidens sorte topbjælke og stribe hører ikke hjemme på et print. */
    .klub-header,
    .klub-stribe,
    .skjules-ved-print {
      display: none;
    }
    main {
      max-width: none;
      margin: 0;
      padding: 0;
    }
    .qr-gitter {
      grid-template-columns: repeat(4, 1fr);
      gap: 4mm;
    }
    .qr-kort {
      padding: 2mm;
      font-size: 9pt;
      line-height: 1.25;
    }
    .qr-kort p {
      margin: 1mm 0 0;
      color: #000;
    }
    .qr-note {
      font-size: 9pt;
    }
    /* Grupperne pakkes tæt: hver gruppe fylder kun så mange af de fire
       kolonner, som den har spillere (--kolonner, sat pr. gruppe), så fire
       grupper med hver én spiller ligger på samme række i stedet for at
       bruge fire. En gruppe med flere spillere end kolonner fylder hele
       rækken. Rækkefølgen bevares. */
    .qr-grupper {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      column-gap: 4mm;
      align-items: start;
    }
    .qr-gruppe {
      grid-column: span var(--kolonner, 4);
      background: none;
      border: none;
      box-shadow: none;
      padding: 0;
      margin: 0 0 5mm;
      break-inside: avoid;
    }
    .qr-gruppe .qr-gitter {
      grid-template-columns: repeat(var(--kolonner, 4), 1fr);
    }
    /* En overskrift må aldrig stå alene nederst på en side, adskilt fra
       sine koder — den holdes sammen med første række. Selve gruppen må
       gerne fortsætte på næste side, ellers ville en stor gruppe efterlade
       et stort hul. */
    .qr-gruppe h2 {
      margin: 0 0 2mm;
      padding-bottom: 1mm;
      border-bottom: 1px solid #000;
      font-size: 11pt;
      break-after: avoid;
    }
    /* Valgfrit: hver hulning på sin egen side, så en hel bunke kan gives
       til sliberen ad gangen. */
    .qr-gruppe.ny-side {
      grid-column: 1 / -1;
    }
    .qr-gruppe.ny-side .qr-gitter {
      grid-template-columns: repeat(4, 1fr);
    }
    .qr-gruppe.ny-side:not(:first-of-type) {
      break-before: page;
    }
  }
`;
