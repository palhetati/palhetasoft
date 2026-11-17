import { roundCents } from '@/lib/formatters';

export interface CltInssBracket {
  upTo: number;
  rate: number;
}

export interface CltIrrfBracket {
  upTo: number;
  rate: number;
  deduction: number;
}

export interface CltRegimeRates {
  employerInssRate: number;
  ratRate: number;
}

export interface CltTaxParameters {
  fgtsRate: number;
  vacationBonusFraction: number;
  thirteenthFraction: number;
  vacationMonthlyFraction: number;
  vtEmployeeCapPercent: number;
  inssBrackets: CltInssBracket[];
  irrfBrackets: CltIrrfBracket[];
  employerRatesByRegime: Record<string, CltRegimeRates>;
  dueDays: {
    salaryDay: number;
    fgtsDay: number;
    inssDay: number;
    benefitsDay: number;
  };
}

export interface CltEmployeeInput {
  baseSalaryMonthly: number;
  transportAllowanceMonthly: number;
  mealAllowanceMonthly: number;
  otherBenefitsMonthly: number;
  customEmployerInssRate?: number | null;
  customRatRate?: number | null;
}

export interface CltBreakdownResult {
  grossSalary: number;
  employeeInssWithheld: number;
  employeeIrrfWithheld: number;
  employeeVtDeduction: number;
  netSalaryToEmployee: number;
  fgtsMonthly: number;
  employerInssMonthly: number;
  inssGuideTotal: number;
  employerBenefitsNetCost: number;
  provision13thTotal: number;
  provisionVacationTotal: number;
  monthlyCashOutflowTotal: number;
  monthlyProvisionsTotal: number;
  effectiveTotalMonthlyCost: number;
}

function computeProgressiveInss(salary: number, brackets: CltInssBracket[]): number {
  const sorted = [...brackets].sort((a, b) => a.upTo - b.upTo);
  let previousCap = 0;
  let total = 0;

  for (const bracket of sorted) {
    if (salary <= previousCap) break;
    const taxableSlice = Math.min(salary, bracket.upTo) - previousCap;
    if (taxableSlice > 0) {
      total += (taxableSlice * bracket.rate) / 100;
    }
    previousCap = bracket.upTo;
  }

  return roundCents(total);
}

function computeIrrf(taxableBase: number, brackets: CltIrrfBracket[]): number {
  const sorted = [...brackets].sort((a, b) => a.upTo - b.upTo);
  const matched = sorted.find((b) => taxableBase <= b.upTo) ?? sorted[sorted.length - 1];
  if (!matched || matched.rate <= 0) return 0;
  const raw = (taxableBase * matched.rate) / 100 - matched.deduction;
  return roundCents(Math.max(0, raw));
}

export function calculateCltAccountingBreakdown(
  employee: CltEmployeeInput,
  taxRegime: string,
  params: CltTaxParameters
): CltBreakdownResult {
  const grossSalary = roundCents(Math.max(0, employee.baseSalaryMonthly));
  const employeeInssWithheld = computeProgressiveInss(grossSalary, params.inssBrackets);
  const employeeIrrfWithheld = computeIrrf(
    Math.max(0, grossSalary - employeeInssWithheld),
    params.irrfBrackets
  );

  const vtCapAmount = roundCents((grossSalary * params.vtEmployeeCapPercent) / 100);
  const employeeVtDeduction =
    employee.transportAllowanceMonthly > 0
      ? roundCents(Math.min(employee.transportAllowanceMonthly, vtCapAmount))
      : 0;

  const netSalaryToEmployee = roundCents(
    Math.max(0, grossSalary - employeeInssWithheld - employeeIrrfWithheld - employeeVtDeduction)
  );

  const fgtsMonthly = roundCents((grossSalary * params.fgtsRate) / 100);

  const regimeConfig = params.employerRatesByRegime[taxRegime] ?? {
    employerInssRate: 0,
    ratRate: 0,
  };
  const effectiveEmployerInssRate =
    employee.customEmployerInssRate ?? regimeConfig.employerInssRate;
  const effectiveRatRate = employee.customRatRate ?? regimeConfig.ratRate;
  const totalEmployerSocialRate = effectiveEmployerInssRate + effectiveRatRate;

  const employerInssMonthly = roundCents((grossSalary * totalEmployerSocialRate) / 100);
  const inssGuideTotal = roundCents(
    employerInssMonthly + employeeInssWithheld + employeeIrrfWithheld
  );

  const employerVtNet = Math.max(0, employee.transportAllowanceMonthly - employeeVtDeduction);
  const employerBenefitsNetCost = roundCents(
    employerVtNet + employee.mealAllowanceMonthly + employee.otherBenefitsMonthly
  );

  // Provisions: 13th + FGTS/Employer INSS on 13th
  const base13th = grossSalary * params.thirteenthFraction;
  const chargesMultiplier = 1 + (params.fgtsRate + totalEmployerSocialRate) / 100;
  const provision13thTotal = roundCents(base13th * chargesMultiplier);

  // Provisions: Vacation (1/12) + Constitutional Bonus (e.g. 1/3) + FGTS/Employer INSS
  const baseVacationWithBonus =
    grossSalary * params.vacationMonthlyFraction * (1 + params.vacationBonusFraction);
  const provisionVacationTotal = roundCents(baseVacationWithBonus * chargesMultiplier);

  const monthlyCashOutflowTotal = roundCents(
    netSalaryToEmployee + fgtsMonthly + inssGuideTotal + employerBenefitsNetCost
  );
  const monthlyProvisionsTotal = roundCents(provision13thTotal + provisionVacationTotal);
  const effectiveTotalMonthlyCost = roundCents(monthlyCashOutflowTotal + monthlyProvisionsTotal);

  return {
    grossSalary,
    employeeInssWithheld,
    employeeIrrfWithheld,
    employeeVtDeduction,
    netSalaryToEmployee,
    fgtsMonthly,
    employerInssMonthly,
    inssGuideTotal,
    employerBenefitsNetCost,
    provision13thTotal,
    provisionVacationTotal,
    monthlyCashOutflowTotal,
    monthlyProvisionsTotal,
    effectiveTotalMonthlyCost,
  };
}

