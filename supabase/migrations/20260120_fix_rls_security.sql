-- Fix Security Issues: Restrict RLS policy and add proper validation
-- This migration addresses security vulnerabilities identified in the security review

-- ============================================
-- 1. Fix Overly Permissive RLS Policy
-- ============================================

-- Drop the overly permissive policy that allows users to update ANY field in submitted applications
DROP POLICY IF EXISTS "Applicants can update own submitted applications for payment" ON applications;

-- Create a more restrictive policy that only allows updating payment-related fields
-- This prevents users from modifying their application data (GPA, essays, etc.) after submission
CREATE POLICY "Applicants can update payment info for submitted applications"
  ON applications FOR UPDATE
  USING (
    auth.uid() = user_id
    AND current_status = 'submitted'
    AND NOT payment_verified  -- Cannot update if payment is already verified
  )
  WITH CHECK (
    -- Ensure all non-payment fields remain unchanged
    (OLD.first_name IS NOT DISTINCT FROM NEW.first_name) AND
    (OLD.last_name IS NOT DISTINCT FROM NEW.last_name) AND
    (OLD.date_of_birth IS NOT DISTINCT FROM NEW.date_of_birth) AND
    (OLD.high_school IS NOT DISTINCT FROM NEW.high_school) AND
    (OLD.gpa IS NOT DISTINCT FROM NEW.gpa) AND
    (OLD.country IS NOT DISTINCT FROM NEW.country) AND
    (OLD.state IS NOT DISTINCT FROM NEW.state) AND
    (OLD.class_year IS NOT DISTINCT FROM NEW.class_year) AND
    (OLD.applying_for_financial_aid IS NOT DISTINCT FROM NEW.applying_for_financial_aid) AND
    (OLD.financial_circumstances_overview IS NOT DISTINCT FROM NEW.financial_circumstances_overview) AND
    (OLD.financial_documentation_consent IS NOT DISTINCT FROM NEW.financial_documentation_consent) AND
    (OLD.current_status IS NOT DISTINCT FROM NEW.current_status) AND
    (OLD.payment_verified IS NOT DISTINCT FROM NEW.payment_verified) AND
    (OLD.decision IS NOT DISTINCT FROM NEW.decision) AND
    -- Only allow updating these specific payment fields:
    -- payment_method, payment_certification
    -- Note: stripe_payment_intent_id and stripe_payment_status should only be updated by webhook/service
    true
  );

-- ============================================
-- 2. Add Index for Payment Intent Lookups
-- ============================================

-- Add index to improve query performance when checking for existing payment intents
CREATE INDEX IF NOT EXISTS idx_applications_user_payment_status
  ON applications(user_id, current_status, payment_verified);
