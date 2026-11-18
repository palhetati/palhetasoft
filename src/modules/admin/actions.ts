'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { isRouteAllowed } from '@/modules/auth/session-nav';
import type { SessionNavSnapshot } from '@/modules/auth/types';
import {
  validateCltParametroJson,
  validateModuleHelpPayload,
} from '@/modules/parametros/service';

function assertAdminOrManagerAccess(session: SessionNavSnapshot): string | null {
  if (session.isSuperAdmin) return null;
  if (session.canCancelSales && isRouteAllowed(session, '/admin')) return null;
  return 'Acesso restrito a administradores autorizados.';
}

export async function createEstablishmentAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.isSuperAdmin) {
    return { error: 'Apenas o Super Admin pode cadastrar novas empresas.' };
  }

  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  const documentCnpj = String(formData.get('document_cnpj') ?? '').trim();
  const businessVertical = String(formData.get('business_vertical') ?? 'general');
  const taxRegime = String(formData.get('tax_regime') ?? 'simples_nacional');
  const moduleIds = formData.getAll('module_ids').map(String).filter(Boolean);

  if (!name || !slug) {
    return { error: 'Informe o nome e o identificador da empresa.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: est, error } = await supabase
    .from('establishments')
    .insert({
      name,
      slug,
      document_cnpj: documentCnpj || null,
      business_vertical: businessVertical,
      tax_regime: taxRegime,
    })
    .select('id')
    .single();

  if (error || !est) {
    return { error: error?.message ?? 'Erro ao cadastrar empresa.' };
  }

  if (moduleIds.length > 0) {
    const { error: modErr } = await supabase.from('establishment_modules').insert(
      moduleIds.map((moduleId) => ({
        establishment_id: est.id,
        module_id: moduleId,
      }))
    );
    if (modErr) return { error: modErr.message };
  }

  // Seed default payment methods so /pdv works immediately on the new establishment
  const { error: pmErr } = await supabase.from('payment_method_configs').insert([
    { establishment_id: est.id, code: 'cash', label: 'Dinheiro em Espécie', settlement_mode: 'manual_pos', fee_percent: 0, fixed_fee_amount: 0, is_active: true },
    { establishment_id: est.id, code: 'pix', label: 'PIX', settlement_mode: 'manual_pos', fee_percent: 0, fixed_fee_amount: 0, is_active: true },
    { establishment_id: est.id, code: 'debit_card', label: 'Cartão de Débito', settlement_mode: 'manual_pos', fee_percent: 1.39, fixed_fee_amount: 0, is_active: true },
    { establishment_id: est.id, code: 'credit_card', label: 'Cartão de Crédito', settlement_mode: 'manual_pos', fee_percent: 3.19, fixed_fee_amount: 0, is_active: true },
    { establishment_id: est.id, code: 'customer_credit', label: 'Crédito Pré-Pago do Cliente', settlement_mode: 'manual_pos', fee_percent: 0, fixed_fee_amount: 0, is_active: false },
  ]);
  if (pmErr) return { error: pmErr.message };

  revalidatePath('/admin');
  return { success: true };
}

export async function upsertSystemModuleAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.isSuperAdmin) {
    return { error: 'Apenas o Super Admin pode configurar módulos do sistema.' };
  }

  const code = String(formData.get('code') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();
  const parentId = String(formData.get('parent_id') ?? '').trim() || null;
  const routePath = String(formData.get('route_path') ?? '').trim() || null;
  const iconName = String(formData.get('icon_name') ?? 'Folder').trim();
  const moduleScope = String(formData.get('module_scope') ?? 'core_erp');
  const sortOrder = Number(formData.get('sort_order') ?? 10);
  const helpTitle = String(formData.get('help_title') ?? '').trim();
  const helpText = String(formData.get('help_text') ?? '').trim();

  const helpValidation = validateModuleHelpPayload({ helpTitle, helpText });
  if (!helpValidation.valid) {
    return { error: helpValidation.reason };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('system_modules').upsert(
    {
      code,
      label,
      parent_id: parentId,
      route_path: routePath,
      icon_name: iconName,
      module_scope: moduleScope,
      sort_order: sortOrder,
      help_title: helpTitle,
      help_text: helpText,
      is_active: true,
    },
    { onConflict: 'code' }
  );

  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { success: true };
}

export async function createAccessProfileAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  const authError = assertAdminOrManagerAccess(session);
  if (authError) return { error: authError };

  if (!session.activeEstablishmentId) {
    return { error: 'Selecione uma empresa ativa para vincular o perfil.' };
  }

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const canCancelSales = formData.get('can_cancel_sales') === 'true';
  const moduleIds = formData.getAll('module_ids').map(String).filter(Boolean);

  if (!name || moduleIds.length === 0) {
    return { error: 'Informe o nome do perfil e selecione pelo menos um módulo.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from('access_profiles')
    .insert({
      establishment_id: session.activeEstablishmentId,
      name,
      description: description || null,
      can_cancel_sales: canCancelSales,
    })
    .select('id')
    .single();

  if (error || !profile) {
    return { error: error?.message ?? 'Erro ao salvar perfil.' };
  }

  const { error: pmError } = await supabase.from('profile_modules').insert(
    moduleIds.map((moduleId) => ({
      profile_id: profile.id,
      module_id: moduleId,
    }))
  );
  if (pmError) return { error: pmError.message };

  revalidatePath('/admin');
  return { success: true };
}

export async function createClosedUserAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  const authError = assertAdminOrManagerAccess(session);
  if (authError) return { error: authError };

  const fullName = String(formData.get('full_name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const requestedEstId = String(formData.get('establishment_id') ?? '');
  const establishmentId = session.isSuperAdmin
    ? requestedEstId || session.activeEstablishmentId || ''
    : session.activeEstablishmentId || '';
  const profileIds = formData.getAll('profile_ids').map(String).filter(Boolean);

  if (!fullName || !email || password.length < 6 || !establishmentId) {
    return { error: 'Preencha nome, e-mail, senha mínima de 6 caracteres e empresa.' };
  }

  const adminClient = createSupabaseAdminClient();

  if (profileIds.length > 0) {
    const { data: validProfiles } = await adminClient
      .from('access_profiles')
      .select('id')
      .eq('establishment_id', establishmentId)
      .in('id', profileIds);
    if ((validProfiles ?? []).length !== profileIds.length) {
      return { error: 'Um ou mais perfis informados não pertencem a esta empresa.' };
    }
  }

  const { data: created, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authErr || !created.user) {
    return { error: authErr?.message ?? 'Erro ao criar conta de acesso.' };
  }

  const { error: appErr } = await adminClient.from('app_users').insert({
    id: created.user.id,
    establishment_id: establishmentId,
    full_name: fullName,
    email,
    is_super_admin: false,
    is_active: true,
  });

  if (appErr) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return { error: appErr.message };
  }

  if (profileIds.length > 0) {
    const { error: upErr } = await adminClient.from('user_profiles').insert(
      profileIds.map((profileId) => ({
        user_id: created.user.id,
        profile_id: profileId,
      }))
    );
    if (upErr) return { error: upErr.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function upsertParametroWebAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.isSuperAdmin) {
    return { error: 'Apenas o Super Admin altera parâmetros globais.' };
  }

  const chave = String(formData.get('chave_parametro') ?? '').trim();
  const valor = String(formData.get('valor_parametro') ?? '').trim();
  const descricao = String(formData.get('descricao') ?? '').trim();
  const scope = String(formData.get('scope') ?? 'global');

  if (scope === 'tenant' && !session.activeEstablishmentId) {
    return { error: 'Selecione uma empresa ativa antes de salvar um parâmetro específico de empresa.' };
  }

  const establishmentId = scope === 'tenant' ? session.activeEstablishmentId : null;

  if (!chave || !valor) {
    return { error: 'Informe a chave e o valor do parâmetro.' };
  }

  if (chave === 'clt_tributos_vigentes') {
    const check = validateCltParametroJson(valor);
    if (!check.valid) return { error: check.reason };
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase.from('parametros_web').select('id').eq('chave_parametro', chave);

  query = establishmentId
    ? query.eq('establishment_id', establishmentId)
    : query.is('establishment_id', null);
  const { data: existing } = await query.maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('parametros_web')
      .update({
        valor_parametro: valor,
        descricao: descricao || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('parametros_web').insert({
      establishment_id: establishmentId,
      chave_parametro: chave,
      valor_parametro: valor,
      descricao: descricao || null,
    });
    if (error) return { error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/funcionarios');
  return { success: true };
}
