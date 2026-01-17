
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { Service, Transaction, Staff, Contract, Schedule, Customer } from './types';

// =========================
// Supabase Configuration (Vite/Vercel)
// =========================
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export const supabase: any = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// =========================
// Helpers
// =========================
const asDateOnly = (s?: string) => {
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : s; // YYYY-MM-DD
};

const safeJson = (v: any, fallback: any) => {
  try {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'object') return v;
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

const throwIfError = (res: any, context: string) => {
  if (res?.error) {
    console.error(`[Supabase] ${context}:`, res.error);
    throw new Error(res.error?.message || String(res.error));
  }
};

// =========================
// MAPPERS: camelCase <-> snake_case
// =========================

// -------- Staff --------
const staffToDb = (s: Partial<Staff>) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  role: s.role,
  phone: s.phone,
  email: s.email,

  base_salary: s.baseSalary ?? 0,
  status: s.status ?? 'Active',
  start_date: asDateOnly(s.startDate),
  notes: s.notes ?? '',

  username: s.username,
  password: s.password,
  permissions: s.permissions ?? {},
});

const staffFromDb = (r: any): Staff => ({
  id: r.id,
  code: r.code ?? r.id,
  name: r.name ?? '',
  role: r.role ?? '',
  phone: r.phone ?? '',
  email: r.email ?? '',
  baseSalary: Number(r.base_salary ?? 0),
  status: r.status ?? 'Active',
  startDate: r.start_date ? String(r.start_date) : '',
  notes: r.notes ?? '',
  createdAt: r.created_at ? String(r.created_at) : '',
  updatedAt: r.updated_at ? String(r.updated_at) : undefined,
  username: r.username ?? '',
  password: r.password ?? undefined,
  permissions: safeJson(r.permissions, {}),
});

// -------- Customer --------
const customerToDb = (c: Partial<Customer>) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  address: c.address ?? '',
});

const customerFromDb = (r: any): Customer => ({
  id: r.id,
  name: r.name ?? '',
  phone: r.phone ?? '',
  address: r.address ?? '',
});

// -------- Service (types.ts đã snake_case sẵn) --------
const serviceToDb = (s: Partial<Service>) => ({
  ma_dv: s.ma_dv ?? s.id ?? s.code,
  ten_dv: s.ten_dv ?? s.name,
  nhom_dv: s.nhom_dv ?? s.type,
  chi_tiet_dv: s.chi_tiet_dv ?? s.description,
  don_gia: s.don_gia ?? s.price ?? 0,
  don_vi_tinh: s.don_vi_tinh ?? s.unit,
  nhan: s.nhan ?? s.label,

  hoa_hong_pct: s.hoa_hong_pct ?? 0,
  chi_phi_cong_chup: s.chi_phi_cong_chup ?? 0,
  chi_phi_makeup: s.chi_phi_makeup ?? 0,
  chi_phi_nv_ho_tro: s.chi_phi_nv_ho_tro ?? 0,
  chi_phi_thu_vay: s.chi_phi_thu_vay ?? 0,
  chi_phi_photoshop: s.chi_phi_photoshop ?? 0,
  chi_phi_in_an: s.chi_phi_in_an ?? 0,
  chi_phi_ship: s.chi_phi_ship ?? 0,
  chi_phi_an_trua: s.chi_phi_an_trua ?? 0,
  chi_phi_lam_toc: s.chi_phi_lam_toc ?? 0,
  chi_phi_bao_bi: s.chi_phi_bao_bi ?? 0,
  chi_phi_giat_phoi: s.chi_phi_giat_phoi ?? 0,
  chi_phi_khau_hao: s.chi_phi_khau_hao ?? 0,
});

