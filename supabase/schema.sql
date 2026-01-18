-- Elmseed Applicant Portal Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Extends Supabase auth.users
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'applicant' CHECK (role IN ('applicant', 'reviewer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- APPLICATIONS TABLE
-- Simplified flow: submit info -> payment -> review -> decision
-- ============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    current_status IN ('draft', 'submitted', 'payment_received', 'in_review', 'decision_released')
  ),
  -- Applicant information
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  high_school TEXT,
  gpa TEXT,
  -- Payment tracking
  payment_verified BOOLEAN NOT NULL DEFAULT FALSE,
  payment_verified_at TIMESTAMPTZ,
  payment_verified_by UUID REFERENCES profiles(id),
  -- Final decision
  decision TEXT CHECK (decision IN ('accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- APPLICATION DOCUMENTS TABLE
-- ============================================
CREATE TABLE application_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (
    file_type IN ('application', 'supporting_document')
  ),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- APPLICATION STATUS HISTORY TABLE
-- Immutable audit log
-- ============================================
CREATE TABLE application_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REVIEWER ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE reviewer_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(application_id, reviewer_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(current_status);
CREATE INDEX idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX idx_status_history_application_id ON application_status_history(application_id);
CREATE INDEX idx_reviewer_assignments_reviewer_id ON reviewer_assignments(reviewer_id);

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Log status changes
-- ============================================
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    INSERT INTO application_status_history (application_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.current_status, NEW.current_status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_application_status_change
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- ============================================
-- TRIGGER: Create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'applicant');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviewer_assignments ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- APPLICATIONS POLICIES
CREATE POLICY "Applicants can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Applicants can insert own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Applicants can update own draft applications"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id AND current_status = 'draft');

CREATE POLICY "Reviewers can view assigned applications"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviewer_assignments 
      WHERE application_id = applications.id AND reviewer_id = auth.uid()
    )
  );

CREATE POLICY "Reviewers can update assigned application status"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reviewer_assignments 
      WHERE application_id = applications.id AND reviewer_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('reviewer', 'admin')
    )
  );

CREATE POLICY "Admins have full access to applications"
  ON applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- APPLICATION DOCUMENTS POLICIES
CREATE POLICY "Applicants can view own documents"
  ON application_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_documents.application_id 
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Applicants can insert documents for own applications"
  ON application_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_documents.application_id 
      AND applications.user_id = auth.uid()
      AND applications.current_status = 'draft'
    )
  );

CREATE POLICY "Applicants can delete documents from draft applications"
  ON application_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_documents.application_id 
      AND applications.user_id = auth.uid()
      AND applications.current_status = 'draft'
    )
  );

CREATE POLICY "Reviewers can view documents for assigned applications"
  ON application_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviewer_assignments ra
      JOIN applications a ON a.id = ra.application_id
      WHERE a.id = application_documents.application_id 
      AND ra.reviewer_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to documents"
  ON application_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- STATUS HISTORY POLICIES
CREATE POLICY "Applicants can view own status history"
  ON application_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_status_history.application_id 
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and reviewers can view status history"
  ON application_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('reviewer', 'admin')
    )
  );

-- REVIEWER ASSIGNMENTS POLICIES
CREATE POLICY "Reviewers can view own assignments"
  ON reviewer_assignments FOR SELECT
  USING (reviewer_id = auth.uid());

CREATE POLICY "Admins have full access to assignments"
  ON reviewer_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- STORAGE BUCKET SETUP
-- Run in Supabase Dashboard > Storage
-- ============================================
-- Create bucket: application-documents
-- Set to private (not public)
-- 
-- Storage policies (add via Dashboard):
-- 
-- SELECT policy: Allow users to read own files
--   (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1])
--
-- INSERT policy: Allow users to upload to own folder
--   (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1])
--
-- DELETE policy: Allow users to delete own files
--   (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1])
