import React from 'react';
import { PageHeader } from '@/components/ui';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';
import type { CltTaxParameters } from '@/modules/employees/clt-calculator';
import { resolveParametroValue } from '@/modules/parametros/service';
import type { ParametroWebRow } from '@/modules/parametros/types';
import { EmployeesClient, type EmployeeRow } from './employees-client';

export default async function EmployeesPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/funcionarios');
  const supabase = await createSupabaseServerClient();
  const estId = session.activeEstablishmentId ?? '';

  const [{ data: employees }, { data: est }, { data: paramRows }, { data: openRegs }] =
    await Promise.all([
      supabase
        .from('employees')
        .select('*')
        .eq('establishment_id', estId)
        .eq('is_active', true)
        .order('full_name'),
      supabase.from('establishments').select('tax_regime').eq('id', estId).maybeSingle(),
      supabase
        .from('parametros_web')
        .select('*')
        .eq('chave_parametro', 'clt_tributos_vigentes'),
      supabase
        .from('cash_registers')
        .select('id, register_points(name)')
        .eq('establishment_id', estId)
        .eq('status', 'open'),
    ]);

  const cltParams = resolveParametroValue<CltTaxParameters>(
    (paramRows ?? []) as ParametroWebRow[],
    'clt_tributos_vigentes',
    estId
  );

  const mappedRegisters = (openRegs ?? []).map((r: Record<string, unknown>) => {
    const point = r.register_points as { name?: string } | null;
    return {
      id: String(r.id),
      label: point?.name ?? `Caixa #${String(r.id).slice(0, 6)}`,
    };
  });

  return (
    <div>
      <PageHeader
        title={moduleHelp?.label ?? 'Funcionários CLT e Diaristas'}
        subtitle="Simulador contábil CLT parametrizado e lançamento rápido de equipe extra."
        helpTitle={moduleHelp?.helpTitle ?? 'Gestão de Funcionários CLT e Diaristas'}
        helpText={
          moduleHelp?.helpText ??
          'Cadastre funcionários CLT visualizando automaticamente todos os encargos e reservas contábeis parametrizados, ou registre pagamentos rápidos de diaristas como despesa variável.'
        }
      />

      <EmployeesClient
        employees={((employees ?? []) as EmployeeRow[]).map((e) => ({
          ...e,
          base_salary_monthly: Number(e.base_salary_monthly),
          daily_rate: Number(e.daily_rate),
          transport_allowance_monthly: Number(e.transport_allowance_monthly),
          meal_allowance_monthly: Number(e.meal_allowance_monthly),
          other_benefits_monthly: Number(e.other_benefits_monthly),
        }))}
        taxRegime={est?.tax_regime ?? 'simples_nacional'}
        cltParams={cltParams}
        openRegisters={mappedRegisters}
      />
    </div>
  );
}