const serviceFromDb = (r: any): Service => ({
  ma_dv: r.ma_dv,
  ten_dv: r.ten_dv ?? '',
  nhom_dv: r.nhom_dv,
  chi_tiet_dv: r.chi_tiet_dv ?? '',
  don_gia: Number(r.don_gia ?? 0),
  don_vi_tinh: r.don_vi_tinh ?? '',
  nhan: r.nhan ?? '',

  hoa_hong_pct: Number(r.hoa_hong_pct ?? 0),
  chi_phi_cong_chup: Number(r.chi_phi_cong_chup ?? 0),
  chi_phi_makeup: Number(r.chi_phi_makeup ?? 0),
  chi_phi_nv_ho_tro: Number(r.chi_phi_nv_ho_tro ?? 0),
  chi_phi_thu_vay: Number(r.chi_phi_thu_vay ?? 0),
  chi_phi_photoshop: Number(r.chi_phi_photoshop ?? 0),
  chi_phi_in_an: Number(r.chi_phi_in_an ?? 0),
  chi_phi_ship: Number(r.chi_phi_ship ?? 0),
  chi_phi_an_trua: Number(r.chi_phi_an_trua ?? 0),
  chi_phi_lam_toc: Number(r.chi_phi_lam_toc ?? 0),
  chi_phi_bao_bi: Number(r.chi_phi_bao_bi ?? 0),
  chi_phi_giat_phoi: Number(r.chi_phi_giat_phoi ?? 0),
  chi_phi_khau_hao: Number(r.chi_phi_khau_hao ?? 0),

  // legacy for UI
  id: r.ma_dv,
  code: r.ma_dv,
  name: r.ten_dv,
  price: Number(r.don_gia ?? 0),
  type: r.nhom_dv,
  description: r.chi_tiet_dv ?? '',
  unit: r.don_vi_tinh ?? '',
  label: r.nhan ?? '',
});

// -------- Contract --------
const contractToDb = (c: Partial<Contract>) => ({
  id: c.id,
  contract_code: c.contractCode,
  customer_id: c.customerId, // ✅ snake_case
  staff_in_charge_id: c.staffInChargeId || null, // Convert empty string to null
  contract_date: asDateOnly(c.date),

  status: c.status,
  service_type: c.serviceType,

  total_amount: c.totalAmount ?? 0,
  paid_amount: c.paidAmount ?? 0,
  payment_method: c.paymentMethod ?? '',
  payment_stage: c.paymentStage ?? null,
  terms: c.terms ?? null,
  created_by: c.createdBy || null, // Convert empty string to null
});

const contractFromDb = (r: any): Contract => ({
  id: r.id,
  customerId: r.customer_id,
  staffInChargeId: r.staff_in_charge_id ?? undefined,
  contractCode: r.contract_code,
  date: r.contract_date ? String(r.contract_date) : '',
  status: r.status,
  totalAmount: Number(r.total_amount ?? 0),
  paidAmount: Number(r.paid_amount ?? 0),
  paymentMethod: r.payment_method ?? '',
  createdBy: r.created_by ?? '',
  items: [],
  schedules: [],
  serviceType: r.service_type,
  paymentStage: r.payment_stage ?? undefined,
  terms: r.terms ?? undefined,
});

// -------- ContractItem --------
const contractItemToDb = (it: any) => ({
  id: it.id,
  contract_id: it.contractId,
  service_id: it.serviceId,
  quantity: it.quantity ?? 1,
  subtotal: it.subtotal ?? 0,
  unit_price: it.unitPrice ?? 0,
  discount: it.discount ?? 0,
  notes: it.notes ?? '',
  service_name: it.serviceName ?? '',
  service_description: it.serviceDescription ?? null,
});

const contractItemFromDb = (r: any) => ({
  id: r.id,
  contractId: r.contract_id,
  serviceId: r.service_id,
  quantity: Number(r.quantity ?? 1),
  subtotal: Number(r.subtotal ?? 0),
  unitPrice: Number(r.unit_price ?? 0),
  discount: Number(r.discount ?? 0),
  notes: r.notes ?? '',
  serviceName: r.service_name ?? '',
  serviceDescription: r.service_description ?? undefined,
});

// -------- Schedule --------
const scheduleToDb = (s: Partial<Schedule>) => ({
  id: s.id,
  contract_id: s.contractId,
  contract_code: s.contractCode ?? null,
  schedule_type: s.type,
  schedule_date: asDateOnly(s.date),
  notes: s.notes ?? '',
  assignments: s.assignments ?? [],
});

const scheduleFromDb = (r: any): Schedule => ({
  id: r.id,
  contractId: r.contract_id,
  contractCode: r.contract_code ?? undefined,
  type: r.schedule_type,
  date: r.schedule_date ? String(r.schedule_date) : '',
  notes: r.notes ?? '',
  assignments: Array.isArray(r.assignments) ? r.assignments : safeJson(r.assignments, []),
});

