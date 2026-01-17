import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { Service, Transaction, Staff, Contract, Schedule, Customer, Rule, RuleViolation, SalaryPeriod, SalarySlip, SalaryItem, StudioInfo } from './types';

// Helper to get Env Vars across different frameworks (Vite, Next, Create-React-App)
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  return '';
};

// Supabase Configuration
// Try standard REACT_APP_ first, then VITE_, then generic
const supabaseUrl = getEnv('REACT_APP_SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseKey = getEnv('REACT_APP_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

export const isConfigured = !!supabaseUrl && !!supabaseKey;
export const supabase = isConfigured ? createClient(supabaseUrl, supabaseKey) : null;

// Helpers
const upsertOne = async (table: string, data: any) => {
  if (!supabase) return data;
  const { data: result, error } = await supabase.from(table).upsert(data).select().single();
  if (error) throw error;
  return result;
};

const deleteBy = async (table: string, col: string, val: any) => {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq(col, val);
  if (error) throw error;
};

// --- GENERIC FETCH FUNCTION ---
export const fetchCollection = async (table: string) => {
  if (!isConfigured || !supabase) return [];
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(1000); // Default limit for safety
  if (error) {
    console.error(`Error fetching ${table}:`, error);
    return [];
  }
  return data;
};

export const checkServiceCodeExists = async (code: string) => {
  if (!supabase) return false;
  const { data } = await supabase.from('services').select('ma_dv').eq('ma_dv', code).maybeSingle();
  return !!data;
};

export const getNextServiceCode = async () => {
  // Simple timestamp based code gen if not connected to DB logic
  return `DV-${Date.now()}`;
};

export const uploadTransactionImage = async (file: File, metadata: any) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));
  try {
    const res = await fetch('/api/drive_upload', { method: 'POST', body: formData });
    return await res.json();
  } catch (error) {
    console.error("Upload error", error);
    return { success: false, error: 'Upload failed' };
  }
};

// --- MAPPERS ---
// Rule
const ruleToDb = (r: Partial<Rule>) => ({
  id: r.id,
  code: r.code,
  title: r.title,
  content: r.content,
  penalty_amount: r.penaltyAmount,
  is_active: r.isActive
});
const ruleFromDb = (r: any): Rule => ({
  id: r.id,
  code: r.code,
  title: r.title,
  content: r.content,
  penaltyAmount: Number(r.penalty_amount || 0),
  isActive: r.is_active
});

// Violation
const violationToDb = (v: Partial<RuleViolation>) => ({
  id: v.id,
  rule_id: v.ruleId,
  staff_id: v.staffId,
  violation_date: v.date, 
  amount: v.amount,
  notes: v.notes,
  created_by: v.createdBy
});
const violationFromDb = (r: any): RuleViolation => ({
  id: r.id,
  ruleId: r.rule_id,
  staffId: r.staff_id,
  date: String(r.violation_date),
  amount: Number(r.amount || 0),
  notes: r.notes,
  createdBy: r.created_by,
  ruleTitle: r.rules?.title, 
  staffName: r.staff?.name 
});

// Salary Period
const salaryPeriodToDb = (p: Partial<SalaryPeriod>) => ({
  id: p.id,
  name: p.name,
  month: p.month,
  year: p.year,
  start_date: p.startDate,
  end_date: p.endDate,
  status: p.status
});
const salaryPeriodFromDb = (r: any): SalaryPeriod => ({
  id: r.id,
  name: r.name,
  month: r.month,
  year: r.year,
  startDate: String(r.start_date),
  endDate: String(r.end_date),
  status: r.status
});

// Salary Slip
const salarySlipToDb = (s: Partial<SalarySlip>) => ({
  id: s.id,
  period_id: s.periodId,
  staff_id: s.staffId,
  total_income: s.totalIncome,
  total_deduction: s.totalDeduction,
  net_salary: s.netSalary,
  status: s.status,
  notes: s.notes
});
const salarySlipFromDb = (r: any): SalarySlip => ({
  id: r.id,
  periodId: r.period_id,
  staffId: r.staff_id,
  totalIncome: Number(r.total_income || 0),
  totalDeduction: Number(r.total_deduction || 0),
  netSalary: Number(r.net_salary || 0),
  status: r.status,
  notes: r.notes,
  items: [],
  staffName: r.staff?.name,
  staffRole: r.staff?.role
});

// Salary Item
const salaryItemToDb = (i: Partial<SalaryItem>) => ({
  id: i.id,
  slip_id: i.slipId,
  type: i.type,
  name: i.name,
  amount: i.amount,
  is_deduction: i.isDeduction,
  reference_id: i.referenceId
});
const salaryItemFromDb = (r: any): SalaryItem => ({
  id: r.id,
  slipId: r.slip_id,
  type: r.type,
  name: r.name,
  amount: Number(r.amount || 0),
  isDeduction: r.is_deduction,
  referenceId: r.reference_id
});

