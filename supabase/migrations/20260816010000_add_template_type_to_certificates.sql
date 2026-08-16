-- Add template_type column to certificates table
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'Classic';

-- Add constraint to ensure valid template types
ALTER TABLE public.certificates ADD CONSTRAINT check_template_type 
  CHECK (template_type IN ('Classic', 'Modern', 'Minimal'));

-- Create index for faster filtering by template type
CREATE INDEX IF NOT EXISTS idx_certificates_template_type ON public.certificates(template_type);
