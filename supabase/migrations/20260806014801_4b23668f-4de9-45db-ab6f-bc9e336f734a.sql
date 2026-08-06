-- 1. Extend fund_type with camp
ALTER TYPE public.fund_type ADD VALUE IF NOT EXISTS 'camp';

-- 2. Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_read" ON public.departments
  FOR SELECT TO authenticated
  USING (public.user_can_read_church(auth.uid(), church_id));

CREATE POLICY "departments_write" ON public.departments
  FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

CREATE TRIGGER trg_departments_upd BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Link receipts/expenses/members to departments
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.church_members ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_department ON public.receipts(department_id);
CREATE INDEX IF NOT EXISTS idx_expenses_department ON public.expenses(department_id);
CREATE INDEX IF NOT EXISTS idx_receipts_member ON public.receipts(member_id);

-- 4. Default departments for every existing church
INSERT INTO public.departments (church_id, name, code, sort_order)
SELECT c.id, d.name, d.code, d.ord
FROM public.churches c
CROSS JOIN (VALUES
  ('Sabbath School','SS',1),
  ('Personal Ministries','PM',2),
  ('Adventist Youth (AY)','AY',3),
  ('Adventurers & Pathfinders','AP',4),
  ('Children Ministries','CM',5),
  ('Women Ministries','WM',6),
  ('Men Ministries','MM',7),
  ('Music Department','MU',8),
  ('Health Ministries','HM',9),
  ('Communication','CO',10),
  ('Development & Building','DEV',11),
  ('Camp Meeting','CAMP',12)
) AS d(name, code, ord)
ON CONFLICT (church_id, name) DO NOTHING;
