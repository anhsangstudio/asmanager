
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create services table
CREATE TABLE services (
  ma_dv UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten_dv TEXT NOT NULL,
  nhom_dv TEXT NOT NULL,
  don_vi_tinh TEXT DEFAULT 'Gói',
  nhan TEXT DEFAULT '-',
  chi_tiet_dv TEXT,
  hoa_hong_pct NUMERIC DEFAULT 0,
  chi_phi_cong_chup NUMERIC DEFAULT 0,
  chi_phi_makeup NUMERIC DEFAULT 0,
  chi_phi_nv_ho_tro NUMERIC DEFAULT 0,
  chi_phi_thu_vay NUMERIC DEFAULT 0,
  chi_phi_photoshop NUMERIC DEFAULT 0,
  chi_phi_in_an NUMERIC DEFAULT 0,
  chi_phi_ship NUMERIC DEFAULT 0,
  chi_phi_an_trua NUMERIC DEFAULT 0,
  chi_phi_lam_toc NUMERIC DEFAULT 0,
  chi_phi_bao_bi NUMERIC DEFAULT 0,
  chi_phi_giat_phoi NUMERIC DEFAULT 0,
  chi_phi_khau_hao NUMERIC DEFAULT 0,
  don_gia NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Realtime enablement (Run this in Supabase SQL Editor if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE services;
