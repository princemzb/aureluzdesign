'use client';

import { useState } from 'react';
import { Plus, Trash2, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBlockedSlot, deleteBlockedSlot } from '@/lib/actions/admin.actions';
import { format, parseISO } from '@/lib/utils/date';
import type { BlockedSlot } from '@/lib/types';

const ITEMS_PER_PAGE = 5;

interface BlockedSlotsManagerProps {
  blockedSlots: BlockedSlot[];
}

export function BlockedSlotsManager({ blockedSlots }: BlockedSlotsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination logic
  const totalItems = blockedSlots.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSlots = blockedSlots.slice(startIndex, endIndex);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const reason = formData.get('reason') as string;

    const result = await createBlockedSlot(date, startTime, endTime, reason);

    if (!result.success) {
      setError(result.error || 'Erreur');
    } else {
      setIsAdding(false);
      (e.target as HTMLFormElement).reset();
      setCurrentPage(1); // Revenir à la première page après ajout
    }

    setIsLoading(false);
  };

  const handleDelete = async (slotId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau bloqué ?')) {
      return;
    }

    const result = await deleteBlockedSlot(slotId);

    if (!result.success) {
      alert(result.error || 'Erreur lors de la suppression');
    } else {
      // Ajuster la page si nécessaire après suppression
      const newTotalPages = Math.ceil((totalItems - 1) / ITEMS_PER_PAGE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Créneaux bloqués</h2>
              <p className="text-sm text-muted-foreground">
                Bloquez des créneaux pour les rendre indisponibles à la réservation.
                {totalItems > 0 && ` (${totalItems} au total)`}
              </p>
            </div>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          )}
        </div>

        {/* Add form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="bg-secondary/50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Heure début</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  required
                  defaultValue="09:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Heure fin</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  required
                  defaultValue="18:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Raison (optionnel)</Label>
                <Input
                  id="reason"
                  name="reason"
                  placeholder="Ex: Congés"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Ajout...' : 'Ajouter'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setError(null);
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}

        {/* List */}
        {blockedSlots.length > 0 ? (
          <>
            <div className="space-y-2">
              {currentSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(parseISO(slot.date), 'dd/MM/yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {slot.start_time} - {slot.end_time}
                    </div>
                    {slot.reason && (
                      <span className="text-sm text-muted-foreground">
                        ({slot.reason})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(slot.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and adjacent pages
                        return page === 1 ||
                               page === totalPages ||
                               Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, index, filtered) => {
                        // Add ellipsis if there's a gap
                        const showEllipsisBefore = index > 0 && page - filtered[index - 1] > 1;
                        return (
                          <span key={page} className="flex items-center">
                            {showEllipsisBefore && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className="min-w-[36px]"
                            >
                              {page}
                            </Button>
                          </span>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Aucun créneau bloqué pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
