'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { flattenNavigationTreeFromRows } from './navigation-tree';
import {
  NAV_SESSION_COOKIE,
  extractAllowedPaths,
  parseNavigationSession,
  resolveHomeRoute,
  serializeNavigationSession,
} from './session-nav';
import type { SessionNavSnapshot } from './types';

async function buildAndStoreNavSnapshot(
  userId: string,
  preferredEstablishmentId?: string | null
): Promise<SessionNavSnapshot> {
  const supabase = await createSupabaseServerClient();

  const { data: appUser, error: userErr } = await supabase
    .from('app_users')
    .select('id, full_name, email, is_super_admin, establishment_id, is_active')
    .eq('id', userId)
    .single();

  if (userErr || !appUser || !appUser.is_active) {
    throw new Error('Usuário inativo ou sem vínculo cadastrado no sistema.');
  }

  let activeEstId: string | null = appUser.is_super_admin
    ? preferredEstablishmentId ?? appUser.establishment_id
    : appUser.establishment_id;

  let activeEstName: string | null = null;

  if (appUser.is_super_admin && !activeEstId) {
    const { data: firstEst } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstEst) {
      activeEstId = firstEst.id;
      activeEstName = firstEst.name;
    }
  }

  if (activeEstId && !activeEstName) {
    const { data: est } = await supabase
      .from('establishments')
      .select('name')
      .eq('id', activeEstId)
      .maybeSingle();
    activeEstName = est?.name ?? null;
  }

  const { data: navRows, error: rpcErr } = await supabase.rpc('resolve_user_navigation', {
    p_user_id: userId,
    p_active_establishment_id: activeEstId,
  });

  if (rpcErr) {
    throw new Error(`Falha ao carregar permissões de navegação: ${rpcErr.message}`);
  }

  const rows = (navRows ?? []) as Array<{
    id: string;
    parent_id: string | null;
    code: string;
    label: string;
    route_path: string | null;
    icon_name: string;
    help_title: string;
    help_text: string;
    module_scope: 'super_admin' | 'core_erp' | 'balneario';
    sort_order: number;
    can_cancel_sales: boolean;
  }>;

  const tree = flattenNavigationTreeFromRows(rows);
  const allowedPaths = extractAllowedPaths(tree);
  const canCancelSales = appUser.is_super_admin || rows.some((r) => r.can_cancel_sales);

  const snapshot: SessionNavSnapshot = {
    userId: appUser.id,
    fullName: appUser.full_name,
    email: appUser.email,
    isSuperAdmin: appUser.is_super_admin,
    canCancelSales,
    activeEstablishmentId: activeEstId,
    activeEstablishmentName: activeEstName,
    tree,
    allowedPaths,
    generatedAt: new Date().toISOString(),
  };

  const cookieStore = await cookies();
  cookieStore.set(NAV_SESSION_COOKIE, serializeNavigationSession(snapshot), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return snapshot;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Informe seu e-mail e sua senha para entrar.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' };
  }

  let firstRoute = '/dashboard';
  try {
    const snapshot = await buildAndStoreNavSnapshot(data.user.id);
    firstRoute = resolveHomeRoute(snapshot);
  } catch (err) {
    const cookieStore = await cookies();
    cookieStore.delete(NAV_SESSION_COOKIE);
    await supabase.auth.signOut();
    return {
      error: err instanceof Error ? err.message : 'Erro ao montar o menu do usuário.',
    };
  }
  redirect(firstRoute);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(NAV_SESSION_COOKIE);
  redirect('/login');
}

export async function switchSuperAdminTenantAction(establishmentId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const current = parseNavigationSession(cookieStore.get(NAV_SESSION_COOKIE)?.value);

  if (!user || !current || current.userId !== user.id || !current.isSuperAdmin) {
    throw new Error('Apenas o Super Admin autenticado pode alternar de empresa.');
  }
  await buildAndStoreNavSnapshot(user.id, establishmentId);
}

export async function getCurrentErpContext(pathname?: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const snapshot = parseNavigationSession(cookieStore.get(NAV_SESSION_COOKIE)?.value);

  if (!user || !snapshot || snapshot.userId !== user.id) {
    redirect('/login');
  }

  let moduleHelp: { label: string; helpTitle: string; helpText: string } | null = null;
  if (pathname) {
    const { data: modRow } = await supabase
      .from('system_modules')
      .select('label, help_title, help_text')
      .eq('route_path', pathname)
      .eq('is_active', true)
      .maybeSingle();

    if (modRow) {
      moduleHelp = {
        label: modRow.label,
        helpTitle: modRow.help_title,
        helpText: modRow.help_text,
      };
    }
  }

  return {
    session: snapshot,
    moduleHelp,
  };
}
