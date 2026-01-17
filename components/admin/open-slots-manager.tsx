'use client';

import { useState } from 'react';
import { Plus, Trash2, Calendar, Clock, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createOpenSlot, deleteOpenSlot } from '@/lib/actions/admin.actions';
import { format, parseISO } from '@/lib/utils/date';
import type { OpenSlot } from '@/lib/types';

const ITEMS_PER_PAGE = 5;

interface OpenSlotsManagerProps {
  openSlots: OpenSlot[];
}

export function OpenSlotsManager({ openSlots }: OpenSlotsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination logic
  const totalItems = openSlots.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSlots = openSlots.slice(startIndex, endIndex);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const reason = formData.get('reason') as string;

    const result = await createOpenSlot(date, startTime, endTime, reason);

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
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ouvert ?')) {
      return;
    }

    const result = await deleteOpenSlot(slotId);

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

  // Helper to get day name in French
  const getDayName = (dateStr: string): string => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayIndex = new Date(dateStr).getDay();
    return days[dayIndex];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CalendarPlus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Créneaux ouverts</h2>
              <p className="text-sm text-muted-foreground">
                Ouvrez des créneaux exceptionnels sur des jours normalement fermés (weekends).
                {totalItems > 0 && ` (${totalItems} au total)`}
              </p>
            </div>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Ouvrir un créneau
            </Button>
          )}
        </div>

        {/* Add form */}
        {isAdding && (
          <form onSubmit={handleAdd} className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="open-date">Date</Label>
                <Input
                  id="open-date"
                  name="date"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="open-startTime">Heure début</Label>
                <Input
                  id="open-startTime"
                  name="startTime"
                  type="time"
                  required
                  defaultValue="09:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="open-endTime">Heure fin</Label>
                <Input
                  id="open-endTime"
                  name="endTime"
                  type="time"
                  required
                  defaultValue="18:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="open-reason">Raison (optionnel)</Label>
                <Input
                  id="open-reason"
                  name="reason"
                  placeholder="Ex: Ouverture exceptionnelle"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? 'Ajout...' : 'Ouvrir ce créneau'}
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
        {openSlots.length > 0 ? (
          <>
            <div className="space-y-2">
              {currentSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{getDayName(slot.date)}</span>
                      {format(parseISO(slot.date), 'dd/MM/yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="h-4 w-4 text-green-600" />
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
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-green-200">
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
            Aucun créneau ouvert pour le moment. Ajoutez-en pour ouvrir des weekends ou jours fériés.
          </p>
        )}
      </div>
    </div>
  );
}
