-- ==============================================================================
-- ADMIN AUTH & PASSWORD RECOVERY TABLE (JBJ ERP)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admin_auth (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_auth_email ON public.admin_auth(email);

-- Enable RLS
ALTER TABLE public.admin_auth ENABLE ROW LEVEL SECURITY;

-- Allow server service role access
CREATE POLICY "Allow server full access to admin_auth" ON public.admin_auth
  FOR ALL
  USING (true)
  WITH CHECK (true);
