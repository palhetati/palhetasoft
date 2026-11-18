'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Input,
  LoadingState,
  PageHeader,
  ResponsiveDataTable,
  Select,
  Textarea,
} from '@/components/ui';
import {
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

export function AdminClient({
  isSuperAdmin,
  activeEstablishmentId,
  title,
  helpTitle,
  helpText,
}: AdminClientProps) {
  const [tab, setTab] = useState<'empresas' | 'modulos' | 'perfis' | 'parametros'>(
    isSuperAdmin ? 'empresas' : 'perfis'
  );
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

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle="Administre estabelecimentos, menus do sistema, perfis de acesso e regras globais."
        helpTitle={helpTitle}
        helpText={helpText}
      />

      <Card variant="soft" title="Seções Administrativas">
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <>
              <Button
                size="sm"
                variant={tab === 'empresas' ? 'primary' : 'utility'}
                onClick={() => setTab('empresas')}
              >
                Empresas Clientes
              </Button>
              <Button
                size="sm"
                variant={tab === 'modulos' ? 'primary' : 'utility'}
                onClick={() => setTab('modulos')}
              >
                Menus e Textos de Ajuda
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant={tab === 'perfis' ? 'primary' : 'utility'}
            onClick={() => setTab('perfis')}
          >
            Perfis e Contas de Acesso
          </Button>
          {isSuperAdmin && (
            <Button
              size="sm"
              variant={tab === 'parametros' ? 'primary' : 'utility'}
              onClick={() => setTab('parametros')}
            >
              Configurações Gerais do Sistema
            </Button>
          )}
        </div>
      </Card>

      {feedback && (
        <Alert tone={feedback.tone} title="Retorno da operação">
          {feedback.text}
        </Alert>
      )}

      {loading ? (
        <LoadingState label="Carregando..." />
      ) : (
        <div className="flex flex-col gap-5">
          {tab === 'empresas' && isSuperAdmin && (
            <div className="flex flex-col gap-5">
              <Card
                variant="flat"
                title="Cadastrar Nova Empresa"
                subtitle="Criação fechada exclusiva da administração."
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
                  <Input
                    name="name"
                    label="Nome do Estabelecimento"
                    placeholder="Ex: Balneário Sol"
                    required
                  />
                  <Input
                    name="slug"
                    label="Identificador na URL"
                    placeholder="Ex: balneario-sol"
                    required
                  />
                  <Input name="document_cnpj" label="CNPJ" placeholder="00.000.000/0001-00" />
                  <Select
                    name="business_vertical"
                    label="Ramo de Atuação"
                    options={[
                      { value: 'balneario', label: 'Balneário e Lazer' },
                      { value: 'general', label: 'Comércio e Alimentação' },
                    ]}
                  />
                  <Select
                    name="tax_regime"
                    label="Regime Tributário"
                    options={[
                      { value: 'simples_nacional', label: 'Simples Nacional' },
                      { value: 'lucro_presumido', label: 'Lucro Presumido' },
                      { value: 'lucro_real', label: 'Lucro Real' },
                      { value: 'mei', label: 'Microempreendedor Individual (MEI)' },
                    ]}
                  />

                  <div className="flex flex-col gap-2">
                    <p className="typo-caption font-medium text-ink-secondary">
                      Módulos Contratados pela Empresa
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {modules
                        .filter((m) => m.module_scope !== 'super_admin')
                        .map((mod) => {
                          const active = selectedEstModules.includes(mod.id);
                          return (
                            <Button
                              key={mod.id}
                              size="sm"
                              variant={active ? 'primary' : 'utility'}
                              onClick={() =>
                                setSelectedEstModules((prev) => toggleId(prev, mod.id))
                              }
                            >
                              {mod.label}
                            </Button>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isPending}
                      loadingText="Carregando..."
                    >
                      Salvar Empresa
                    </Button>
                  </div>
                </form>
              </Card>

              <Card variant="flat" title="Empresas Cadastradas">
                <ResponsiveDataTable
                  keyExtractor={(row) => row.id}
                  data={establishments}
                  columns={[
                    { key: 'name', header: 'Estabelecimento', render: (r) => r.name },
                    {
                      key: 'vertical',
                      header: 'Ramo',
                      render: (r) => <Badge sticker="teal">{humanizeVertical(r.business_vertical)}</Badge>,
                    },
                    {
                      key: 'regime',
                      header: 'Regime Tributário',
                      render: (r) => humanizeTaxRegime(r.tax_regime),
                    },
                  ]}
                />
              </Card>
            </div>
          )}

          {tab === 'modulos' && isSuperAdmin && (
            <div className="flex flex-col gap-5">
              <Card
                variant="flat"
                title="Configurar Item de Menu e Explicação de Ajuda"
                subtitle="Organize menus pais e filhos e escreva a explicação exibida no ícone de ajuda."
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
                          text: 'Menu atualizado. Saia e entre novamente para recarregar a barra lateral.',
                        });
                        await loadGovernanceData();
                      }
                    });
                  }}
                >
                  <Input
                    name="code"
                    label="Identificador Interno"
                    placeholder="Ex: erp.relatorios"
                    required
                  />
                  <Input name="label" label="Nome Exibido no Menu" placeholder="Ex: Relatórios" required />
                  <Select
                    name="parent_id"
                    label="Grupo Principal (opcional)"
                    options={[
                      { value: '', label: 'Menu Principal (Raiz)' },
                      ...modules
                        .filter((m) => !m.parent_id)
                        .map((m) => ({ value: m.id, label: m.label })),
                    ]}
                  />
                  <Input name="route_path" label="Endereço da Tela" placeholder="Ex: /relatorios" />
                  <Input name="icon_name" label="Nome do Ícone" defaultValue="Folder" />
                  <Select
                    name="module_scope"
                    label="Categoria do Módulo"
                    options={[
                      { value: 'core_erp', label: 'Padrão do Sistema' },
                      { value: 'balneario', label: 'Módulo Balneário' },
                      { value: 'super_admin', label: 'Administração Central' },
                    ]}
                  />
                  <Input name="sort_order" type="number" label="Ordem na Barra Lateral" defaultValue="10" />
                  <Input
                    name="help_title"
                    label="Título da Seção de Ajuda"
                    placeholder="Ex: Como usar esta tela"
                    required
                  />
                  <Textarea
                    name="help_text"
                    rows={3}
                    label="Texto Explicativo para o Usuário"
                    placeholder="Explique em frases simples o que o usuário faz nesta tela."
                    required
                  />
                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isPending}
                      loadingText="Carregando..."
                    >
                      Salvar Menu
                    </Button>
                  </div>
                </form>
              </Card>

              <Card variant="flat" title="Menus Cadastrados">
                <ResponsiveDataTable
                  keyExtractor={(row) => row.id}
                  data={modules}
                  columns={[
                    { key: 'label', header: 'Menu', render: (r) => r.label },
                    { key: 'path', header: 'Endereço', render: (r) => r.route_path ?? 'Grupo Principal' },
                    { key: 'help', header: 'Título da Ajuda', render: (r) => r.help_title },
                  ]}
                />
              </Card>
            </div>
          )}

          {tab === 'perfis' && (
            <div className="flex flex-col gap-5">
              <Card
                variant="flat"
                title="Criar Perfil de Acesso"
                subtitle="Ao marcar um grupo pai, todas as telas filhas dele são liberadas automaticamente."
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
                  <Input
                    name="name"
                    label="Nome do Perfil"
                    placeholder="Ex: Gerente Operacional"
                    required
                  />
                  <Input name="description" label="Resumo das Atribuições" />
                  <Select
                    name="can_cancel_sales"
                    label="Permissão para Estornar Vendas"
                    options={[
                      { value: 'false', label: 'Não autorizado a estornar vendas' },
                      { value: 'true', label: 'Autorizado a estornar vendas' },
                    ]}
                  />

                  <div className="flex flex-col gap-2">
                    <p className="typo-caption font-medium text-ink-secondary">
                      Menus Liberados neste Perfil
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {modules
                        .filter((m) => isSuperAdmin || m.module_scope !== 'super_admin')
                        .map((mod) => {
                          const active = selectedProfileModules.includes(mod.id);
                          return (
                            <Button
                              key={mod.id}
                              size="sm"
                              variant={active ? 'primary' : 'utility'}
                              onClick={() =>
                                setSelectedProfileModules((prev) => toggleId(prev, mod.id))
                              }
                            >
                              {mod.parent_id ? mod.label : `${mod.label} (Grupo Completo)`}
                            </Button>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isPending}
                      loadingText="Carregando..."
                    >
                      Salvar Perfil
                    </Button>
                  </div>
                </form>
              </Card>

              <Card
                variant="flat"
                title="Cadastrar Conta de Usuário"
                subtitle="Você pode atribuir um ou mais perfis para a mesma pessoa."
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
                        setFeedback({ tone: 'success', text: 'Conta de usuário criada com sucesso.' });
                        await loadGovernanceData();
                      }
                    });
                  }}
                >
                  <Input name="full_name" label="Nome Completo" required />
                  <Input name="email" type="email" label="E-mail de Acesso" required />
                  <Input name="password" type="password" label="Senha Inicial" required />

                  <div className="flex flex-col gap-2">
                    <p className="typo-caption font-medium text-ink-secondary">Perfis do Usuário</p>
                    <div className="flex flex-wrap gap-2">
                      {profiles.map((prof) => {
                        const active = selectedUserProfiles.includes(prof.id);
                        return (
                          <Button
                            key={prof.id}
                            size="sm"
                            variant={active ? 'primary' : 'utility'}
                            onClick={() => setSelectedUserProfiles((prev) => toggleId(prev, prof.id))}
                          >
                            {prof.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isPending}
                      loadingText="Carregando..."
                    >
                      Criar Conta de Acesso
                    </Button>
                  </div>
                </form>

                <div className="mt-5">
                  <Accordion title={`Contas Ativas (${users.length})`}>
                    <div className="flex flex-col gap-2">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between border-b border-hairline pb-2 last:border-0"
                        >
                          <div>
                            <p className="typo-body-sm font-medium">{u.full_name}</p>
                            <p className="typo-caption text-ink-muted">{u.email}</p>
                          </div>
                          {u.is_super_admin && <Badge sticker="purple">Administração Central</Badge>}
                        </div>
                      ))}
                    </div>
                  </Accordion>
                </div>
              </Card>
            </div>
          )}

          {tab === 'parametros' && isSuperAdmin && (
            <div className="flex flex-col gap-5">
              <Card
                variant="flat"
                title="Atualizar Configurações Gerais e Alíquotas"
                subtitle="Ajuste percentuais trabalhistas, faixas de impostos e regras sem alterar código."
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
                  <Select
                    name="chave_parametro"
                    label="Configuração"
                    defaultValue="clt_tributos_vigentes"
                    options={[
                      {
                        value: 'clt_tributos_vigentes',
                        label: 'Regras e Encargos Trabalhistas (CLT)',
                      },
                      {
                        value: 'paginacao_padrao_grid',
                        label: 'Quantidade de Itens por Página',
                      },
                    ]}
                  />
                  <Select
                    name="scope"
                    label="Onde Aplicar"
                    options={[
                      { value: 'global', label: 'Padrão para todas as empresas' },
                      { value: 'tenant', label: 'Apenas para a empresa selecionada' },
                    ]}
                  />
                  <Textarea
                    name="valor_parametro"
                    rows={8}
                    label="Conteúdo da Configuração"
                    defaultValue={
                      parametros.find((p) => p.chave_parametro === 'clt_tributos_vigentes')
                        ?.valor_parametro ?? ''
                    }
                    required
                  />
                  <Input
                    name="descricao"
                    label="Observação de Referência"
                    defaultValue="Alíquotas, faixas progressivas e provisões vigentes da CLT."
                  />
                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isPending}
                      loadingText="Carregando..."
                    >
                      Salvar Configuração
                    </Button>
                  </div>
                </form>
              </Card>

              <Card variant="flat" title="Configurações Ativas">
                <ResponsiveDataTable
                  keyExtractor={(row) => row.id}
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
                          {r.establishment_id ? 'Empresa Específica' : 'Padrão Geral'}
                        </Badge>
                      ),
                    },
                    { key: 'desc', header: 'Descrição', render: (r) => r.descricao ?? '' },
                  ]}
                />
              </Card>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
