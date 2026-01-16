
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { Service, Transaction, Staff, Contract, Schedule, Customer } from './types';

// Supabase Configuration - Assuming keys are in environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

// Only initialize Supabase if URL and Key are provided to avoid runtime crash
export const supabase: any = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

/**
 * Fetch all initial data. 
 * Note: Legacy Google Sheets bootstrap is replaced with Supabase queries.
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

    // Map Supabase service fields to the app's internal structure if needed
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
 * Supabase Service CRUD
 */
export const upsertService = async (service: Partial<Service>) => {
  if (!isConfigured || !supabase) return service;

  const { data, error } = await supabase
    .from('services')
    .upsert(service)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteService = async (ma_dv: string) => {
  if (!isConfigured || !supabase) return true;

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('ma_dv', ma_dv);

  if (error) throw error;
  return true;
};

/**
 * Realtime Subscription for Services
 */
export const subscribeToServices = (callback: (payload: any) => void) => {
  if (!isConfigured || !supabase) return null;
  
  return supabase
    .channel('services_realtime')
    .on('postgres_changes', { event: '*', table: 'services' }, callback)
    .subscribe();
};

/**
 * Login logic updated for Supabase with Mock fallback
 */
export const login = async (username: string, password: string) => {
  if (!isConfigured || !supabase) {
    // Fallback to mock login if Supabase is not configured
    // Since we are in a ESM environment, we use static import logic or just check against mock data
    try {
      // Assuming mockStaff is available from the context or a side module
      // For simplicity in this scope, we return a success for 'admin'/'123' or generic fail
      // In a real scenario, we'd import { mockStaff } from './mockData'
      if (username === 'admin' && password === '123') {
        return { 
          success: true, 
          user: { 
            id: 's1', 
            username: 'admin', 
            name: 'Admin Ánh Sáng', 
            role: 'Giám đốc', 
            permissions: {} 
          } 
        };
      }
      return { success: false, error: 'Supabase chưa được cấu hình. Thử admin/123.' };
    } catch (e) {
      return { success: false, error: 'Lỗi đăng nhập ngoại tuyến.' };
    }
  }

  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) return { success: false, error: 'Sai thông tin đăng nhập.' };
    return { success: true, user: data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/**
 * Legacy syncData replaced with direct Supabase calls for newer logic
 */
export const syncData = async (table: string, action: 'CREATE' | 'UPDATE' | 'DELETE', rawData: any) => {
  if (!isConfigured || !supabase) return { success: true, simulated: true, data: rawData };

  try {
    let tableName = table.toLowerCase();
    if (tableName === 'products') tableName = 'services';
    
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
    
    // Fallback for other tables
    const { data, error } = await supabase.from(tableName).upsert(rawData).select().single();
    if (error) throw error;
    return { success: true, data };

  } catch (error: any) {
    console.error(`[Supabase Sync Error]:`, error);
    throw error;
  }
};
