import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SECOP · Dashboard de Contratación",
    template: "%s",
  },
  description:
    "Análisis y exploración de los datasets SECOP II de datos.gov.co — contratos públicos y documentos electrónicos. Métricas en vivo, calidad de datos y exploración interactiva.",
  authors: [{ name: "Reto 1" }],
  openGraph: {
    title: "SECOP · Dashboard de Contratación",
    description:
      "Análisis en vivo de los datasets SECOP II (5,6M contratos · 17,3M documentos).",
    type: "website",
    locale: "es_CO",
  },
};

const NAV: Array<{ href: string; label: string; group?: string }> = [
  { href: "/", label: "Inicio", group: "auditor" },
  { href: "/auditor", label: "GobIA Auditor", group: "auditor" },
  { href: "/metodologia", label: "Metodología", group: "auditor" },
  { href: "/calidad", label: "Contratos · Calidad", group: "contratos" },
  { href: "/explorar", label: "Contratos · Explorar", group: "contratos" },
  { href: "/documentos", label: "Documentos · Resumen", group: "documentos" },
  { href: "/documentos/explorar", label: "Documentos · Explorar", group: "documentos" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-[var(--color-accent)] focus:text-white focus:rounded-md"
        >
          Saltar al contenido
        </a>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md sticky top-0 z-30 relative">
            <div className="max-w-[1400px] mx-auto px-6 pt-6 pb-4">
              <div className="flex items-baseline gap-6 flex-wrap">
                <Link href="/" className="flex items-baseline gap-4 group">
                  <span
                    className="serif text-[34px] font-semibold leading-none"
                    aria-hidden
                  >
                    SECOP<span className="text-[var(--color-accent)]">.</span>
                  </span>
                  <span className="kicker text-[14px]!">Datos abiertos · Colombia</span>
                </Link>
                <div className="ml-auto flex items-center gap-4">
                  <span className="kicker hidden md:block">
                    Edición {new Date().toISOString().slice(0, 10)}
                  </span>
                  <Link
                    href="/api-docs"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[12px] font-medium hover:bg-[var(--color-accent)]/20 transition whitespace-nowrap"
                    aria-label="Ver documentación de la API pública"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    API pública
                  </Link>
                </div>
              </div>
              <nav
                className="flex items-center gap-0 mt-3 -mx-2 overflow-x-auto"
                aria-label="Principal"
              >
                {NAV.map((item, i) => (
                  <span key={item.href} className="flex items-center">
                    {i > 0 && i !== 3 && i !== 5 && (
                      <span
                        className="text-[var(--color-border-strong)] text-[16px] px-1.5"
                        aria-hidden
                      >
                        ·
                      </span>
                    )}
                    {(i === 3 || i === 5) && (
                      <span
                        className="mx-3 h-4 w-px bg-[var(--color-border-strong)]"
                        aria-hidden
                      />
                    )}
                    <Link
                      href={item.href}
                      className="px-2.5 py-1.5 text-[15px] text-[var(--color-fg-2)] hover:text-[var(--color-accent)] transition-colors whitespace-nowrap"
                    >
                      {item.label}
                    </Link>
                  </span>
                ))}
              </nav>
            </div>
          </header>
          <main id="contenido" className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-[var(--color-border)] mt-12 relative">
            <div className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="serif text-lg font-semibold">
                  SECOP<span className="text-[var(--color-accent)]">.</span>
                </div>
                <p className="text-[var(--color-muted)] mt-2 text-[13px] leading-relaxed">
                  Dashboard editorial de los datasets públicos de contratación de Colombia,
                  publicados por la Agencia Nacional de Contratación Pública.
                </p>
              </div>
              <div>
                <div className="kicker">Datasets</div>
                <ul className="mt-2 space-y-1 text-[13px]">
                  <li className="text-[var(--color-fg-2)]">
                    <span className="font-mono text-[11px] text-[var(--color-muted)]">jbjy-vk9h</span>{" "}
                    · 5,6M contratos
                  </li>
                  <li className="text-[var(--color-fg-2)]">
                    <span className="font-mono text-[11px] text-[var(--color-muted)]">dmgg-8hin</span>{" "}
                    · 17,3M documentos
                  </li>
                </ul>
              </div>
              <div>
                <div className="kicker">API pública</div>
                <ul className="mt-2 space-y-1 text-[13px]">
                  <li>
                    <Link href="/api-docs" className="text-[var(--color-fg-2)] hover:text-[var(--color-accent)]">
                      /api-docs · Documentación
                    </Link>
                  </li>
                  <li>
                    <Link href="/api" className="text-[var(--color-fg-2)] hover:text-[var(--color-accent)]">
                      /api · Índice JSON
                    </Link>
                  </li>
                  <li>
                    <Link href="/api/health" className="text-[var(--color-fg-2)] hover:text-[var(--color-accent)]">
                      /api/health · Status
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-[var(--color-border)] py-3 text-center text-[11px] kicker">
              Reto 1 · Hackathon de Calidad de Datos
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
