
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'treasurer', 'auditor');
CREATE TYPE public.fund_type AS ENUM ('trust', 'local');
CREATE TYPE public.payment_method AS ENUM ('cash', 'mpesa', 'bank_transfer', 'cheque', 'bank_deposit');

-- Update timestamp helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Conferences
CREATE TABLE public.conferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conferences TO authenticated;
GRANT ALL ON public.conferences TO service_role;
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_conferences_upd BEFORE UPDATE ON public.conferences FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Districts
CREATE TABLE public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid REFERENCES public.conferences(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.districts TO authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_districts_upd BEFORE UPDATE ON public.districts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Churches
CREATE TABLE public.churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  conference_id uuid REFERENCES public.conferences(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  address text,
  city text,
  country text DEFAULT 'Kenya',
  phone text,
  email text,
  logo_url text,
  pastor_name text,
  treasurer_name text,
  elder_name text,
  auditor_name text,
  financial_year_start_month int DEFAULT 1,
  currency text DEFAULT 'KES',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.churches TO authenticated;
GRANT ALL ON public.churches TO service_role;
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_churches_upd BEFORE UPDATE ON public.churches FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  primary_church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- User roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, church_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.user_church_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT church_id FROM public.user_roles WHERE user_id = _user_id AND church_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_can_write_church(_user_id uuid, _church_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (church_id = _church_id OR role = 'admin')
      AND role IN ('admin','treasurer')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_read_church(_user_id uuid, _church_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND (church_id = _church_id OR role = 'admin')
  );
$$;

-- Profile / role policies
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles self upsert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_roles admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Conference / district / church policies
CREATE POLICY "conferences read auth" ON public.conferences FOR SELECT TO authenticated USING (true);
CREATE POLICY "conferences admin write" ON public.conferences FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "districts read auth" ON public.districts FOR SELECT TO authenticated USING (true);
CREATE POLICY "districts admin write" ON public.districts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "churches read own" ON public.churches FOR SELECT TO authenticated
  USING (public.user_can_read_church(auth.uid(), id) OR public.is_admin(auth.uid()));
CREATE POLICY "churches admin write" ON public.churches FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Offering categories
CREATE TABLE public.offering_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE, -- NULL = global default
  name text NOT NULL,
  code text,
  fund_type public.fund_type NOT NULL,
  conference_split_pct numeric(5,2) NOT NULL DEFAULT 0, -- % remitted to conference
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offering_categories TO authenticated;
GRANT ALL ON public.offering_categories TO service_role;
ALTER TABLE public.offering_categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_offcat_upd BEFORE UPDATE ON public.offering_categories FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "offcat read" ON public.offering_categories FOR SELECT TO authenticated
  USING (church_id IS NULL OR public.user_can_read_church(auth.uid(), church_id));
CREATE POLICY "offcat admin write" ON public.offering_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Expense categories
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expcat read" ON public.expense_categories FOR SELECT TO authenticated
  USING (church_id IS NULL OR public.user_can_read_church(auth.uid(), church_id));
CREATE POLICY "expcat write" ON public.expense_categories FOR ALL TO authenticated
  USING (church_id IS NULL AND public.is_admin(auth.uid()) OR public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (church_id IS NULL AND public.is_admin(auth.uid()) OR public.user_can_write_church(auth.uid(), church_id));

-- Members
CREATE TABLE public.church_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  membership_number text,
  full_name text NOT NULL,
  phone text,
  email text,
  department text,
  family_name text,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, membership_number)
);
CREATE INDEX idx_members_church_name ON public.church_members(church_id, full_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.church_members TO authenticated;
GRANT ALL ON public.church_members TO service_role;
ALTER TABLE public.church_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_members_upd BEFORE UPDATE ON public.church_members FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "members read" ON public.church_members FOR SELECT TO authenticated
  USING (public.user_can_read_church(auth.uid(), church_id));
CREATE POLICY "members write" ON public.church_members FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

-- Financial years
CREATE TABLE public.financial_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  year int NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  opening_cash numeric(14,2) NOT NULL DEFAULT 0,
  opening_bank numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_years TO authenticated;
GRANT ALL ON public.financial_years TO service_role;
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fy read" ON public.financial_years FOR SELECT TO authenticated
  USING (public.user_can_read_church(auth.uid(), church_id));
CREATE POLICY "fy write" ON public.financial_years FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

-- Receipts
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  member_id uuid REFERENCES public.church_members(id) ON DELETE SET NULL,
  member_name text,
  membership_number text,
  phone text,
  department text,
  offering_category_id uuid REFERENCES public.offering_categories(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  reference_number text,
  description text,
  remarks text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, receipt_number)
);
CREATE INDEX idx_receipts_church_date ON public.receipts(church_id, transaction_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_receipts_upd BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "receipts read" ON public.receipts FOR SELECT TO authenticated
  USING (public.user_can_read_church(auth.uid(), church_id));
CREATE POLICY "receipts write" ON public.receipts FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  expense_number text NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description text,
  vendor text,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  reference_number text,
  approved_by text,
  attachment_url text,
  remarks text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, expense_number)
);
CREATE INDEX idx_expenses_church_date ON public.expenses(church_id, transaction_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_expenses_upd BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "expenses read" ON public.expenses FOR SELECT TO authenticated
  USING (public.user_can_read_church(auth.uid(), church_id));
CREATE POLICY "expenses write" ON public.expenses FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

-- Cash statements
CREATE TABLE public.cash_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  statement_date date NOT NULL,
  period_month int,
  period_year int,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_finalized boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_statements TO authenticated;
GRANT ALL ON public.cash_statements TO service_role;
ALTER TABLE public.cash_statements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cashst_upd BEFORE UPDATE ON public.cash_statements FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "cashst read" ON public.cash_statements FOR SELECT TO authenticated
  USING (public.user_can_read_church(auth.uid(), church_id));
CREATE POLICY "cashst write" ON public.cash_statements FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

-- Weekly reports
CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  period_year int NOT NULL,
  period_month int NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_finalized boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, period_year, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_reports TO authenticated;
GRANT ALL ON public.weekly_reports TO service_role;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_wkly_upd BEFORE UPDATE ON public.weekly_reports FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "wkly read" ON public.weekly_reports FOR SELECT TO authenticated
  USING (public.user_can_read_church(auth.uid(), church_id));
CREATE POLICY "wkly write" ON public.weekly_reports FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

-- Remittances
CREATE TABLE public.remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  remittance_date date NOT NULL DEFAULT CURRENT_DATE,
  cash_amount numeric(14,2) NOT NULL DEFAULT 0,
  bank_amount numeric(14,2) NOT NULL DEFAULT 0,
  mpesa_amount numeric(14,2) NOT NULL DEFAULT 0,
  cheque_amount numeric(14,2) NOT NULL DEFAULT 0,
  bank_name text,
  reference_number text,
  slip_url text,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remittances TO authenticated;
GRANT ALL ON public.remittances TO service_role;
ALTER TABLE public.remittances ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_rem_upd BEFORE UPDATE ON public.remittances FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "rem read" ON public.remittances FOR SELECT TO authenticated
  USING (public.user_can_read_church(auth.uid(), church_id));
CREATE POLICY "rem write" ON public.remittances FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

-- Audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit insert self" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "audit read admin" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR (church_id IS NOT NULL AND public.user_can_read_church(auth.uid(), church_id)));

-- Seed default SDA offering categories (global; church_id NULL)
INSERT INTO public.offering_categories (name, code, fund_type, conference_split_pct, sort_order) VALUES
  ('Tithe', 'TITHE', 'trust', 100, 10),
  ('Combined Offering', 'COMB', 'trust', 50, 20),
  ('Camp Meeting Offering', 'CAMP', 'trust', 100, 30),
  ('Thanksgiving', 'THANKS', 'trust', 50, 40),
  ('First Fruit', 'FIRST', 'trust', 50, 50),
  ('Mission Offering', 'MISS', 'trust', 100, 60),
  ('Sabbath School Offering', 'SS', 'trust', 100, 70),
  ('Evangelism Fund', 'EVAN', 'trust', 100, 80),
  ('Station Development', 'STDEV', 'trust', 100, 90),
  ('Field Fund', 'FIELD', 'trust', 100, 100),
  ('Communication', 'COMM', 'trust', 100, 110),
  ('Education', 'EDU', 'trust', 100, 120),
  ('Stewardship', 'STEW', 'trust', 100, 130),
  ('Youth Ministries', 'YM', 'trust', 100, 140),
  ('Women''s Ministries', 'WM', 'trust', 100, 150),
  ('Children''s Ministries', 'CM', 'trust', 100, 160),
  ('Health Ministries', 'HM', 'trust', 100, 170),
  ('Family Life', 'FAM', 'trust', 100, 180),
  ('Publishing', 'PUB', 'trust', 100, 190),
  ('Community Services', 'CS', 'trust', 100, 200),
  ('Church Offering', 'CHOFF', 'local', 0, 300),
  ('Building Fund', 'BLDG', 'local', 0, 310),
  ('Development Fund', 'DEV', 'local', 0, 320),
  ('Choir Fund', 'CHOIR', 'local', 0, 330),
  ('Youth Fund', 'YFUND', 'local', 0, 340),
  ('Pathfinder Fund', 'PATH', 'local', 0, 350),
  ('Adventurer Fund', 'ADV', 'local', 0, 360),
  ('Dorcas Fund', 'DORC', 'local', 0, 370),
  ('Maintenance', 'MAINT', 'local', 0, 380),
  ('Water', 'WATER', 'local', 0, 390),
  ('Electricity', 'ELEC', 'local', 0, 400),
  ('Pastor Welfare', 'PWEL', 'local', 0, 410),
  ('Camp Meeting Expenses', 'CMEX', 'local', 0, 420),
  ('Special Projects', 'SPPRJ', 'local', 0, 430);
