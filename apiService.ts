
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { Service, Transaction, Staff, Contract, Schedule, Customer } from './types';

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

// Only initialize Supabase if URL and Key are provided to avoid runtime crash
export const supabase: any = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

/**
 * Authentication function for staff login.
 * Queries the 'staff' table in Supabase or falls back to mock data if not configured.
 * @google/genai fix: implemented missing login export to resolve import error in App.tsx.
 */
export const login = async (username: string, password: string): Promise<{ success: boolean; user?: Staff; error?: string }> => {
  if (!isConfigured || !supabase) {
    // Dynamic import to avoid circular dependency with mockData
    const { mockStaff } = await import('./mockData');
    const user = mockStaff.find(s => s.username === username && s.password === password);
    if (user) {
      return { success: true, user: user as Staff };
    }
    return { success: false, error: 'Chế độ Offline: Sai thông tin đăng nhập.' };
  }

  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' };
    }

    return { success: true, user: data as Staff };
  } catch (err: any) {
    console.error("Login system error:", err);
    return { success: false, error: 'Lỗi hệ thống hoặc kết nối cơ sở dữ liệu.' };
  }
};

/**
 * Fetch all initial data from Supabase Cloud
 */
export const fetchBootstrapData = async () => {
  if (!isConfigured || !supabase) {
    console.warn("Supabase not configured. App will run with mock data.");
    return null;
  }
  
  try {
    const [
      { data: services },
      { data: staff },
      { data: contracts },
      { data: transactions },
      { data: schedules }
    ] = await Promise.all([
      supabase.from('services').select('*').order('created_at', { ascending: false }),
      supabase.from('staff').select('*'),
      supabase.from('contracts').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('schedules').select('*')
    ]);

    // Map Supabase service fields to the app's internal structure
    const mappedServices = (services || []).map((s: any) => ({
      ...s,
      id: s.ma_dv,
      code: s.ma_dv,
      name: s.ten_dv,
      price: s.don_gia,
      type: s.nhom_dv,
      description: s.chi_tiet_dv,
      unit: s.don_vi_tinh,
      label: s.nhan
    }));

    return {
      services: mappedServices,
      staff: staff || [],
      contracts: contracts || [],
      transactions: transactions || [],
      schedules: schedules || []
    };
  } catch (error) {
    console.error("Bootstrap Error:", error);
    throw error;
  }
};

/**
 * Main data synchronization function for Supabase Cloud
 */
export const syncData = async (table: string, action: 'CREATE' | 'UPDATE' | 'DELETE', rawData: any) => {
  if (!isConfigured || !supabase) return { success: true, simulated: true, data: rawData };

  try {
    let tableName = table.toLowerCase();
    
    // Chuẩn hóa tên bảng từ code sang bảng thực tế trong Supabase
    if (tableName === 'products' || tableName === 'sanpham') tableName = 'services';
    if (tableName === 'staff' || tableName === 'nhanvien') tableName = 'staff';
    if (tableName === 'contracts' || tableName === 'hopdong') tableName = 'contracts';
    if (tableName === 'transactions' || tableName === 'thuchi') tableName = 'transactions';
    if (tableName === 'customers' || tableName === 'khachhang') tableName = 'customers';
    if (tableName === 'lichlamviec') tableName = 'schedules';
    
    // Xử lý riêng cho bảng services (sử dụng ma_dv làm khóa chính)
    if (tableName === 'services') {
      if (action === 'DELETE') {
        const { error } = await supabase.from('services').delete().eq('ma_dv', rawData.ma_dv);
        if (error) throw error;
        return { success: true };
      } else {
        const { data, error } = await supabase.from('services').upsert(rawData).select().single();
        if (error) throw error;
        return { success: true, data };
      }
    }
    
    // Xử lý mặc định cho các bảng khác (sử dụng id làm khóa chính)
    if (action === 'DELETE') {
      const { error } = await supabase.from(tableName).delete().eq('id', rawData.id);
      if (error) throw error;
      return { success: true };
    } else {
      const { data, error } = await supabase.from(tableName).upsert(rawData).select().single();
      if (error) throw error;
      return { success: true, data };
    }

  } catch (error: any) {
    console.error(`[Supabase Sync Error Table: ${table}]:`, error);
    throw error;
  }
};
