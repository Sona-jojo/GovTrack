#!/bin/bash
# Seed script for local bodies and wards test data
# Run this in Supabase SQL Editor to populate test data

-- Clear existing data (optional)
-- DELETE FROM wards;
-- DELETE FROM local_bodies;

-- Seed Local Bodies
INSERT INTO local_bodies (name, type, district, code, is_active)
VALUES
  ('Kannur Grama Panchayat', 'grama_panchayat', 'Kannur', 'KNR-GP-1', true),
  ('Tellicherry Grama Panchayat', 'grama_panchayat', 'Kannur', 'KNR-GP-2', true),
  ('Kannur Municipality', 'municipality', 'Kannur', 'KNR-MUN-1', true),
  ('Kannur Corporation', 'corporation', 'Kannur', 'KNR-CORP-1', true),
  ('Kannur Block Panchayat', 'block_panchayat', 'Kannur', 'KNR-BP-1', true),
  ('Kannur District Panchayat', 'district_panchayat', 'Kannur', 'KNR-DP-1', true),
  ('Ernakulam Grama Panchayat', 'grama_panchayat', 'Ernakulam', 'EKM-GP-1', true),
  ('Ernakulam Municipality', 'municipality', 'Ernakulam', 'EKM-MUN-1', true),
  ('Thiruvananthapuram Grama Panchayat', 'grama_panchayat', 'Thiruvananthapuram', 'TRV-GP-1', true)
ON CONFLICT (code) DO NOTHING;

-- Get the IDs of inserted local bodies for wards
WITH local_body_ids AS (
  SELECT id, code FROM local_bodies WHERE is_active = true
)
-- Seed Wards for Kannur GP
INSERT INTO wards (name, ward_number, local_body_id)
SELECT 
  'Ward ' || ward_num,
  ward_num,
  (SELECT id FROM local_bodies WHERE code = 'KNR-GP-1')
FROM (
  SELECT GENERATE_SERIES(1, 10) as ward_num
) t
WHERE NOT EXISTS (
  SELECT 1 FROM wards WHERE local_body_id = (SELECT id FROM local_bodies WHERE code = 'KNR-GP-1')
);

-- Seed Wards for Kannur Municipality
INSERT INTO wards (name, ward_number, local_body_id)
SELECT 
  'Ward ' || ward_num,
  ward_num,
  (SELECT id FROM local_bodies WHERE code = 'KNR-MUN-1')
FROM (
  SELECT GENERATE_SERIES(1, 15) as ward_num
) t
WHERE NOT EXISTS (
  SELECT 1 FROM wards WHERE local_body_id = (SELECT id FROM local_bodies WHERE code = 'KNR-MUN-1')
);

-- Seed Wards for Ernakulam GP
INSERT INTO wards (name, ward_number, local_body_id)
SELECT 
  'Ward ' || ward_num,
  ward_num,
  (SELECT id FROM local_bodies WHERE code = 'EKM-GP-1')
FROM (
  SELECT GENERATE_SERIES(1, 8) as ward_num
) t
WHERE NOT EXISTS (
  SELECT 1 FROM wards WHERE local_body_id = (SELECT id FROM local_bodies WHERE code = 'EKM-GP-1')
);

-- Success message
SELECT 'Seed data inserted successfully!' as message;
