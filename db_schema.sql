
-- ENABLE UUID EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SERVICES TABLE (DANH MỤC DỊCH VỤ)
CREATE TABLE IF NOT EXISTS services (
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

-- 2. STAFF TABLE (NHÂN VIÊN)
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  base_salary NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',
  start_date DATE,
  permissions JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 3. CUSTOMERS TABLE (KHÁCH HÀNG)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. CONTRACTS TABLE (HỢP ĐỒNG)
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contract_code TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  staff_in_charge_id TEXT REFERENCES staff(id),
  date DATE NOT NULL,
  status TEXT NOT NULL,
  service_type TEXT,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  items JSONB DEFAULT '[]',
  schedules JSONB DEFAULT '[]',
  terms TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TRANSACTIONS TABLE (THU CHI)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- INCOME / EXPENSE
  main_category TEXT,
  category TEXT,
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  contract_id TEXT REFERENCES contracts(id),
  staff_id TEXT REFERENCES staff(id),
  vendor TEXT,
  bill_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. SCHEDULES TABLE (LỊCH LÀM VIỆC)
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  contract_id TEXT REFERENCES contracts(id),
  type TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  assignments JSONB DEFAULT '[]', -- Mảng ID nhân viên
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- BẬT REALTIME CHO CÁC BẢNG QUAN TRỌNG
ALTER PUBLICATION supabase_realtime ADD TABLE services;
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
