
-- 1. Columns on receipts
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

-- 2. Columns on expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

-- 3. Cash statements
ALTER TABLE public.cash_statements
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

-- 4. Weekly reports
ALTER TABLE public.weekly_reports
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

-- 5. Replace RLS policies with split INSERT / UPDATE / DELETE that respect the lock
DROP POLICY IF EXISTS "receipts write" ON public.receipts;
CREATE POLICY "receipts insert" ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));
CREATE POLICY "receipts update" ON public.receipts FOR UPDATE TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id) AND (NOT is_locked OR public.is_admin(auth.uid())))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));
CREATE POLICY "receipts delete" ON public.receipts FOR DELETE TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id) AND (NOT is_locked OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "expenses write" ON public.expenses;
CREATE POLICY "expenses insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));
CREATE POLICY "expenses update" ON public.expenses FOR UPDATE TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id) AND (NOT is_locked OR public.is_admin(auth.uid())))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));
CREATE POLICY "expenses delete" ON public.expenses FOR DELETE TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id) AND (NOT is_locked OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "cashst write" ON public.cash_statements;
CREATE POLICY "cashst insert" ON public.cash_statements FOR INSERT TO authenticated
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));
CREATE POLICY "cashst update" ON public.cash_statements FOR UPDATE TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id) AND (NOT is_finalized OR public.is_admin(auth.uid())))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));
CREATE POLICY "cashst delete" ON public.cash_statements FOR DELETE TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id) AND (NOT is_finalized OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "wkly write" ON public.weekly_reports;
CREATE POLICY "wkly insert" ON public.weekly_reports FOR INSERT TO authenticated
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));
CREATE POLICY "wkly update" ON public.weekly_reports FOR UPDATE TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id) AND (NOT is_finalized OR public.is_admin(auth.uid())))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));
CREATE POLICY "wkly delete" ON public.weekly_reports FOR DELETE TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id) AND (NOT is_finalized OR public.is_admin(auth.uid())));
