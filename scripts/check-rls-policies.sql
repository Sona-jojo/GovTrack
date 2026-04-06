-- Comprehensive RLS Policy Check for Complaints Table
-- Run this in Supabase SQL Editor to diagnose assignment visibility issues

-- ============================================================================
-- 1. CHECK RLS STATUS ON COMPLAINTS TABLE
-- ============================================================================
SELECT
  schemaname,
  tablename,
  rowsecurity,
  'RLS Status' as check_type
FROM pg_tables
WHERE tablename = 'complaints';

-- ============================================================================
-- 2. LIST ALL RLS POLICIES ON COMPLAINTS TABLE
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual as select_policy,
  with_check as write_policy,
  'RLS Policy Details' as check_type
FROM pg_policies
WHERE tablename = 'complaints'
ORDER BY policyname;

-- ============================================================================
-- 3. CHECK COLUMNS IN COMPLAINTS TABLE
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  'Column Info' as check_type
FROM information_schema.columns
WHERE table_name = 'complaints' 
AND column_name IN ('id', 'assigned_to', 'assigned_role', 'local_body_id', 'status')
ORDER BY column_name;

-- ============================================================================
-- 4. SAMPLE COMPLAINTS WITH ROLE ASSIGNMENTS
-- ============================================================================
SELECT 
  id,
  tracking_id,
  status,
  assigned_to,
  assigned_role,
  local_body_id,
  created_at,
  'Sample Data' as check_type
FROM complaints
WHERE assigned_role IS NOT NULL
LIMIT 10;

-- ============================================================================
-- 5. COUNT COMPLAINTS BY ASSIGNMENT STATUS
-- ============================================================================
SELECT 
  COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as unassigned_by_user,
  COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_to_user,
  COUNT(CASE WHEN assigned_role IS NULL THEN 1 END) as no_role_assigned,
  COUNT(CASE WHEN assigned_role IS NOT NULL THEN 1 END) as role_assigned,
  'Assignment Statistics' as check_type
FROM complaints;

-- ============================================================================
-- 6. CHECK PROFILES TABLE FOR STAFF ROLES
-- ============================================================================
SELECT 
  id,
  name,
  role,
  local_body_id,
  'Staff Profiles' as check_type
FROM profiles
WHERE role IN ('engineer', 'clerk')
LIMIT 20;

-- ============================================================================
-- 7. TEST: List complaints FOR CLERK ROLE (using assigned_role)
-- ============================================================================
SELECT 
  id,
  tracking_id,
  status,
  assigned_to,
  assigned_role,
  'Clerk Filter Test (assigned_role = clerk)' as check_type
FROM complaints
WHERE assigned_role = 'clerk'
LIMIT 10;

-- ============================================================================
-- 8. TEST: List complaints FOR ENGINEER ROLE (using assigned_role)
-- ============================================================================
SELECT 
  id,
  tracking_id,
  status,
  assigned_to,
  assigned_role,
  'Engineer Filter Test (assigned_role = engineer)' as check_type
FROM complaints
WHERE assigned_role = 'engineer'
LIMIT 10;
