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
          display: 'flex',
          minHeight: '100svh',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '2rem',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TriangleAlert style={{ width: 48, height: 48, color: 'rgb(239,68,68)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Algo salió mal
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#78716C', maxWidth: 360 }}>
            Ocurrió un error crítico en la aplicación. Por favor intenta de nuevo o regresa al
            inicio.
          </p>
          {error.digest && (
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#A8A29E' }}>#{error.digest}</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: '#1C1917',
              color: '#FAFAF8',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #D6D3D1',
              background: 'transparent',
              color: '#1C1917',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Volver al inicio
          </Link>
        </div>
      </body>
    </html>
  );
}
