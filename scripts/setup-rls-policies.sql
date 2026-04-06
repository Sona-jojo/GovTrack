-- ============================================================================
-- RLS POLICY FIX FOR ENGINEER/CLERK ASSIGNMENT VISIBILITY
-- ============================================================================
-- This script sets up proper RLS policies to allow engineers/clerks to see
-- complaints assigned to their role (assigned_role = 'engineer' or 'clerk')

-- ============================================================================
-- ENABLE RLS ON COMPLAINTS TABLE
-- ============================================================================
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if any)
-- ============================================================================
DROP POLICY IF EXISTS "Secretaries see complaints in their local body" ON public.complaints;
DROP POLICY IF EXISTS "Engineers and clerks see assigned complaints" ON public.complaints;
DROP POLICY IF EXISTS "Users can read complaints assigned to them" ON public.complaints;
DROP POLICY IF EXISTS "Users can read complaints assigned to their role" ON public.complaints;
DROP POLICY IF EXISTS "Secretaries update complaints in their local body" ON public.complaints;
DROP POLICY IF EXISTS "Engineers update assigned complaints" ON public.complaints;

-- ============================================================================
-- SELECT POLICIES FOR COMPLAINTS TABLE
-- ============================================================================

-- POLICY 1: Service role (admin) can see all complaints
CREATE POLICY "Service role access all" ON public.complaints
  FOR SELECT
  USING (auth.role() = 'service_role');

-- POLICY 2: Secretaries see all complaints in their local body
CREATE POLICY "Secretaries see their local body complaints" ON public.complaints
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'secretary'
    AND local_body_id = (SELECT local_body_id FROM public.profiles WHERE id = auth.uid())
  );

-- POLICY 3: Engineers/Clerks see complaints directly assigned to them
CREATE POLICY "Staff see directly assigned complaints" ON public.complaints
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('engineer', 'clerk')
    AND assigned_to = auth.uid()
  );

-- POLICY 4: Engineers/Clerks see complaints assigned to their role
CREATE POLICY "Staff see role-assigned complaints" ON public.complaints
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('engineer', 'clerk')
    AND assigned_role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- POLICY 5: Citizens can see their own submitted complaints
CREATE POLICY "Citizens see their own complaints" ON public.complaints
  FOR SELECT
  USING (
    reporter_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================================
-- UPDATE/INSERT POLICIES FOR COMPLAINTS TABLE
-- ============================================================================

-- POLICY 6: Secretaries can update complaints in their local body
CREATE POLICY "Secretaries update their local body complaints" ON public.complaints
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'secretary'
    AND local_body_id = (SELECT local_body_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'secretary'
    AND local_body_id = (SELECT local_body_id FROM public.profiles WHERE id = auth.uid())
  );

-- POLICY 7: Engineers/Clerks can update and reassign complaints assigned to them
CREATE POLICY "Staff update directly assigned complaints" ON public.complaints
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('engineer', 'clerk')
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('engineer', 'clerk')
    AND assigned_to = auth.uid()
  );

-- POLICY 8: Engineers/Clerks can update complaints assigned to their role
CREATE POLICY "Staff update role-assigned complaints" ON public.complaints
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('engineer', 'clerk')
    AND assigned_role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('engineer', 'clerk')
    AND assigned_role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- POLICY 9: Service role can insert complaints (for public submission)
CREATE POLICY "Public can submit complaints" ON public.complaints
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NULL);

-- ============================================================================
-- VERIFY THE SETUP
-- ============================================================================
-- Run these after setup to verify:

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'complaints';

-- List all policies
-- SELECT policyname, permissive, roles, qual FROM pg_policies WHERE tablename = 'complaints' ORDER BY policyname;

-- Test query for engineer (replace with actual user ID and role check)
-- SELECT id, tracking_id, status, assigned_to, assigned_role 
-- FROM complaints 
-- WHERE assigned_role = 'engineer'
-- LIMIT 5;