function buildDueDate(competenceMonth: string, day: number, nextMonth = false): string {
  const [yStr, mStr] = competenceMonth.split('-');
  let year = Number(yStr);
  let month = Number(mStr);
  if (nextMonth) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  const safeDay = String(Math.min(Math.max(1, day), 28)).padStart(2, '0');
  return `${year}-${String(month).padStart(2, '0')}-${safeDay}`;
}

export function buildMonthlyCltObligationPayloads(
  employeeName: string,
  competenceMonth: string,
  breakdown: CltBreakdownResult,
  params: CltTaxParameters
) {
  const items: Array<{
    obligation_code: string;
    description: string;
    amount: number;
    due_date: string;
    is_provision: boolean;
    metadata: Record<string, unknown>;
  }> = [
    {
      obligation_code: 'clt_salary',
      description: `Salário Líquido CLT (${competenceMonth}): ${employeeName}`,
      amount: breakdown.netSalaryToEmployee,
      due_date: buildDueDate(competenceMonth, params.dueDays.salaryDay, true),
      is_provision: false,
      metadata: { grossSalary: breakdown.grossSalary },
    },
    {
      obligation_code: 'clt_fgts',
      description: `Guia FGTS Mensal (${competenceMonth}): ${employeeName}`,
      amount: breakdown.fgtsMonthly,
      due_date: buildDueDate(competenceMonth, params.dueDays.fgtsDay, true),
      is_provision: false,
      metadata: { fgtsRate: params.fgtsRate },
    },
    {
      obligation_code: 'clt_inss',
      description: `Guia Previdenciária INSS/IRRF (${competenceMonth}): ${employeeName}`,
      amount: breakdown.inssGuideTotal,
      due_date: buildDueDate(competenceMonth, params.dueDays.inssDay, true),
      is_provision: false,
      metadata: {
        employeeInssWithheld: breakdown.employeeInssWithheld,
        employerInssMonthly: breakdown.employerInssMonthly,
      },
    },
  ];

  if (breakdown.employerBenefitsNetCost > 0) {
    items.push({
      obligation_code: 'clt_benefits',
      description: `Benefícios VT/VA (${competenceMonth}): ${employeeName}`,
      amount: breakdown.employerBenefitsNetCost,
      due_date: buildDueDate(competenceMonth, params.dueDays.benefitsDay, false),
      is_provision: false,
      metadata: {},
    });
  }

  items.push(
    {
      obligation_code: 'clt_provision_13th',
      description: `Reserva Contábil 13º Salário (${competenceMonth}): ${employeeName}`,
      amount: breakdown.provision13thTotal,
      due_date: buildDueDate(competenceMonth, 28, false),
      is_provision: true,
      metadata: { reserveType: '13th_salary' },
    },
    {
      obligation_code: 'clt_provision_vacation',
      description: `Reserva Contábil Férias + 1/3 (${competenceMonth}): ${employeeName}`,
      amount: breakdown.provisionVacationTotal,
      due_date: buildDueDate(competenceMonth, 28, false),
      is_provision: true,
      metadata: { reserveType: 'vacation_plus_third' },
    }
  );

  return items.filter((i) => i.amount > 0);
}
