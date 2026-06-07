'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * global-error replaces the root layout entirely, so it must include
 * <html> and <body> tags. i18n and theme providers are unavailable here,
 * so we use inline styles and hardcoded strings.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          background: '#FAFAF8',
          color: '#1C1917',
        }}
        className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 text-center"
      >
        <div className="flex size-24 items-center justify-center rounded-full bg-red-500/10">
          <TriangleAlert className="size-12 text-red-500" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Algo salió mal</h1>
          <p className="m-0 max-w-sm text-sm text-stone-500">
            Ocurrió un error crítico en la aplicación. Por favor intenta de nuevo o regresa al
            inicio.
          </p>
          {error.digest && <p className="m-0 text-xs text-stone-400">#{error.digest}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border-none bg-stone-900 px-6 py-2 text-sm font-medium text-stone-50 cursor-pointer"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="rounded-md border border-stone-300 bg-transparent px-6 py-2 text-sm font-medium text-stone-900 no-underline"
          >
            Volver al inicio
          </Link>
        </div>
      </body>
    </html>
  );
}
