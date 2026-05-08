"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg text-center space-y-4">
        <div className="kicker text-[var(--color-accent)]">Error inesperado</div>
        <h1 className="serif text-3xl font-semibold">Algo salió mal</h1>
        <p className="text-[14px] text-[var(--color-fg-2)] leading-relaxed">
          La consulta a <code className="font-mono text-[12px]">datos.gov.co</code> falló o tardó
          demasiado. Es habitual cuando el servicio público está saturado.
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono text-[var(--color-muted)]">
            ref: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-[13px] font-medium hover:bg-[var(--color-accent-soft)] transition"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="px-4 py-2 border border-[var(--color-border-strong)] text-[13px] hover:border-[var(--color-fg-2)] transition"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
