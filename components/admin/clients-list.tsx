'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Mail,
  Phone,
  FileText,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Building2,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { deleteClient } from '@/lib/actions/clients.actions';
import type { ClientWithStats } from '@/lib/types';

interface ClientsListProps {
  clients: ClientWithStats[];
  currentPage: number;
  totalPages: number;
  total: number;
  search: string;
}

export function ClientsList({
  clients,
  currentPage,
  totalPages,
  total,
  search: initialSearch,
}: ClientsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteClient(deleteModal.id);
      if (result.success) {
        setDeleteModal(null);
        router.refresh();
      } else {
        setDeleteError(result.error || 'Erreur lors de la suppression');
      }
    } catch {
      setDeleteError('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', '1');
    router.push(`/admin/clients?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams();
    if (initialSearch) params.set('search', initialSearch);
    params.set('page', page.toString());
    router.push(`/admin/clients?${params.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Recherche */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom, email ou entreprise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
        {initialSearch && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch('');
              router.push('/admin/clients');
            }}
          >
            Effacer
          </Button>
        )}
      </form>

      {/* Liste */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Aucun client trouvé pour &quot;{initialSearch}&quot;
          </div>
        ) : (
          <div className="divide-y divide-border">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center gap-2 p-4 hover:bg-secondary/50 transition-colors"
              >
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">
                          {client.name}
                        </h3>
                        {client.company && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            <Building2 className="h-3 w-3" />
                            {client.company}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {client.email}
                        </span>
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {client.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium text-foreground">{client.quotes_count}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">devis</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CheckSquare className="h-4 w-4" />
                          <span className="font-medium text-foreground">{client.tasks_count}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">tâches</span>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="font-medium text-foreground">
                          {formatCurrency(client.total_amount)}
                        </div>
                        <span className="text-xs text-muted-foreground">CA total</span>
                      </div>
                    </div>
                  </div>

                  {/* Indicateur de tâches en attente */}
                  {client.pending_tasks > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                      {client.pending_tasks} tâche{client.pending_tasks > 1 ? 's' : ''} en attente
                    </div>
                  )}
                </Link>

                {/* Bouton supprimer */}
                <button
                  onClick={() => setDeleteModal({ id: client.id, name: client.name })}
                  className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer le client"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages} ({total} client{total > 1 ? 's' : ''})
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isDeleting && setDeleteModal(null)}
          />
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
                  Vous êtes sur le point de supprimer <strong>{deleteModal.name}</strong> ainsi que toutes ses données :
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
                {deleteError && (
                  <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {deleteError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteModal(null)}
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
                    Supprimer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