// -------- Transaction --------
const transactionToDb = (t: Partial<Transaction>) => ({
  id: t.id,
  transaction_type: t.type, // ✅ FIXED: matches DB 'transaction_type'
  main_category: t.mainCategory ?? '',
  category: t.category ?? '',
  amount: t.amount ?? 0,
  description: t.description ?? '',
  transaction_date: asDateOnly(t.date), // ✅ FIXED: matches DB 'transaction_date'

  contract_id: t.contractId || null, 
  vendor: t.vendor ?? null,
  staff_id: t.staffId || null, 
  bill_image_url: t.billImageUrl ?? null,
});

const transactionFromDb = (r: any): Transaction => ({
  id: r.id,
  type: r.transaction_type, // ✅ FIXED
  mainCategory: r.main_category ?? '',
  category: r.category ?? '',
  amount: Number(r.amount ?? 0),
  description: r.description ?? '',
  date: r.transaction_date ? String(r.transaction_date) : '', // ✅ FIXED
  contractId: r.contract_id ?? undefined,
  vendor: r.vendor ?? undefined,
  staffId: r.staff_id ?? undefined,
  billImageUrl: r.bill_image_url ?? undefined,
});

// =========================
// Upload file to Supabase Storage
// =========================
export const uploadFile = async (bucket: string, path: string, file: File) => {
  if (!isConfigured || !supabase) return null;

  const up = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  throwIfError(up, `uploadFile ${bucket}/${path}`);

  const pub = supabase.storage.from(bucket).getPublicUrl(up.data.path);
  return pub?.data?.publicUrl ?? null;
};

// =========================
// Service Code Management
// =========================
export const checkServiceCodeExists = async (code: string): Promise<boolean> => {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('services')
    .select('ma_dv')
    .eq('ma_dv', code.trim().toUpperCase())
    .maybeSingle();
  
  return !!data;
};

