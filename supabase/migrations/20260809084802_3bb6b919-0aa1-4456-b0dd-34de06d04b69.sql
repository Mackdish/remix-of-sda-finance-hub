ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pastor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'elder';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.church_members(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.user_can_read_church(_user_id uuid, _church_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','treasurer','auditor','pastor','elder')
      AND (church_id = _church_id OR role = 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_write_church(_user_id uuid, _church_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','treasurer','elder')
      AND (church_id = _church_id OR role = 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_in_church(_user_id uuid, _church_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND church_id = _church_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_member_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT member_id FROM public.profiles WHERE id = _user_id;
$$;

DROP POLICY IF EXISTS "churches member read" ON public.churches;
CREATE POLICY "churches member read" ON public.churches FOR SELECT TO authenticated
  USING (public.user_in_church(auth.uid(), id));

DROP POLICY IF EXISTS "offcat member read" ON public.offering_categories;
CREATE POLICY "offcat member read" ON public.offering_categories FOR SELECT TO authenticated
  USING (church_id IS NULL OR public.user_in_church(auth.uid(), church_id));

DROP POLICY IF EXISTS "receipts member own read" ON public.receipts;
CREATE POLICY "receipts member own read" ON public.receipts FOR SELECT TO authenticated
  USING (member_id IS NOT NULL AND member_id = public.user_member_id(auth.uid()));

DROP POLICY IF EXISTS "members self read" ON public.church_members;
CREATE POLICY "members self read" ON public.church_members FOR SELECT TO authenticated
  USING (id = public.user_member_id(auth.uid()));