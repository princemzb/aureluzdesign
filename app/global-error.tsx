'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#faf9f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ maxWidth: '400px', textAlign: 'center' }}>
            {/* Logo/Brand */}
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#c9a55c',
                marginBottom: '2rem',
              }}
            >
              AureLuz
            </div>

            {/* Icon */}
            <div
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 2rem',
                backgroundColor: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
              }}
            >
              ⚠️
            </div>

            {/* Content */}
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: '500',
                color: '#1a1a1a',
                marginBottom: '1rem',
              }}
            >
              Erreur critique
            </h1>
            <p
              style={{
                color: '#666',
                marginBottom: '2rem',
                lineHeight: '1.6',
              }}
            >
              Une erreur inattendue s&apos;est produite.
              Veuillez rafraîchir la page ou réessayer plus tard.
            </p>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={reset}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                🔄 Réessayer
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#c9a55c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                🏠 Retour à l&apos;accueil
              </button>
            </div>

            {/* Error code */}
            {error.digest && (
              <p
                style={{
                  marginTop: '2rem',
                  fontSize: '0.75rem',
                  color: '#999',
                }}
              >
                Code erreur : {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
