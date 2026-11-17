import { describe, expect, it } from 'vitest';
import {
  buildMonthlyCltObligationPayloads,
  calculateCltAccountingBreakdown,
  type CltTaxParameters,
} from '@/modules/employees/clt-calculator';

const SAMPLE_PARAMS: CltTaxParameters = {
  fgtsRate: 8,
  vacationBonusFraction: 1 / 3,
  thirteenthFraction: 1 / 12,
  vacationMonthlyFraction: 1 / 12,
  vtEmployeeCapPercent: 6,
  inssBrackets: [
    { upTo: 1500, rate: 7.5 },
    { upTo: 3000, rate: 9.0 },
    { upTo: 4500, rate: 12.0 },
    { upTo: 8000, rate: 14.0 },
  ],
  irrfBrackets: [
    { upTo: 2500, rate: 0, deduction: 0 },
    { upTo: 4000, rate: 7.5, deduction: 187.5 },
  ],
  employerRatesByRegime: {
    simples_nacional: { employerInssRate: 0, ratRate: 0 },
    lucro_presumido: { employerInssRate: 20, ratRate: 2 },
  },
  dueDays: {
    salaryDay: 5,
    fgtsDay: 20,
    inssDay: 20,
    benefitsDay: 1,
  },
};

describe('Parameterized CLT Accounting Calculator (parametros_web driven)', () => {
  it('calculates slice-based progressive INSS, VT cap, FGTS, and separate 13th/Vacation reserves exclusively from params', () => {
    // Salary = 2000:
    // Slice 1: 1500 * 7.5% = 112.50
    // Slice 2: (2000 - 1500) * 9.0% = 45.00
    // Employee INSS = 157.50
    // VT requested = 250; employee VT cap (6% of 2000) = 120; employer VT cost = 130
    // Net salary = 2000 - 157.50 - 120 = 1722.50
    // FGTS = 2000 * 8% = 160.00
    const simples = calculateCltAccountingBreakdown(
      {
        baseSalaryMonthly: 2000,
        transportAllowanceMonthly: 250,
        mealAllowanceMonthly: 300,
        otherBenefitsMonthly: 0,
      },
      'simples_nacional',
      SAMPLE_PARAMS
    );

    expect(simples.employeeInssWithheld).toBe(157.5);
    expect(simples.employeeVtDeduction).toBe(120);
    expect(simples.netSalaryToEmployee).toBe(1722.5);
    expect(simples.fgtsMonthly).toBe(160);
    expect(simples.employerInssMonthly).toBe(0);
    expect(simples.inssGuideTotal).toBe(157.5); // employee withheld remitted via guide
    expect(simples.employerBenefitsNetCost).toBe(430); // (250 - 120) + 300

    // Dynamic parameter sensitivity (changing fgtsRate in params changes calculation immediately)
    const customFgts = calculateCltAccountingBreakdown(
      {
        baseSalaryMonthly: 2000,
        transportAllowanceMonthly: 0,
        mealAllowanceMonthly: 0,
        otherBenefitsMonthly: 0,
      },
      'simples_nacional',
      { ...SAMPLE_PARAMS, fgtsRate: 2 }
    );
    expect(customFgts.fgtsMonthly).toBe(40);
  });

  it('applies employer INSS + RAT under lucro_presumido and builds separated monthly obligations and provisions', () => {
    const presumido = calculateCltAccountingBreakdown(
      {
        baseSalaryMonthly: 2000,
        transportAllowanceMonthly: 0,
        mealAllowanceMonthly: 0,
        otherBenefitsMonthly: 0,
      },
      'lucro_presumido',
      SAMPLE_PARAMS
    );

    // 20% + 2% RAT = 22% of 2000 = 440 employer INSS
    expect(presumido.employerInssMonthly).toBe(440);
    expect(presumido.inssGuideTotal).toBe(597.5); // 440 + 157.50 employee withheld

    const payloads = buildMonthlyCltObligationPayloads(
      'Carlos Salva Vidas',
      '2026-11',
      presumido,
      SAMPLE_PARAMS
    );

    const cashTitles = payloads.filter((p) => !p.is_provision);
    const provisionTitles = payloads.filter((p) => p.is_provision);

    expect(cashTitles.map((t) => t.obligation_code)).toEqual([
      'clt_salary',
      'clt_fgts',
      'clt_inss',
    ]);
    expect(provisionTitles.map((t) => t.obligation_code)).toEqual([
      'clt_provision_13th',
      'clt_provision_vacation',
    ]);
  });
});
