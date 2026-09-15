// Håndtegnede ikoner, ingen ikonpakke — samme "få afhængigheder"-linje som
// resten af projektet. Alle er enkle streg-ikoner i 24x24, currentColor,
// så de arver farven fra teksten omkring dem.
import type { SVGProps } from "react";

function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function IkonAdvarsel(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IkonLogUd(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Base>
  );
}

export function IkonChevronNed(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 9l6 6 6-6" />
    </Base>
  );
}

export function IkonHold(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16.5 8.5a3 3 0 1 1 0-5.99" />
      <path d="M15 14.5c3.5 0 6.5 2.4 6.5 5.5" />
    </Base>
  );
}

export function IkonPrint(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 9V3h12v6" />
      <rect x="3.5" y="9" width="17" height="8" rx="1.5" />
      <path d="M6 14h12v7H6z" />
    </Base>
  );
}

export function IkonRapport(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M9 13h6M9 17h6M9 9h2" />
    </Base>
  );
}

export function IkonLaas(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="1.8" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </Base>
  );
}

export function IkonCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </Base>
  );
}

export function IkonBillet(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3Z" />
      <path d="M9 7.5v9" strokeDasharray="2.2 2.2" />
    </Base>
  );
}

export function IkonSystem(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.8M12 17.7v2.8M20.5 12h-2.8M6.3 12H3.5M17.8 6.2l-2 2M8.2 15.8l-2 2M17.8 17.8l-2-2M8.2 8.2l-2-2" />
    </Base>
  );
}