export const fetchRulesData = async () => {
  if (!isConfigured || !supabase) return { rules: [], violations: [] };
  
  const [rulesRes, violationsRes] = await Promise.all([
    supabase.from('rules').select('*').order('created_at', { ascending: false }),
    supabase.from('rule_violations').select('*, rules(title), staff(name)').order('created_at', { ascending: false })
  ]);
  
  return {
    rules: (rulesRes.data || []).map(ruleFromDb),
    violations: (violationsRes.data || []).map(violationFromDb)
  };
};

export const fetchSalaryData = async (staffId?: string) => {
  if (!isConfigured || !supabase) return { periods: [], slips: [] };

  const periodsRes = await supabase.from('salary_periods').select('*').order('year', { ascending: false }).order('month', { ascending: false });
  
  let slipsQuery = supabase.from('salary_slips').select('*, staff(name, role)').order('created_at', { ascending: false });
  if (staffId) {
    slipsQuery = slipsQuery.eq('staff_id', staffId);
  }
  const slipsRes = await slipsQuery;

  let items: any[] = [];
  if (slipsRes.data && slipsRes.data.length > 0) {
    const slipIds = slipsRes.data.map((s: any) => s.id);
    const itemsRes = await supabase.from('salary_items').select('*').in('slip_id', slipIds);
    items = (itemsRes.data || []).map(salaryItemFromDb);
  }
    
  const slips = (slipsRes.data || []).map(salarySlipFromDb).map((s: SalarySlip) => {
    s.items = items.filter((i: SalaryItem) => i.slipId === s.id);
    return s;
  });
    
  return {
    periods: (periodsRes.data || []).map(salaryPeriodFromDb),
    slips
  };
};

export const fetchSettings = async () => {
  if (!isConfigured || !supabase) return null;
  const { data } = await supabase.from('settings').select('value').eq('id', 'studio_info').maybeSingle();
  return data ? data.value : null;
};

export const syncData = async (table: string, action: 'CREATE' | 'UPDATE' | 'DELETE', rawData: any) => {
  if (!isConfigured || !supabase) {
    console.warn("Supabase not configured. Operation simulated:", action, table);
    return { success: true, simulated: true, data: rawData };
  }

  let tableName = table.toLowerCase();
  
  // Mapping
  if (tableName === 'products') tableName = 'services';
  if (tableName === 'nhanvien') tableName = 'staff';
  if (tableName === 'hopdong') tableName = 'contracts';
  if (tableName === 'thuchi') tableName = 'transactions';
  if (tableName === 'khachhang') tableName = 'customers';
  if (tableName === 'lichlamviec') tableName = 'schedules';
  
  if (tableName === 'noiquy') tableName = 'rules';
  if (tableName === 'vipham') tableName = 'rule_violations';
  if (tableName === 'kyluong') tableName = 'salary_periods';
  if (tableName === 'phieuluong') tableName = 'salary_slips';
  if (tableName === 'chitietluong') tableName = 'salary_items';

  // XỬ LÝ SETTINGS
  if (tableName === 'settings') {
    const data = await upsertOne('settings', { id: 'studio_info', value: rawData });
    return { success: true, data: data.value };
  }

  if (action === 'DELETE') {
     await deleteBy(tableName, tableName === 'services' ? 'ma_dv' : 'id', rawData.id || rawData.ma_dv);
     return { success: true };
  }

  // Handle Mapped Types
  if (tableName === 'rules') {
    const data = await upsertOne('rules', ruleToDb(rawData));
    return { success: true, data: ruleFromDb(data) };
  }
  if (tableName === 'rule_violations') {
    const data = await upsertOne('rule_violations', violationToDb(rawData));
    return { success: true, data: violationFromDb(data) };
  }
  if (tableName === 'salary_periods') {
    const data = await upsertOne('salary_periods', salaryPeriodToDb(rawData));
    return { success: true, data: salaryPeriodFromDb(data) };
  }
  if (tableName === 'salary_slips') {
    const data = await upsertOne('salary_slips', salarySlipToDb(rawData));
    return { success: true, data: salarySlipFromDb(data) };
  }
  if (tableName === 'salary_items') {
    const data = await upsertOne('salary_items', salaryItemToDb(rawData));
    return { success: true, data: salaryItemFromDb(data) };
  }

  // Handle Default Types
  const data = await upsertOne(tableName, rawData);
  return { success: true, data };
};