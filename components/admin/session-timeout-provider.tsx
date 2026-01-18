'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { LogOut, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/actions/auth.actions';

// Configuration du timeout d'inactivité
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000; // Avertissement 5 minutes avant

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const showWarningRef = useRef(false); // Ref pour éviter les problèmes de closure

  // Sync ref avec state
  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    await logout();
  }, [clearAllTimers]);

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    clearAllTimers();
    setShowWarning(false);

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      showWarningRef.current = true;
      setCountdown(WARNING_BEFORE_TIMEOUT / 1000);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT);
  }, [clearAllTimers, handleLogout]);

  const handleContinueSession = useCallback(() => {
    setShowWarning(false);
    showWarningRef.current = false;
    resetTimers();
  }, [resetTimers]);

  // Setup event listeners une seule fois
  useEffect(() => {
    const handleActivity = () => {
      // Utiliser la ref pour vérifier si le warning est affiché
      if (!showWarningRef.current) {
        resetTimers();
      }
    };

    // Initial setup
    resetTimers();

    // Activity events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format countdown
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {children}

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl border border-border p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="text-lg font-medium">Session bientôt expirée</h2>
            </div>

            <p className="text-muted-foreground mb-4">
              Votre session va expirer dans{' '}
              <span className="font-mono font-bold text-foreground">
                {formatCountdown(countdown)}
              </span>{' '}
              pour des raisons de sécurité.
            </p>

            <p className="text-sm text-muted-foreground mb-6">
              Cliquez sur &quot;Continuer&quot; pour rester connecté ou &quot;Déconnexion&quot; pour quitter.
            </p>

            <div className="flex gap-3">
              <Button onClick={handleContinueSession} className="flex-1">
                Continuer
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex-1 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
