'use server';

import { revalidatePath } from 'next/cache';
import { SiteServicesService } from '@/lib/services/site-services.service';
import type { Service, CreateServiceInput, UpdateServiceInput } from '@/lib/types';

export async function getServices(): Promise<Service[]> {
  return SiteServicesService.getAll();
}

export async function getActiveServices(): Promise<Service[]> {
  return SiteServicesService.getActive();
}

export async function getService(id: string): Promise<Service | null> {
  return SiteServicesService.getById(id);
}

export async function createService(
  input: CreateServiceInput
): Promise<{ success: boolean; service?: Service; error?: string }> {
  try {
    const service = await SiteServicesService.create(input);

    revalidatePath('/admin/services');
    revalidatePath('/');

    return { success: true, service };
  } catch (error) {
    console.error('Error in createService:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function updateService(
  id: string,
  input: UpdateServiceInput
): Promise<{ success: boolean; service?: Service; error?: string }> {
  try {
    const service = await SiteServicesService.update(id, input);

    revalidatePath('/admin/services');
    revalidatePath('/');

    return { success: true, service };
  } catch (error) {
    console.error('Error in updateService:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function deleteService(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await SiteServicesService.delete(id);

    revalidatePath('/admin/services');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error in deleteService:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function reorderServices(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await SiteServicesService.reorder(orderedIds);

    revalidatePath('/admin/services');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error in reorderServices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}
