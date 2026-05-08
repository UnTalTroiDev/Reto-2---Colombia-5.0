import { Card } from "@/components/Card";
import { API_INFO, ENDPOINTS, RESPONSE_ENVELOPE } from "@/lib/api-meta";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API pública · SECOP Dashboard",
  description:
    "Documentación de la API REST del SECOP Dashboard. Endpoints públicos, ejemplos y respuestas en JSON.",
};

export const dynamic = "force-static";

export default function ApiDocsPage() {
  return (
    <div className="space-y-10">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2">
        <div className="lg:col-span-8">
          <div className="kicker mb-3">API pública · v{API_INFO.version}</div>
          <h1 className="serif text-[44px] md:text-[56px] leading-[1.05] font-semibold tracking-tight">
            Consume el dataset desde{" "}
            <span className="text-[var(--color-accent)]">cualquier sitio</span>.
          </h1>
          <p className="text-[15px] text-[var(--color-fg-2)] mt-5 max-w-2xl leading-relaxed">
            {API_INFO.description} Todas las respuestas son JSON con{" "}
            <em className="text-[var(--color-accent-2)] not-italic font-mono text-[13px]">
              CORS abierto
            </em>{" "}
            y caché del lado servidor — listas para integrar en tu app, dashboard o notebook.
          </p>
          <div className="flex gap-2 mt-6 flex-wrap">
            <Link
              href="/api"
              className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-[13px] font-medium hover:bg-[var(--color-accent-soft)] transition"
            >
              Ver índice JSON →
            </Link>
            <Link
              href="/api/health"
              className="px-4 py-2 border border-[var(--color-border-strong)] text-[13px] hover:border-[var(--color-fg-2)] transition"
            >
              Health check
            </Link>
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="kicker mb-2">Sobre la respuesta</div>
          <div className="font-mono text-[12px] bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 leading-relaxed text-[var(--color-fg-2)] whitespace-pre overflow-x-auto">
{JSON.stringify(RESPONSE_ENVELOPE, null, 2)}
          </div>
        </div>
      </section>

      <div className="rule" />

      <section className="space-y-2">
        <div className="kicker">Endpoints disponibles · {ENDPOINTS.length}</div>
        <div className="grid grid-cols-1 gap-4">
          {ENDPOINTS.map((ep) => (
            <Card key={ep.path}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--color-accent)]/15 text-[var(--color-accent)] uppercase tracking-wider">
                      {ep.method}
                    </span>
                    <code className="font-mono text-[14px] font-medium">{ep.path}</code>
                  </div>
                  <p className="text-[13px] text-[var(--color-fg-2)] mt-2 leading-relaxed">
                    {ep.description}
                  </p>
                  {ep.query && (
                    <div className="mt-3">
                      <div className="kicker mb-1.5">Query params</div>
                      <ul className="text-[12px] font-mono space-y-1">
                        {Object.entries(ep.query).map(([k, v]) => (
                          <li key={k} className="flex gap-2">
                            <span className="text-[var(--color-accent-2)]">{k}</span>
                            <span className="text-[var(--color-muted)]">{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {ep.example && (
                  <Link
                    href={ep.example}
                    className="text-[12px] font-mono text-[var(--color-fg-2)] hover:text-[var(--color-accent)] underline underline-offset-4 whitespace-nowrap"
                  >
                    Probar →
                  </Link>
                )}
              </div>
              {ep.example && (
                <div className="mt-4 font-mono text-[12px] bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 overflow-x-auto whitespace-pre">
{`curl ${ep.example}`}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      <Card kicker="Notas técnicas" title="Caché y rate limits">
        <ul className="text-[13px] text-[var(--color-fg-2)] leading-relaxed space-y-2 list-disc list-inside">
          <li>
            CORS habilitado para todos los orígenes (<code className="font-mono text-[12px]">*</code>) en GET y OPTIONS.
          </li>
          <li>
            Caché HTTP:{" "}
            <code className="font-mono text-[12px]">
              public, s-maxage=600, stale-while-revalidate=1200
            </code>{" "}
            por defecto.
          </li>
          <li>
            Los datos provienen de{" "}
            <code className="font-mono text-[12px]">datos.gov.co</code> vía SODA v2. Sin token, hay
            límite de ~1000 req/h por IP.
          </li>
          <li>
            Respuestas siempre con envelope{" "}
            <code className="font-mono text-[12px]">{`{ ok, data?, error? }`}</code>.
          </li>
        </ul>
      </Card>
    </div>
  );
}
