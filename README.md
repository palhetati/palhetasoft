# Palheta Soft ERP (Ciclo 1)

Sistema ERP SaaS multi-empresa responsivo (Mobile, Tablet e Desktop) construído em **Next.js (App Router + TypeScript)** e **Supabase (PostgreSQL + RLS + RPCs)**, seguindo fielmente o arquivo `DESIGN.md`.

## Como Subir com Docker Local (Supabase CLI)

1. Certifique-se de que o **Docker Desktop** esteja aberto e rodando.
2. Inicie os containers locais do Supabase (aplica automaticamente `supabase/migrations/` e `supabase/seed.sql`):
   ```bash
   npx supabase start
   ```
   *(Para reaplicar do zero as migrations e o seed a qualquer momento, execute `npx supabase db reset`.)*
3. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` exibidos no terminal pelo comando `npx supabase status`.
4. Inicie o servidor de desenvolvimento do Next.js:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:3000`.

## Contas Iniciais Semeadas (`supabase/seed.sql`)

Todas utilizam a senha padrão de desenvolvimento **`palheta123`**:

- **Super Admin (acesso total + seletor de empresas + `parametros_web`):** `superadmin@palhetasoft.com`
- **Gestor do Balneário Águas Claras (acesso completo ao ERP da empresa):** `admin@aguasclaras.com`
- **Operador de Caixa (acesso exclusivo ao PDV e Caixa):** `caixa@aguasclaras.com`

## Scripts de Verificação

- **Testes Automatizados (Vitest):** `npm test`
- **Build de Produção:** `npm run build`
