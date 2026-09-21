'use server';

import { createClient } from '@/lib/supabase/server';
import { createWorkspace } from '@/lib/provision-tenant';

export type OnboardingResult = { error?: string; ok?: boolean };

/**
 * Creates the user's workspace (tenant + owner membership + default event +
 * pending subscription for the chosen plan). Returns a result the client uses
 * to navigate; provisioning is synchronous so the user gets immediate feedback.
 */
export async function createWorkspaceAction(input: {
  name: string;
  planId: string;
}): Promise<OnboardingResult> {
  if (!input.name?.trim()) return { error: 'El nombre del workspace es requerido.' };
  if (!input.planId) return { error: 'Selecciona un plan.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  try {
    await createWorkspace(user, { name: input.name, planId: input.planId });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'No se pudo crear el workspace. Inténtalo de nuevo.',
    };
  }

  return { ok: true };
}
