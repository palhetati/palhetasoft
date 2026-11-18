'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  ChoiceChips,
  Input,
  LoadingState,
  MultiChoiceChips,
  PageHeader,
  ResponsiveDataTable,
  Select,
  Textarea,
  TruncatedText,
} from '@/components/ui';
import {
  humanizeModuleScope,
  humanizeParameterKey,
  humanizeTaxRegime,
  humanizeVertical,
} from '@/lib/domain-labels';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  createAccessProfileAction,
  createClosedUserAction,
  createEstablishmentAction,
  upsertParametroWebAction,
  upsertSystemModuleAction,
} from '@/modules/admin/actions';
import type { SystemModuleRow } from '@/modules/auth/types';
import type { ParametroWebRow } from '@/modules/parametros/types';

export interface AdminClientProps {
  isSuperAdmin: boolean;
  activeEstablishmentId: string | null;
  title: string;
  helpTitle: string;
  helpText: string;
}

type AdminTab = 'empresas' | 'modulos' | 'perfis' | 'parametros';

export function AdminClient({
  isSuperAdmin,
  activeEstablishmentId,
  title,
  helpTitle,
  helpText,
}: AdminClientProps) {
  const [tab, setTab] = useState<AdminTab>(isSuperAdmin ? 'empresas' : 'perfis');
  const [loading, setLoading] = useState(true);

  const [establishments, setEstablishments] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      business_vertical: string;
      tax_regime: string;
    }>
  >([]);
  const [modules, setModules] = useState<SystemModuleRow[]>([]);
  const [profiles, setProfiles] = useState<
    Array<{ id: string; name: string; description: string | null; can_cancel_sales: boolean }>
  >([]);
  const [users, setUsers] = useState<
    Array<{ id: string; full_name: string; email: string; is_super_admin: boolean }>
  >([]);
  const [parametros, setParametros] = useState<ParametroWebRow[]>([]);

  const [selectedEstModules, setSelectedEstModules] = useState<string[]>([]);
  const [selectedProfileModules, setSelectedProfileModules] = useState<string[]>([]);
  const [selectedUserProfiles, setSelectedUserProfiles] = useState<string[]>([]);

  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const loadGovernanceData = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    let profilesQuery = supabase
      .from('access_profiles')
      .select('id, name, description, can_cancel_sales')
      .order('name');
    let usersQuery = supabase
      .from('app_users')
      .select('id, full_name, email, is_super_admin')
      .order('full_name');

    if (activeEstablishmentId) {
      profilesQuery = profilesQuery.eq('establishment_id', activeEstablishmentId);
      usersQuery = usersQuery.or(
        `establishment_id.eq.${activeEstablishmentId},is_super_admin.eq.true`
      );
    }

    const [{ data: ests }, { data: mods }, { data: profs }, { data: usrs }, { data: params }] =
      await Promise.all([
        supabase
          .from('establishments')
          .select('id, name, slug, business_vertical, tax_regime')
          .order('name'),
        supabase.from('system_modules').select('*').order('sort_order'),
        profilesQuery,
        usersQuery,
        supabase.from('parametros_web').select('*').order('chave_parametro'),
      ]);

    const typedMods = (mods ?? []) as SystemModuleRow[];
    setEstablishments(ests ?? []);
    setModules(typedMods);
    setSelectedEstModules((prev) =>
      prev.length > 0
        ? prev
        : typedMods.filter((m) => m.module_scope === 'core_erp').map((m) => m.id)
    );
    setProfiles(profs ?? []);
    setUsers(usrs ?? []);
    setParametros((params ?? []) as ParametroWebRow[]);
    setLoading(false);
  }, [activeEstablishmentId]);

  useEffect(() => {
    void loadGovernanceData();
  }, [loadGovernanceData]);

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  const tabOptions: Array<{ value: AdminTab; label: string }> = [
    ...(isSuperAdmin
      ? ([
          { value: 'empresas', label: 'Empresas clientes' },
          { value: 'modulos', label: 'Menus e textos de ajuda' },
        ] as Array<{ value: AdminTab; label: string }>)
      : []),
    { value: 'perfis', label: 'Perfis e contas' },
    ...(isSuperAdmin
      ? ([{ value: 'parametros', label: 'Configurações gerais' }] as Array<{
          value: AdminTab;
          label: string;
        }>)
      : []),
  ];

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle="Gerencie estabelecimentos, menus do sistema, perfis de acesso e regras gerais."
        helpTitle={helpTitle}
        helpText={helpText}
      />

      <Card variant="soft" title="Seção administrativa">
        <ChoiceChips
          ariaLabel="Escolher seção administrativa"
          value={tab}
          onChange={setTab}
          options={tabOptions}
        />
      </Card>

      {feedback && (
        <Alert tone={feedback.tone} title="Administração">
          {feedback.text}
        </Alert>
      )}

      {loading ? (
        <LoadingState label="Carregando..." />
      ) : (
        <div className="flex flex-col gap-5">
          {tab === 'empresas' && isSuperAdmin && (
            <>
              <Card
                variant="soft"
                title="Cadastrar nova empresa"
                subtitle="Cadastro exclusivo da administração central."
              >
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    selectedEstModules.forEach((id) => fd.append('module_ids', id));
                    startTransition(async () => {
                      const res = await createEstablishmentAction(fd);
                      if (res.error) setFeedback({ tone: 'warning', text: res.error });
                      else {
                        setFeedback({ tone: 'success', text: 'Empresa cadastrada com sucesso.' });
                        await loadGovernanceData();
                      }
                    });
                  }}
                >
                  <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                    <Input
                      name="name"
                      label="Nome do estabelecimento"
                      placeholder="Ex: Balneário Sol"
                      required
                    />
                    <Input
                      name="slug"
                      label="Apelido curto"
                      placeholder="Ex: balneario-sol"
                      required
                    />
                    <Input name="document_cnpj" label="CNPJ" placeholder="00.000.000/0001-00" />
                    <Select
                      name="business_vertical"
                      label="Ramo de atuação"
                      options={[
                        { value: 'balneario', label: 'Balneário e lazer' },
                        { value: 'general', label: 'Comércio e alimentação' },
                      ]}
                    />
                    <Select
                      name="tax_regime"
                      label="Regime tributário"
                      options={[
                        { value: 'simples_nacional', label: 'Simples Nacional' },
                        { value: 'lucro_presumido', label: 'Lucro Presumido' },
                        { value: 'lucro_real', label: 'Lucro Real' },
                        { value: 'mei', label: 'Microempreendedor Individual (MEI)' },
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-2 border-t border-hairline pt-3">
                    <span className="typo-caption font-medium text-ink-secondary">
                      Menus liberados para esta empresa
                    </span>
                    <MultiChoiceChips
                      ariaLabel="Menus liberados para a empresa"
                      values={selectedEstModules}
                      onToggle={(id) => setSelectedEstModules((prev) => toggleId(prev, id))}
                      options={modules
                        .filter((m) => m.module_scope !== 'super_admin')
                        .map((m) => ({ value: m.id, label: m.label }))}
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isPending}
                      loadingText="Salvando..."
                    >
                      Salvar empresa
                    </Button>
                  </div>
                </form>
              </Card>

              <Card
                variant="flat"
                title="Empresas cadastradas"
                headerAction={
                  <span className="typo-caption text-ink-muted">
                    {establishments.length} itens
                  </span>
                }
              >
                <ResponsiveDataTable
                  keyExtractor={(row) => row.id}
                  emptyMessage="Nenhuma empresa cadastrada."
                  data={establishments}
                  columns={[
                    {
                      key: 'name',
                      header: 'Estabelecimento',
                      render: (r) => (
                        <TruncatedText text={r.name} maxWidthClass="max-w-[240px]" />
                      ),
                    },
                    {
                      key: 'vertical',
                      header: 'Ramo',
                      render: (r) => (
                        <Badge sticker="teal">{humanizeVertical(r.business_vertical)}</Badge>
                      ),
                    },
                    {
                      key: 'regime',
                      header: 'Regime tributário',
                      render: (r) => humanizeTaxRegime(r.tax_regime),
                    },
                  ]}
                />
              </Card>
            </>
          )}

          {tab === 'modulos' && isSuperAdmin && (
            <>
              <Card
                variant="soft"
                title="Configurar menu e texto de ajuda"
                subtitle="Defina o grupo na barra lateral e a explicação aberta pelo ícone de ajuda da tela."
              >
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    startTransition(async () => {
                      const res = await upsertSystemModuleAction(fd);
                      if (res.error) setFeedback({ tone: 'warning', text: res.error });
                      else {
                        setFeedback({
                          tone: 'success',
                          text: 'Menu salvo. Saia e entre novamente para atualizar a barra lateral.',
                        });
                        await loadGovernanceData();
                      }
                    });
                  }}
                >
                  <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                    <Input
                      name="code"
                      label="Código do menu"
                      placeholder="Ex: erp.relatorios"
                      required
                    />
                    <Input
                      name="label"
                      label="Nome na barra lateral"
                      placeholder="Ex: Relatórios"
                      required
                    />
                    <Select
                      name="parent_id"
                      label="Grupo principal (opcional)"
                      options={[
                        { value: '', label: 'Menu principal (raiz)' },
                        ...modules
                          .filter((m) => !m.parent_id)
                          .map((m) => ({ value: m.id, label: m.label })),
                      ]}
                    />
                    <Input name="route_path" label="Endereço da tela" placeholder="Ex: /relatorios" />
                    <Input name="icon_name" label="Ícone" defaultValue="Folder" />
                    <Select
                      name="module_scope"
                      label="Categoria"
                      options={[
                        { value: 'core_erp', label: 'Padrão do sistema' },
                        { value: 'balneario', label: 'Módulo balneário' },
                        { value: 'super_admin', label: 'Administração central' },
                      ]}
                    />
                    <Input
                      name="sort_order"
                      type="number"
                      label="Ordem no menu"
                      defaultValue="10"
                    />
                    <Input
                      name="help_title"
                      label="Título da ajuda"
                      placeholder="Ex: Como usar esta tela"
                      required
                    />
                    <Textarea
                      name="help_text"
                      rows={3}
                      label="Explicação da tela"
                      placeholder="Explique em duas ou três frases curtas o que a pessoa faz nesta tela."
                      containerClassName="col-span-full"
                      required
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isPending}
                      loadingText="Salvando..."
                    >
                      Salvar menu
                    </Button>
                  </div>
                </form>
              </Card>

              <Card
                variant="flat"
                title="Menus do sistema"
                headerAction={
                  <span className="typo-caption text-ink-muted">{modules.length} itens</span>
                }
              >
                <ResponsiveDataTable
                  keyExtractor={(row) => row.id}
                  emptyMessage="Nenhum menu cadastrado."
                  data={modules}
                  columns={[
                    { key: 'label', header: 'Menu', render: (r) => r.label },
                    {
                      key: 'escopo',
                      header: 'Categoria',
                      render: (r) => (
                        <Badge sticker="sky">{humanizeModuleScope(r.module_scope)}</Badge>
                      ),
                    },
                    {
                      key: 'path',
                      header: 'Endereço',
                      render: (r) => r.route_path ?? 'Grupo principal',
                    },
                    {
                      key: 'help',
                      header: 'Título da ajuda',
                      render: (r) => (
                        <TruncatedText text={r.help_title} maxWidthClass="max-w-[220px]" />
                      ),
                    },
                  ]}
                />
              </Card>
            </>
          )}

          {tab === 'perfis' && (
            <>
              <Card
                variant="soft"
                title="Criar perfil de acesso"
                subtitle="Ao escolher um grupo pai, todas as telas filhas dele são liberadas juntas."
              >
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    selectedProfileModules.forEach((id) => fd.append('module_ids', id));
                    startTransition(async () => {
                      const res = await createAccessProfileAction(fd);
                      if (res.error) setFeedback({ tone: 'warning', text: res.error });
                      else {
                        setFeedback({ tone: 'success', text: 'Perfil criado com sucesso.' });
                        await loadGovernanceData();
                      }
                    });
                  }}
                >
                  <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                    <Input
                      name="name"
                      label="Nome do perfil"
                      placeholder="Ex: Gerente operacional"
                      required
                    />
                    <Input name="description" label="Resumo das atribuições" />
                    <Select
                      name="can_cancel_sales"
                      label="Pode estornar vendas no PDV?"
                      options={[
                        { value: 'false', label: 'Não autorizado a estornar vendas' },
                        { value: 'true', label: 'Autorizado a estornar vendas' },
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-2 border-t border-hairline pt-3">
                    <span className="typo-caption font-medium text-ink-secondary">
                      Menus liberados neste perfil
                    </span>
                    <MultiChoiceChips
                      ariaLabel="Menus liberados neste perfil"
                      values={selectedProfileModules}
                      onToggle={(id) => setSelectedProfileModules((prev) => toggleId(prev, id))}
                      options={modules
                        .filter((m) => isSuperAdmin || m.module_scope !== 'super_admin')
                        .map((m) => ({
                          value: m.id,
                          label: m.parent_id ? m.label : `${m.label} (grupo completo)`,
                        }))}
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isPending}
                      loadingText="Salvando..."
                    >
                      Salvar perfil
                    </Button>
                  </div>
                </form>
              </Card>

              <Card
                variant="soft"
                title="Cadastrar conta de usuário"
                subtitle="Você pode marcar um ou mais perfis para a mesma pessoa."
              >
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    if (activeEstablishmentId) fd.set('establishment_id', activeEstablishmentId);
                    selectedUserProfiles.forEach((id) => fd.append('profile_ids', id));
                    startTransition(async () => {
                      const res = await createClosedUserAction(fd);
                      if (res.error) setFeedback({ tone: 'warning', text: res.error });
                      else {
                        setFeedback({ tone: 'success', text: 'Conta de acesso criada com sucesso.' });
                        await loadGovernanceData();
                      }
                    });
                  }}
                >
                  <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                    <Input name="full_name" label="Nome completo" required />
                    <Input name="email" type="email" label="E-mail de acesso" required />
                    <Input name="password" type="password" label="Senha inicial" required />
                  </div>

                  <div className="flex flex-col gap-2 border-t border-hairline pt-3">
                    <span className="typo-caption font-medium text-ink-secondary">
                      Perfis atribuídos
                    </span>
                    <MultiChoiceChips
                      ariaLabel="Perfis atribuídos ao usuário"
                      values={selectedUserProfiles}
                      onToggle={(id) => setSelectedUserProfiles((prev) => toggleId(prev, id))}
                      options={profiles.map((p) => ({ value: p.id, label: p.name }))}
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="submit"
                      variant="secondary"
                      loading={isPending}
                      loadingText="Criando..."
                    >
                      Criar conta de acesso
                    </Button>
                  </div>
                </form>
              </Card>

              <Card
                variant="flat"
                title="Contas ativas"
                headerAction={
                  <span className="typo-caption text-ink-muted">{users.length} contas</span>
                }
              >
                <ResponsiveDataTable
                  keyExtractor={(u) => u.id}
                  emptyMessage="Nenhuma conta cadastrada."
                  data={users}
                  columns={[
                    { key: 'nome', header: 'Nome', render: (u) => u.full_name },
                    { key: 'email', header: 'E-mail', render: (u) => u.email },
                    {
                      key: 'tipo',
                      header: 'Nível',
                      render: (u) => (
                        <Badge sticker={u.is_super_admin ? 'purple' : 'green'}>
                          {u.is_super_admin ? 'Administração central' : 'Equipe do estabelecimento'}
                        </Badge>
                      ),
                    },
                  ]}
                />
              </Card>
            </>
          )}

          {tab === 'parametros' && isSuperAdmin && (
            <>
              <Card
                variant="soft"
                title="Atualizar configurações gerais"
                subtitle="Ajuste percentuais trabalhistas, faixas de impostos e limites de listagem."
              >
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    startTransition(async () => {
                      const res = await upsertParametroWebAction(fd);
                      if (res.error) setFeedback({ tone: 'warning', text: res.error });
                      else {
                        setFeedback({ tone: 'success', text: 'Configuração salva com sucesso.' });
                        await loadGovernanceData();
                      }
                    });
                  }}
                >
                  <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                    <Select
                      name="chave_parametro"
                      label="Configuração"
                      defaultValue="clt_tributos_vigentes"
                      options={[
                        {
                          value: 'clt_tributos_vigentes',
                          label: 'Regras e encargos trabalhistas (CLT)',
                        },
                        {
                          value: 'paginacao_padrao_grid',
                          label: 'Quantidade de itens por página',
                        },
                      ]}
                    />
                    <Select
                      name="scope"
                      label="Onde aplicar"
                      options={[
                        { value: 'global', label: 'Padrão para todas as empresas' },
                        { value: 'tenant', label: 'Somente para a empresa selecionada' },
                      ]}
                    />
                    <Input
                      name="descricao"
                      label="Observação curta"
                      defaultValue="Alíquotas, faixas progressivas e provisões da CLT."
                      containerClassName="col-span-full"
                    />
                    <Textarea
                      name="valor_parametro"
                      rows={8}
                      label="Valores da configuração"
                      containerClassName="col-span-full"
                      defaultValue={
                        parametros.find((p) => p.chave_parametro === 'clt_tributos_vigentes')
                          ?.valor_parametro ?? ''
                      }
                      required
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isPending}
                      loadingText="Salvando..."
                    >
                      Salvar configuração
                    </Button>
                  </div>
                </form>
              </Card>

              <Card
                variant="flat"
                title="Configurações gerais ativas"
                headerAction={
                  <span className="typo-caption text-ink-muted">{parametros.length} itens</span>
                }
              >
                <ResponsiveDataTable
                  keyExtractor={(row) => row.id}
                  emptyMessage="Nenhuma configuração encontrada."
                  data={parametros}
                  columns={[
                    {
                      key: 'chave',
                      header: 'Configuração',
                      render: (r) => humanizeParameterKey(r.chave_parametro),
                    },
                    {
                      key: 'escopo',
                      header: 'Abrangência',
                      render: (r) => (
                        <Badge sticker={r.establishment_id ? 'orange' : 'green'}>
                          {r.establishment_id ? 'Empresa específica' : 'Padrão geral'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'desc',
                      header: 'Observação',
                      render: (r) => (
                        <TruncatedText text={r.descricao ?? ''} maxWidthClass="max-w-[260px]" />
                      ),
                    },
                  ]}
                />
              </Card>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