export const getNextServiceCode = async (): Promise<string> => {
  if (!supabase) return `DV-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
  
  const { data, error } = await supabase
    .from('services')
    .select('ma_dv')
    .like('ma_dv', 'DV-%')
    .order('ma_dv', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastCode = data[0].ma_dv;
    const match = lastCode.match(/\d+/);
    if (match) {
      const nextNum = parseInt(match[0]) + 1;
      return `DV-${nextNum.toString().padStart(6, '0')}`;
    }
  }
  return 'DV-000001';
};

// =========================
// LOGIN (Supabase)
// =========================
export const login = async (
  username: string,
  password: string
): Promise<{ success: boolean; user?: Staff; error?: string }> => {
  if (!isConfigured || !supabase) {
    const { mockStaff } = await import('./mockData');
    const user = mockStaff.find((s: any) => s.username === username && s.password === password);
    return user ? { success: true, user: user as Staff } : { success: false, error: 'Chế độ Offline: Sai thông tin đăng nhập.' };
  }

  const res = await supabase
    .from('staff')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (res.error) return { success: false, error: res.error.message };
  if (!res.data) return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' };

  return { success: true, user: staffFromDb(res.data) };
};

// =========================
// BOOTSTRAP DATA (Supabase -> App)
// =========================
export const fetchBootstrapData = async () => {
  if (!isConfigured || !supabase) {
    console.warn('Supabase not configured. App will run with mock data.');
    return null;
  }

  const [
    servicesRes,
    staffRes,
    customersRes,
    contractsRes,
    itemsRes,
    schedulesRes,
    transactionsRes,
  ] = await Promise.all([
    supabase.from('services').select('*').order('created_at', { ascending: false }),
    supabase.from('staff').select('*'),
    supabase.from('customers').select('*'),
    supabase.from('contracts').select('*').order('contract_date', { ascending: false }),
    supabase.from('contract_items').select('*'),
    supabase.from('schedules').select('*').order('schedule_date', { ascending: false }),
    supabase.from('transactions').select('*').order('transaction_date', { ascending: false }), // Fixed order column to 'transaction_date'
  ]);

  const err =
    servicesRes.error ||
    staffRes.error ||
    customersRes.error ||
    contractsRes.error ||
    itemsRes.error ||
    schedulesRes.error ||
    transactionsRes.error;

  if (err) throw new Error(err.message || String(err));

  const services = (servicesRes.data ?? []).map(serviceFromDb);
  const staff = (staffRes.data ?? []).map(staffFromDb);
  const customers = (customersRes.data ?? []).map(customerFromDb);

  const items = (itemsRes.data ?? []).map(contractItemFromDb);
  const schedules = (schedulesRes.data ?? []).map(scheduleFromDb);
  const transactions = (transactionsRes.data ?? []).map(transactionFromDb);

  // ghép contracts
  const contractMap = new Map<string, Contract>();
  for (const r of contractsRes.data ?? []) contractMap.set(r.id, contractFromDb(r));
  for (const it of items) {
    const c = contractMap.get(it.contractId);
    if (c) c.items.push(it);
  }
  for (const sc of schedules) {
    const c = contractMap.get(sc.contractId);
    if (c) c.schedules.push(sc);
  }

  return {
    services,
    staff,
    customers,
    contracts: Array.from(contractMap.values()),
    transactions,
    schedules,
  };
};

// =========================
// Low-level helpers
// =========================
const upsertOne = async (table: string, payload: any) => {
  const res = await supabase.from(table).upsert(payload).select().single();
  throwIfError(res, `upsert ${table}`);
  return res.data;
};

const deleteBy = async (table: string, key: string, value: any) => {
  const res = await supabase.from(table).delete().eq(key, value);
  throwIfError(res, `delete ${table} where ${key}=${value}`);
  return true;
};

// =========================
// SYNC (App -> Supabase)
// =========================
export const syncData = async (table: string, action: 'CREATE' | 'UPDATE' | 'DELETE', rawData: any) => {
  if (!isConfigured || !supabase) return { success: true, simulated: true, data: rawData };

  let tableName = table.toLowerCase();
  if (tableName === 'products' || tableName === 'sanpham') tableName = 'services';
  if (tableName === 'nhanvien') tableName = 'staff';
  if (tableName === 'hopdong') tableName = 'contracts';
  if (tableName === 'thuchi') tableName = 'transactions';
  if (tableName === 'khachhang') tableName = 'customers';
  if (tableName === 'lichlamviec') tableName = 'schedules';

  // -------- DELETE --------
  if (action === 'DELETE') {
    if (tableName === 'services') {
      await deleteBy('services', 'ma_dv', rawData.ma_dv ?? rawData.id ?? rawData.code);
      return { success: true };
    }
    await deleteBy(tableName, 'id', rawData.id);
    return { success: true };
  }

  // -------- UPSERT --------
  if (tableName === 'services') {
    const data = await upsertOne('services', serviceToDb(rawData));
    return { success: true, data: serviceFromDb(data) };
  }

  if (tableName === 'staff') {
    const data = await upsertOne('staff', staffToDb(rawData));
    return { success: true, data: staffFromDb(data) };
  }

  if (tableName === 'customers') {
    const data = await upsertOne('customers', customerToDb(rawData));
    return { success: true, data: customerFromDb(data) };
  }

  if (tableName === 'transactions') {
    const data = await upsertOne('transactions', transactionToDb(rawData));
    return { success: true, data: transactionFromDb(data) };
  }

  if (tableName === 'schedules') {
    const data = await upsertOne('schedules', scheduleToDb(rawData));
    return { success: true, data: scheduleFromDb(data) };
  }

  if (tableName === 'contracts') {
    // 1) upsert contracts
    const savedContract = await upsertOne('contracts', contractToDb(rawData));

    // 2) upsert items
    const items = Array.isArray(rawData.items) ? rawData.items : [];
    for (const it of items) {
      await upsertOne('contract_items', contractItemToDb({ ...it, contractId: it.contractId ?? rawData.id }));
    }

    // 3) upsert schedules
    const schedules = Array.isArray(rawData.schedules) ? rawData.schedules : [];
    for (const sc of schedules) {
      await upsertOne(
        'schedules',
        scheduleToDb({
          ...sc,
          contractId: sc.contractId ?? rawData.id,
          contractCode: sc.contractCode ?? rawData.contractCode,
        })
      );
    }

    const out = contractFromDb(savedContract);
    out.items = items;
    out.schedules = schedules;

    return { success: true, data: out };
  }

  // fallback
  const data = await upsertOne(tableName, rawData);
  return { success: true, data };
};
