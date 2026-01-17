
-- ... (Các bảng cũ giữ nguyên) ...

-- === MODULE MỚI: NỘI QUY (RULES) ===
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  penalty_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS rule_violations (
  id TEXT PRIMARY KEY,
  rule_id TEXT REFERENCES rules(id),
  staff_id TEXT REFERENCES staff(id),
  violation_date DATE NOT NULL,
  amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- === MODULE MỚI: LƯƠNG (PAYROLL) ===
CREATE TABLE IF NOT EXISTS salary_periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- VD: Kỳ lương Tháng 05/2024
  month INT NOT NULL,
  year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'Open', -- Open, Closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS salary_slips (
  id TEXT PRIMARY KEY,
  period_id TEXT REFERENCES salary_periods(id),
  staff_id TEXT REFERENCES staff(id),
  total_income NUMERIC DEFAULT 0,
  total_deduction NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft', -- Draft, Confirmed, Paid
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS salary_items (
  id TEXT PRIMARY KEY,
  slip_id TEXT REFERENCES salary_slips(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- HARD, COMMISSION, BONUS, ALLOWANCE, PENALTY
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  is_deduction BOOLEAN DEFAULT FALSE,
  reference_id TEXT, -- Link to violation_id if penalty
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- BẬT REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE rules;
ALTER PUBLICATION supabase_realtime ADD TABLE rule_violations;
ALTER PUBLICATION supabase_realtime ADD TABLE salary_periods;
ALTER PUBLICATION supabase_realtime ADD TABLE salary_slips;
ALTER PUBLICATION supabase_realtime ADD TABLE salary_items;

-- RLS POLICIES
-- RULES: Ai cũng xem được, chỉ Admin/Giám đốc sửa
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read Rules" ON rules FOR SELECT USING (true);
CREATE POLICY "Manage Rules" ON rules FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE staff.username = current_user AND (role = 'Giám đốc' OR username = 'admin'))
);

-- SALARY: Xem lương mình, Admin xem tất cả
ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View Own Slip" ON salary_slips FOR SELECT USING (
  staff_id IN (SELECT id FROM staff WHERE username = current_user) OR
  EXISTS (SELECT 1 FROM staff WHERE staff.username = current_user AND (role = 'Giám đốc' OR username = 'admin'))
);
-- Lưu ý: Cần thêm Policy cho salary_items tương tự (join qua slip_id)
