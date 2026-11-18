-- ============================================================================
-- PALHETA SOFT ERP - MIGRATION 001
-- Multi-Tenant Core, Dynamic Module Tree with Contextual Help, RBAC & parametros_web
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ESTABLISHMENTS (Empresas clientes no schema public)
CREATE TABLE IF NOT EXISTS public.establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  document_cnpj text,
  business_vertical text NOT NULL DEFAULT 'general'
    CHECK (business_vertical IN ('general', 'balneario')),
  tax_regime text NOT NULL DEFAULT 'simples_nacional'
    CHECK (tax_regime IN ('simples_nacional', 'lucro_presumido', 'lucro_real', 'mei')),
  allow_negative_stock boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. APP_USERS (Vinculado 1:1 com auth.users; Super-Admin pode ter establishment_id NULL)
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  is_super_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_users_tenant_required_for_non_super
    CHECK (is_super_admin = true OR establishment_id IS NOT NULL)
);

-- 3. SYSTEM_MODULES (Árvore hierárquica de módulos + textos de ajuda sem travessões)
CREATE TABLE IF NOT EXISTS public.system_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.system_modules(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  route_path text,
  icon_name text NOT NULL DEFAULT 'Folder',
  help_title text NOT NULL CHECK (help_title !~ '[—–]'),
  help_text text NOT NULL CHECK (help_text !~ '[—–]'),
  module_scope text NOT NULL DEFAULT 'core_erp'
    CHECK (module_scope IN ('super_admin', 'core_erp', 'balneario')),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_modules_parent_idx ON public.system_modules(parent_id);

-- 4. PARAMETROS_WEB (Tabela global de parâmetros dinâmicos e tributários)
CREATE TABLE IF NOT EXISTS public.parametros_web (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE CASCADE,
  chave_parametro text NOT NULL,
  valor_parametro text NOT NULL,
  descricao text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS parametros_web_scope_key_idx
  ON public.parametros_web (
    COALESCE(establishment_id, '00000000-0000-0000-0000-000000000000'::uuid),
    chave_parametro
  );

-- 5. ESTABLISHMENT_MODULES (Módulos contratados/ativos na empresa)
CREATE TABLE IF NOT EXISTS public.establishment_modules (
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.system_modules(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (establishment_id, module_id)
);

-- 6. ACCESS_PROFILES (Perfis de acesso atribuíveis a usuários)
CREATE TABLE IF NOT EXISTS public.access_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  can_cancel_sales boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. PROFILE_MODULES (Módulos pai ou filho vinculados ao perfil)
CREATE TABLE IF NOT EXISTS public.profile_modules (
  profile_id uuid NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.system_modules(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, module_id)
);

-- 8. USER_PROFILES (Relação N:N permitindo múltiplos perfis por usuário)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, profile_id)
);

-- ============================================================================
-- HELPER FUNCTIONS & RLS POLICIES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.is_super_admin AND u.is_active FROM public.app_users u WHERE u.id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_establishment(target_establishment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users u
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND (
        u.is_super_admin = true
        OR u.establishment_id = target_establishment_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_establishment(target_establishment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1
    FROM public.app_users u
    JOIN public.user_profiles up ON up.user_id = u.id
    JOIN public.access_profiles ap ON ap.id = up.profile_id
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND u.establishment_id = target_establishment_id
      AND ap.can_cancel_sales = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_parametro_web(
  p_chave text,
  p_establishment_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pw.valor_parametro
  FROM public.parametros_web pw
  WHERE pw.chave_parametro = p_chave
    AND (
      (p_establishment_id IS NOT NULL AND pw.establishment_id = p_establishment_id AND public.can_access_establishment(p_establishment_id))
      OR pw.establishment_id IS NULL
    )
  ORDER BY (pw.establishment_id IS NULL) ASC
  LIMIT 1;
$$;

-- RPC: Resolve User Navigation Tree on Login (bound strictly to auth.uid())
CREATE OR REPLACE FUNCTION public.resolve_user_navigation(
  p_user_id uuid,
  p_active_establishment_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  code text,
  label text,
  route_path text,
  icon_name text,
  help_title text,
  help_text text,
  module_scope text,
  sort_order integer,
  can_cancel_sales boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_super boolean := false;
  v_user_est uuid := NULL;
  v_effective_est uuid := NULL;
  v_can_cancel boolean := false;
BEGIN
  IF v_caller IS NULL OR (v_caller <> p_user_id AND NOT public.is_super_admin()) THEN
    RAISE EXCEPTION 'Acesso negado ao carregar árvore de navegação.';
  END IF;

  SELECT u.is_super_admin, u.establishment_id
    INTO v_is_super, v_user_est
    FROM public.app_users u
   WHERE u.id = p_user_id AND u.is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_effective_est := COALESCE(
    CASE WHEN v_is_super THEN p_active_establishment_id ELSE v_user_est END,
    v_user_est
  );

  IF v_is_super THEN
    RETURN QUERY
      SELECT m.id, m.parent_id, m.code, m.label, m.route_path, m.icon_name,
             m.help_title, m.help_text, m.module_scope, m.sort_order, true AS can_cancel_sales
        FROM public.system_modules m
       WHERE m.is_active = true
         AND (
           m.module_scope = 'super_admin'
           OR v_effective_est IS NULL
           OR EXISTS (
             SELECT 1 FROM public.establishment_modules em
              WHERE em.establishment_id = v_effective_est AND em.module_id = m.id
           )
           OR m.module_scope = 'core_erp'
         )
       ORDER BY m.sort_order ASC, m.label ASC;
    RETURN;
  END IF;

  SELECT COALESCE(bool_or(ap.can_cancel_sales), false)
    INTO v_can_cancel
    FROM public.user_profiles up
    JOIN public.access_profiles ap ON ap.id = up.profile_id
   WHERE up.user_id = p_user_id;

  RETURN QUERY
  WITH RECURSIVE direct_grants AS (
    SELECT DISTINCT pm.module_id
      FROM public.user_profiles up
      JOIN public.profile_modules pm ON pm.profile_id = up.profile_id
     WHERE up.user_id = p_user_id
  ),
  inherited_descendants AS (
    SELECT m.id, m.parent_id
      FROM public.system_modules m
      JOIN direct_grants dg ON dg.module_id = m.id
     WHERE m.is_active = true
    UNION
    SELECT child.id, child.parent_id
      FROM public.system_modules child
      JOIN inherited_descendants p ON child.parent_id = p.id
     WHERE child.is_active = true
  ),
  tenant_filtered AS (
    SELECT id_mod.id
      FROM inherited_descendants id_mod
      JOIN public.system_modules sm ON sm.id = id_mod.id
     WHERE sm.module_scope <> 'super_admin'
       AND EXISTS (
         SELECT 1 FROM public.establishment_modules em
          WHERE em.establishment_id = v_effective_est
            AND em.module_id = sm.id
       )
  ),
  ancestors AS (
    SELECT sm.id, sm.parent_id
      FROM public.system_modules sm
      JOIN tenant_filtered tf ON tf.id = sm.id
    UNION
    SELECT parent.id, parent.parent_id
      FROM public.system_modules parent
      JOIN ancestors a ON a.parent_id = parent.id
     WHERE parent.is_active = true
  )
  SELECT DISTINCT
    m.id, m.parent_id, m.code, m.label, m.route_path, m.icon_name,
    m.help_title, m.help_text, m.module_scope, m.sort_order,
    v_can_cancel AS can_cancel_sales
  FROM public.system_modules m
  JOIN ancestors anc ON anc.id = m.id
  ORDER BY m.sort_order ASC, m.label ASC;
END;
$$;

-- Enable RLS on all Migration 001 tables
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_web ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Hardened Policies (Preventing non-super-admin privilege escalation)
CREATE POLICY establishments_select_policy ON public.establishments
  FOR SELECT TO authenticated
  USING (public.can_access_establishment(id));

CREATE POLICY establishments_super_write_policy ON public.establishments
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY app_users_select_policy ON public.app_users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.can_access_establishment(establishment_id) OR public.is_super_admin());

CREATE POLICY app_users_write_policy ON public.app_users
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (establishment_id IS NOT NULL AND public.can_manage_establishment(establishment_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      is_super_admin = false
      AND establishment_id IS NOT NULL
      AND public.can_manage_establishment(establishment_id)
    )
  );

CREATE POLICY system_modules_select_policy ON public.system_modules
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY system_modules_super_write_policy ON public.system_modules
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY parametros_web_select_policy ON public.parametros_web
  FOR SELECT TO authenticated
  USING (establishment_id IS NULL OR public.can_access_establishment(establishment_id));

CREATE POLICY parametros_web_write_policy ON public.parametros_web
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY establishment_modules_select_policy ON public.establishment_modules
  FOR SELECT TO authenticated
  USING (public.can_access_establishment(establishment_id));

CREATE POLICY establishment_modules_write_policy ON public.establishment_modules
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY access_profiles_select_policy ON public.access_profiles
  FOR SELECT TO authenticated
  USING (establishment_id IS NULL OR public.can_access_establishment(establishment_id));

CREATE POLICY access_profiles_write_policy ON public.access_profiles
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (establishment_id IS NOT NULL AND public.can_manage_establishment(establishment_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (establishment_id IS NOT NULL AND public.can_manage_establishment(establishment_id))
  );

CREATE POLICY profile_modules_select_policy ON public.profile_modules
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.access_profiles ap
       WHERE ap.id = profile_id
         AND (ap.establishment_id IS NULL OR public.can_access_establishment(ap.establishment_id))
    )
  );

CREATE POLICY profile_modules_write_policy ON public.profile_modules
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.access_profiles ap
       WHERE ap.id = profile_id
         AND ap.establishment_id IS NOT NULL
         AND public.can_manage_establishment(ap.establishment_id)
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.access_profiles ap
       WHERE ap.id = profile_id
         AND ap.establishment_id IS NOT NULL
         AND public.can_manage_establishment(ap.establishment_id)
    )
  );

CREATE POLICY user_profiles_select_policy ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.app_users u
       WHERE u.id = user_id AND public.can_access_establishment(u.establishment_id)
    )
  );

CREATE POLICY user_profiles_write_policy ON public.user_profiles
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.app_users u
       WHERE u.id = user_id
         AND u.establishment_id IS NOT NULL
         AND public.can_manage_establishment(u.establishment_id)
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.app_users u
      JOIN public.access_profiles ap ON ap.id = profile_id
      WHERE u.id = user_id
        AND u.establishment_id IS NOT NULL
        AND ap.establishment_id = u.establishment_id
        AND public.can_manage_establishment(u.establishment_id)
    )
  );
