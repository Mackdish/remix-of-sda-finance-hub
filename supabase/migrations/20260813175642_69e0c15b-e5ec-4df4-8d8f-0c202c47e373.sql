CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL UNIQUE REFERENCES public.churches(id) ON DELETE CASCADE,
  system_name text NOT NULL DEFAULT 'SDA Treasurer',
  tagline text,
  marquee_enabled boolean NOT NULL DEFAULT true,
  marquee_speed integer NOT NULL DEFAULT 40,
  support_email text,
  support_phone text,
  whatsapp_number text,
  office_address text,
  office_hours text,
  contact_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_read" ON public.site_settings FOR SELECT TO authenticated
  USING (public.user_in_church(auth.uid(), church_id) OR public.is_admin(auth.uid()));
CREATE POLICY "settings_write" ON public.site_settings FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

CREATE TRIGGER trg_site_settings_upd BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'info',
  show_in_marquee boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  starts_on date,
  ends_on date,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notices_read" ON public.notices FOR SELECT TO authenticated
  USING (public.user_in_church(auth.uid(), church_id) OR public.is_admin(auth.uid()));
CREATE POLICY "notices_write" ON public.notices FOR ALL TO authenticated
  USING (public.user_can_write_church(auth.uid(), church_id))
  WITH CHECK (public.user_can_write_church(auth.uid(), church_id));

CREATE TRIGGER trg_notices_upd BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_notices_church_active ON public.notices(church_id, is_active);