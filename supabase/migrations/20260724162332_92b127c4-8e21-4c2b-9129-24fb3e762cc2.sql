
-- Add approval workflow columns
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.cash_statements
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.weekly_reports
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

DO $$ BEGIN
  ALTER TABLE public.receipts ADD CONSTRAINT receipts_approval_status_chk
    CHECK (approval_status IN ('draft','pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.expenses ADD CONSTRAINT expenses_approval_status_chk
    CHECK (approval_status IN ('draft','pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.cash_statements ADD CONSTRAINT cashst_approval_status_chk
    CHECK (approval_status IN ('draft','pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.weekly_reports ADD CONSTRAINT wkly_approval_status_chk
    CHECK (approval_status IN ('draft','pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill existing locked/finalized rows as approved
UPDATE public.receipts SET approval_status = 'approved' WHERE is_locked AND approval_status = 'draft';
UPDATE public.expenses SET approval_status = 'approved' WHERE is_locked AND approval_status = 'draft';
UPDATE public.cash_statements SET approval_status = 'approved' WHERE is_finalized AND approval_status = 'draft';
UPDATE public.weekly_reports SET approval_status = 'approved' WHERE is_finalized AND approval_status = 'draft';

-- Update RLS so treasurers cannot edit records already submitted (pending) or locked; admins can always edit
DROP POLICY IF EXISTS "receipts update" ON public.receipts;
CREATE POLICY "receipts update" ON public.receipts FOR UPDATE
  USING (user_can_write_church(auth.uid(), church_id)
    AND (is_admin(auth.uid()) OR (NOT is_locked AND approval_status IN ('draft','rejected'))))
  WITH CHECK (user_can_write_church(auth.uid(), church_id));

DROP POLICY IF EXISTS "expenses update" ON public.expenses;
CREATE POLICY "expenses update" ON public.expenses FOR UPDATE
  USING (user_can_write_church(auth.uid(), church_id)
    AND (is_admin(auth.uid()) OR (NOT is_locked AND approval_status IN ('draft','rejected'))))
  WITH CHECK (user_can_write_church(auth.uid(), church_id));

DROP POLICY IF EXISTS "cashst update" ON public.cash_statements;
CREATE POLICY "cashst update" ON public.cash_statements FOR UPDATE
  USING (user_can_write_church(auth.uid(), church_id)
    AND (is_admin(auth.uid()) OR (NOT is_finalized AND approval_status IN ('draft','rejected'))))
  WITH CHECK (user_can_write_church(auth.uid(), church_id));

DROP POLICY IF EXISTS "wkly update" ON public.weekly_reports;
CREATE POLICY "wkly update" ON public.weekly_reports FOR UPDATE
  USING (user_can_write_church(auth.uid(), church_id)
    AND (is_admin(auth.uid()) OR (NOT is_finalized AND approval_status IN ('draft','rejected'))))
  WITH CHECK (user_can_write_church(auth.uid(), church_id));

DROP POLICY IF EXISTS "receipts delete" ON public.receipts;
CREATE POLICY "receipts delete" ON public.receipts FOR DELETE
  USING (user_can_write_church(auth.uid(), church_id)
    AND (is_admin(auth.uid()) OR (NOT is_locked AND approval_status IN ('draft','rejected'))));

DROP POLICY IF EXISTS "expenses delete" ON public.expenses;
CREATE POLICY "expenses delete" ON public.expenses FOR DELETE
  USING (user_can_write_church(auth.uid(), church_id)
    AND (is_admin(auth.uid()) OR (NOT is_locked AND approval_status IN ('draft','rejected'))));

DROP POLICY IF EXISTS "cashst delete" ON public.cash_statements;
CREATE POLICY "cashst delete" ON public.cash_statements FOR DELETE
  USING (user_can_write_church(auth.uid(), church_id)
    AND (is_admin(auth.uid()) OR (NOT is_finalized AND approval_status IN ('draft','rejected'))));

DROP POLICY IF EXISTS "wkly delete" ON public.weekly_reports;
CREATE POLICY "wkly delete" ON public.weekly_reports FOR DELETE
  USING (user_can_write_church(auth.uid(), church_id)
    AND (is_admin(auth.uid()) OR (NOT is_finalized AND approval_status IN ('draft','rejected'))));
