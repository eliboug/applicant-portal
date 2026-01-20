-- Add Stripe payment fields to applications table
ALTER TABLE applications
ADD COLUMN payment_method TEXT CHECK (payment_method IN ('zelle', 'stripe')),
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN stripe_session_id TEXT,
ADD COLUMN stripe_payment_status TEXT CHECK (stripe_payment_status IN ('pending', 'succeeded', 'failed')),
ADD COLUMN payment_certification TEXT,
ADD COLUMN applying_for_financial_aid BOOLEAN,
ADD COLUMN financial_circumstances_overview TEXT,
ADD COLUMN financial_documentation_consent TEXT,
ADD COLUMN country TEXT,
ADD COLUMN state TEXT,
ADD COLUMN class_year TEXT CHECK (class_year IN ('2025', '2026', '2027', '2028', '2029'));

-- Create index for Stripe payment lookups
CREATE INDEX idx_applications_stripe_payment_intent ON applications(stripe_payment_intent_id);
CREATE INDEX idx_applications_payment_method ON applications(payment_method);

-- Update RLS policy to allow applicants to update submitted applications for Stripe payment
CREATE POLICY "Applicants can update own submitted applications for payment"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id AND current_status = 'submitted');
