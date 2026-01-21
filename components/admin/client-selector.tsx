'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, User, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { searchClients, getClientsForSelect } from '@/lib/actions/clients.actions';
import type { Client } from '@/lib/types';

interface ClientSelectorProps {
  selectedClientId?: string | null;
  onSelect: (client: Client | null) => void;
  disabled?: boolean;
}

export function ClientSelector({
  selectedClientId,
  onSelect,
  disabled = false,
}: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'email'>[]>([]);
  const [selectedClient, setSelectedClient] = useState<Pick<Client, 'id' | 'name' | 'email'> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load all clients for the selector
  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getClientsForSelect();
      setClients(data);

      // If we have a selected client ID, find and set it
      if (selectedClientId) {
        const found = data.find(c => c.id === selectedClientId);
        if (found) {
          setSelectedClient(found);
        }
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Search clients
  const handleSearch = async (query: string) => {
    setSearch(query);

    if (query.length >= 2) {
      setIsLoading(true);
      try {
        const results = await searchClients(query);
        setClients(results.map(c => ({ id: c.id, name: c.name, email: c.email })));
      } catch (error) {
        console.error('Error searching clients:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (query.length === 0) {
      loadClients();
    }
  };

  const handleSelect = (client: Pick<Client, 'id' | 'name' | 'email'>) => {
    setSelectedClient(client);
    onSelect(client as Client);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedClient(null);
    onSelect(null);
  };

  // Filter clients based on search
  const filteredClients = search.length >= 2
    ? clients
    : clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      );

  return (
    <div className="relative">
      {/* Selected client display or selector trigger */}
      {selectedClient ? (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{selectedClient.name}</p>
              <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
            </div>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              Changer
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className={cn(
            'w-full p-4 border-2 border-dashed rounded-lg text-left transition-colors',
            'hover:border-primary/50 hover:bg-primary/5',
            disabled && 'opacity-50 cursor-not-allowed',
            isOpen && 'border-primary bg-primary/5'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Sélectionner un client</p>
              <p className="text-sm text-muted-foreground">
                Choisissez un client existant ou créez-en un nouveau
              </p>
            </div>
          </div>
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un client..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Client list */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Aucun client trouvé
              </div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelect(client)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                  </div>
                  {selectedClient?.id === client.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Create new client */}
          <div className="p-3 border-t border-border">
            <a
              href="/admin/clients/nouveau"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Plus className="h-4 w-4" />
              Créer un nouveau client
            </a>
          </div>

          {/* Close button */}
          <div className="p-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
