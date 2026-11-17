import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateUserFacingCopy } from '@/lib/copy-guard';

describe('Migration 002 ERP Core & Local Docker Seed', () => {
  it('defines all 11 Frente 1 ERP tables with RLS enabled and atomic RPC functions', () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/20261117000002_erp_core_and_rpcs.sql'),
      'utf8'
    );

    const requiredTables = [
      'financial_categories',
      'payment_method_configs',
      'register_points',
      'cash_registers',
      'products',
      'sales',
      'sale_items',
      'sale_payments',
      'employees',
      'expenses',
      'cash_movements',
    ];

    for (const table of requiredTables) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }

    // Partial unique index allowing multiple open registers across points, 1 per point
    expect(sql).toContain('cash_registers_one_open_per_point_idx');

    // Reserved hook for Cycle 2 Balneário prepaid credits
    expect(sql).toContain("'customer_credit'");

    // Transactional RPCs
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.complete_pdv_sale');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.cancel_pdv_sale');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.close_cash_register');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.generate_clt_monthly_obligations');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_financial_dashboard');
  });

  it('seeds valid JSON CLT tax parameters in parametros_web and dash-free module help texts', () => {
    const seed = fs.readFileSync(path.resolve(process.cwd(), 'supabase/seed.sql'), 'utf8');

    // Check zero em-dashes or en-dashes across the entire seed file
    const copyCheck = validateUserFacingCopy(seed);
    expect(copyCheck.valid).toBe(true);

    // Extract clt_tributos_vigentes JSON payload from seed
    const match = seed.match(/'clt_tributos_vigentes',\s*'(\{[\s\S]*?\})'/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match![1]);
    expect(parsed.fgtsRate).toBeGreaterThan(0);
    expect(Array.isArray(parsed.inssBrackets)).toBe(true);
    expect(parsed.inssBrackets.length).toBeGreaterThanOrEqual(4);
    expect(parsed.vacationBonusFraction).toBeGreaterThan(0);
    expect(parsed.thirteenthFraction).toBeGreaterThan(0);
    expect(parsed.vtEmployeeCapPercent).toBeGreaterThan(0);
    expect(parsed.dueDays).toBeDefined();
  });
});
