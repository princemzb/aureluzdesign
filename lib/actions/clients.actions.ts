'use server';

import { revalidatePath } from 'next/cache';
import { ClientsService, type PaginatedClients, type ClientsFilters } from '@/lib/services/clients.service';
import type { Client, CreateClientInput, UpdateClientInput, ActionResult } from '@/lib/types';

/**
 * Récupère tous les clients avec pagination et recherche
 */
export async function getClients(filters: ClientsFilters = {}): Promise<PaginatedClients> {
  return ClientsService.getAll(filters);
}

/**
 * Récupère un client par son ID
 */
export async function getClient(id: string): Promise<Client | null> {
  return ClientsService.getById(id);
}

/**
 * Récupère un client par son email
 */
export async function getClientByEmail(email: string): Promise<Client | null> {
  return ClientsService.getByEmail(email);
}

/**
 * Crée un nouveau client
 */
export async function createClient(input: CreateClientInput): Promise<ActionResult<Client>> {
  try {
    // Vérifier si un client avec cet email existe déjà
    const existingClient = await ClientsService.getByEmail(input.email);
    if (existingClient) {
      return {
        success: false,
        error: 'Un client avec cet email existe déjà',
      };
    }

    const client = await ClientsService.create(input);
    revalidatePath('/admin/clients');
    return {
      success: true,
      data: client,
    };
  } catch (error) {
    console.error('Error in createClient action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création du client',
    };
  }
}

/**
 * Met à jour un client
 */
export async function updateClient(id: string, input: UpdateClientInput): Promise<ActionResult<Client>> {
  try {
    // Si l'email change, vérifier qu'il n'est pas déjà utilisé
    if (input.email) {
      const existingClient = await ClientsService.getByEmail(input.email);
      if (existingClient && existingClient.id !== id) {
        return {
          success: false,
          error: 'Un autre client utilise déjà cet email',
        };
      }
    }

    const client = await ClientsService.update(id, input);
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${id}`);
    return {
      success: true,
      data: client,
    };
  } catch (error) {
    console.error('Error in updateClient action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du client',
    };
  }
}

/**
 * Supprime un client
 */
export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    await ClientsService.delete(id);
    revalidatePath('/admin/clients');
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error in deleteClient action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression du client',
    };
  }
}

/**
 * Recherche de clients pour l'autocomplétion
 */
export async function searchClients(query: string): Promise<Client[]> {
  return ClientsService.search(query);
}

/**
 * Récupère tous les clients pour un sélecteur
 */
export async function getClientsForSelect(): Promise<Pick<Client, 'id' | 'name' | 'email'>[]> {
  return ClientsService.getAllForSelect();
}
