
-- ... (Các bảng cũ giữ nguyên) ...

-- === MODULE MỚI: CẤU HÌNH (SETTINGS) ===
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY, -- Key ví dụ: 'studio_info'
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- BẬT REALTIME CHO SETTINGS
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- RLS POLICIES CHO SETTINGS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read Settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Manage Settings" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE staff.username = current_user AND (role = 'Giám đốc' OR username = 'admin'))
);
