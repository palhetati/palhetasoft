'use client';

import React, { useState, useTransition } from 'react';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Input,
  ResponsiveDataTable,
  Select,
  Textarea,
} from '@/components/ui';
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
  establishments: Array<{
    id: string;
    name: string;
    slug: string;
    business_vertical: string;
    tax_regime: string;
  }>;
  modules: SystemModuleRow[];
  profiles: Array<{ id: string; name: string; description: string | null; can_cancel_sales: boolean }>;
  users: Array<{ id: string; full_name: string; email: string; is_super_admin: boolean }>;
  parametros: ParametroWebRow[];
}

export function AdminClient({
  isSuperAdmin,
  activeEstablishmentId,
  establishments,
  modules,
  profiles,
  users,
  parametros,
}: AdminClientProps) {
  const [tab, setTab] = useState<'empresas' | 'modulos' | 'perfis' | 'parametros'>(
    isSuperAdmin ? 'empresas' : 'perfis'
  );
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const [selectedEstModules, setSelectedEstModules] = useState<string[]>(
    modules.filter((m) => m.module_scope === 'core_erp').map((m) => m.id)
  );
  const [selectedProfileModules, setSelectedProfileModules] = useState<string[]>([]);
  const [selectedUserProfiles, setSelectedUserProfiles] = useState<string[]>([]);

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {isSuperAdmin && (
          <>
            <Button
              variant={tab === 'empresas' ? 'primary' : 'utility'}
              onClick={() => setTab('empresas')}
            >
              Empresas Clientes
            </Button>
            <Button
              variant={tab === 'modulos' ? 'primary' : 'utility'}
              onClick={() => setTab('modulos')}
            >
              Árvore de Módulos e Ajuda
            </Button>
          </>
        )}
        <Button
          variant={tab === 'perfis' ? 'primary' : 'utility'}
          onClick={() => setTab('perfis')}
        >
          Perfis e Usuários
        </Button>
        {isSuperAdmin && (
          <Button
            variant={tab === 'parametros' ? 'primary' : 'utility'}
            onClick={() => setTab('parametros')}
          >
            Parâmetros Globais (parametros_web)
          </Button>
        )}
      </div>

      {feedback && (
        <Alert tone={feedback.tone} title="Retorno da operação">
          {feedback.text}
        </Alert>
      )}

      {tab === 'empresas' && isSuperAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Cadastrar Nova Empresa" subtitle="Onboarding fechado gerenciado pelo Super Admin.">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                selectedEstModules.forEach((id) => fd.append('module_ids', id));
                startTransition(async () => {
                  const res = await createEstablishmentAction(fd);
                  if (res.error) setFeedback({ tone: 'warning', text: res.error });
                  else setFeedback({ tone: 'success', text: 'Empresa cadastrada com sucesso.' });
                });
              }}
            >
              <Input name="name" label="Nome do Estabelecimento" placeholder="Ex: Balneário Sol" required />
              <Input name="slug" label="Slug Identificador" placeholder="Ex: balneario-sol" required />
              <Input name="document_cnpj" label="CNPJ" placeholder="00.000.000/0001-00" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  name="business_vertical"
                  label="Segmento Vertical"
                  options={[
                    { value: 'balneario', label: 'Balneário' },
                    { value: 'general', label: 'Comércio ou Restaurante Geral' },
                  ]}
                />
                <Select
                  name="tax_regime"
                  label="Regime Tributário"
                  options={[
                    { value: 'simples_nacional', label: 'Simples Nacional' },
                    { value: 'lucro_presumido', label: 'Lucro Presumido' },
                    { value: 'lucro_real', label: 'Lucro Real' },
                    { value: 'mei', label: 'MEI' },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <p className="typo-caption font-medium text-ink-secondary">Módulos Habilitados</p>
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
                          onClick={() => setSelectedEstModules((prev) => toggleId(prev, mod.id))}
                        >
                          {mod.label}
                        </Button>
                      );
                    })}
                </div>
              </div>

              <Button type="submit" variant="primary" disabled={isPending}>
                Salvar Empresa
              </Button>
            </form>
          </Card>

          <div className="space-y-4">
            <ResponsiveDataTable
              keyExtractor={(row) => row.id}
              data={establishments}
              columns={[
                { key: 'name', header: 'Empresa', render: (r) => r.name },
                {
                  key: 'vertical',
                  header: 'Vertical',
                  render: (r) => <Badge sticker="teal">{r.business_vertical}</Badge>,
                },
                { key: 'regime', header: 'Regime', render: (r) => r.tax_regime },
              ]}
            />
          </div>
        </div>
      )}

      {tab === 'modulos' && isSuperAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Configurar Módulo e Ajuda Contextual (?)"
            subtitle="Configure pai, filho, rota, ícone e o texto explicativo livre de travessões."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await upsertSystemModuleAction(fd);
                  if (res.error) setFeedback({ tone: 'warning', text: res.error });
                  else setFeedback({ tone: 'success', text: 'Módulo salvo. Relogue para atualizar o menu.' });
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="code" label="Código Único" placeholder="Ex: erp.relatorios" required />
                <Input name="label" label="Nome no Menu" placeholder="Ex: Relatórios" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  name="parent_id"
                  label="Módulo Pai (opcional)"
                  options={[
                    { value: '', label: 'Raiz (Módulo Pai)' },
                    ...modules
                      .filter((m) => !m.parent_id)
                      .map((m) => ({ value: m.id, label: m.label })),
                  ]}
                />
                <Input name="route_path" label="Caminho da Rota" placeholder="Ex: /relatorios" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input name="icon_name" label="Ícone Lucide" defaultValue="Folder" />
                <Select
                  name="module_scope"
                  label="Escopo"
                  options={[
                    { value: 'core_erp', label: 'ERP Padrão' },
                    { value: 'balneario', label: 'Balneário' },
                    { value: 'super_admin', label: 'Super Admin' },
                  ]}
                />
                <Input name="sort_order" type="number" label="Ordem" defaultValue="10" />
              </div>
              <Input
                name="help_title"
                label="Título da Ajuda (?)"
                placeholder="Ex: Como usar esta tela"
                required
              />
              <Textarea
                name="help_text"
                rows={3}
                label="Explicação clara para o usuário (sem travessões)"
                placeholder="Explique de forma simples o que o usuário faz nesta tela."
                required
              />
              <Button type="submit" variant="primary" disabled={isPending}>
                Salvar Módulo
              </Button>
            </form>
          </Card>

          <ResponsiveDataTable
            keyExtractor={(row) => row.id}
            data={modules}
            columns={[
              { key: 'label', header: 'Menu', render: (r) => r.label },
              { key: 'path', header: 'Rota', render: (r) => r.route_path ?? 'Agrupador Pai' },
              { key: 'help', header: 'Ajuda (?)', render: (r) => r.help_title },
            ]}
          />
        </div>
      )}

      {tab === 'perfis' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Novo Perfil de Acesso"
            subtitle="Selecione um módulo pai para liberar todos os filhos ou escolha filhos específicos."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                selectedProfileModules.forEach((id) => fd.append('module_ids', id));
                startTransition(async () => {
                  const res = await createAccessProfileAction(fd);
                  if (res.error) setFeedback({ tone: 'warning', text: res.error });
                  else setFeedback({ tone: 'success', text: 'Perfil criado com sucesso.' });
                });
              }}
            >
              <Input name="name" label="Nome do Perfil" placeholder="Ex: Gerente Operacional" required />
              <Input name="description" label="Descrição" placeholder="Resumo do papel na equipe" />
              <Select
                name="can_cancel_sales"
                label="Pode estornar vendas no PDV?"
                options={[
                  { value: 'false', label: 'Não' },
                  { value: 'true', label: 'Sim, autorizado a estornar vendas' },
                ]}
              />

              <div className="space-y-2">
                <p className="typo-caption font-medium text-ink-secondary">
                  Módulos atribuídos ao Perfil
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
                          onClick={() => setSelectedProfileModules((prev) => toggleId(prev, mod.id))}
                        >
                          {mod.parent_id ? `↳ ${mod.label}` : `${mod.label} (Pai)`}
                        </Button>
                      );
                    })}
                </div>
              </div>

              <Button type="submit" variant="primary" disabled={isPending}>
                Criar Perfil
              </Button>
            </form>
          </Card>

          <Card
            title="Cadastrar Usuário da Empresa"
            subtitle="Um usuário pode receber um ou vários perfis simultaneamente."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                if (activeEstablishmentId) fd.set('establishment_id', activeEstablishmentId);
                selectedUserProfiles.forEach((id) => fd.append('profile_ids', id));
                startTransition(async () => {
                  const res = await createClosedUserAction(fd);
                  if (res.error) setFeedback({ tone: 'warning', text: res.error });
                  else setFeedback({ tone: 'success', text: 'Usuário criado e vinculado aos perfis.' });
                });
              }}
            >
              <Input name="full_name" label="Nome Completo" required />
              <Input name="email" type="email" label="E-mail de Login" required />
              <Input name="password" type="password" label="Senha Inicial" required />

              <div className="space-y-2">
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

              <Button type="submit" variant="primary" disabled={isPending}>
                Criar Conta de Usuário
              </Button>
            </form>

            <div className="mt-6">
              <Accordion title={`Usuários Cadastrados (${users.length})`}>
                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between border-b border-hairline pb-2 last:border-0"
                    >
                      <div>
                        <p className="typo-body-sm font-medium">{u.full_name}</p>
                        <p className="typo-caption text-ink-muted">{u.email}</p>
                      </div>
                      {u.is_super_admin && <Badge sticker="purple">Super Admin</Badge>}
                    </div>
                  ))}
                </div>
              </Accordion>
            </div>
          </Card>
        </div>
      )}

      {tab === 'parametros' && isSuperAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Editar Parâmetro (parametros_web)"
            subtitle="Altere alíquotas da CLT, faixas de INSS e regras sem mexer no código."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await upsertParametroWebAction(fd);
                  if (res.error) setFeedback({ tone: 'warning', text: res.error });
                  else setFeedback({ tone: 'success', text: 'Parâmetro atualizado com sucesso.' });
                });
              }}
            >
              <Input
                name="chave_parametro"
                label="Chave do Parâmetro (chave_parametro)"
                defaultValue="clt_tributos_vigentes"
                required
              />
              <Select
                name="scope"
                label="Abrangência"
                options={[
                  { value: 'global', label: 'Global (Padrão para todo o sistema)' },
                  { value: 'tenant', label: 'Específico da Empresa Ativa' },
                ]}
              />
              <Textarea
                name="valor_parametro"
                rows={8}
                label="Valor do Parâmetro (valor_parametro JSON ou Texto amplo)"
                defaultValue={
                  parametros.find((p) => p.chave_parametro === 'clt_tributos_vigentes')
                    ?.valor_parametro ?? ''
                }
                required
              />
              <Input
                name="descricao"
                label="Descrição"
                defaultValue="Alíquotas, faixas progressivas e provisões vigentes da CLT."
              />
              <Button type="submit" variant="primary" disabled={isPending}>
                Salvar Parâmetro
              </Button>
            </form>
          </Card>

          <ResponsiveDataTable
            keyExtractor={(row) => row.id}
            data={parametros}
            columns={[
              { key: 'chave', header: 'Chave', render: (r) => r.chave_parametro },
              {
                key: 'escopo',
                header: 'Escopo',
                render: (r) => (
                  <Badge sticker={r.establishment_id ? 'orange' : 'green'}>
                    {r.establishment_id ? 'Empresa' : 'Global'}
                  </Badge>
                ),
              },
              { key: 'desc', header: 'Descrição', render: (r) => r.descricao ?? '' },
            ]}
          />
        </div>
      )}
    </div>
  );
}
