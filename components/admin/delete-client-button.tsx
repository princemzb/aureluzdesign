'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteClient } from '@/lib/actions/clients.actions';

interface DeleteClientButtonProps {
  clientId: string;
  clientName: string;
}

export function DeleteClientButton({ clientId, clientName }: DeleteClientButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteClient(clientId);

      if (result.success) {
        router.push('/admin/clients');
      } else {
        setError(result.error || 'Erreur lors de la suppression');
        setIsDeleting(false);
      }
    } catch {
      setError('Erreur lors de la suppression');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        onClick={() => setShowModal(true)}
      >
        <Trash2 className="h-4 w-4" />
        Supprimer
      </Button>

      {/* Modal de confirmation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isDeleting && setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-background rounded-xl border border-border shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Supprimer ce client ?
                </h3>
                <p className="text-muted-foreground mt-2">
                  Vous êtes sur le point de supprimer <strong>{clientName}</strong> ainsi que toutes ses données associées :
                </p>
                <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                  <li>• Tous les rendez-vous</li>
                  <li>• Tous les devis</li>
                  <li>• Toutes les factures</li>
                  <li>• Toutes les tâches</li>
                </ul>
                <p className="mt-3 text-sm text-red-600 font-medium">
                  Cette action est irréversible.
                </p>

                {error && (
                  <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Supprimer définitivement
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
