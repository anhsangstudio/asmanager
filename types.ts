
export enum ServiceType {
  WEDDING_PHOTO = 'Chụp Ảnh Cưới',
  FAMILY_PHOTO = 'Chụp Ảnh Gia Đình',
  BEAUTY_PHOTO = 'Chụp Ảnh Beauty',
  RETAIL_SERVICE = 'Dịch Vụ Lẻ'
}

export enum ContractStatus {
  LEAD = 'Lead/Quan tâm',
  BOOKED = 'Đặt lịch',
  SIGNED = 'Ký hợp đồng',
  PRODUCTION = 'Đang sản xuất',
  DELIVERY = 'Bàn giao',
  COMPLETED = 'Hoàn thành',
  CANCELLED = 'Hủy'
}

export type ScheduleType = string;

export const DEFAULT_SCHEDULE_TYPES = [
  'Ngày Dạm Ngõ',
  'Ngày Ăn Hỏi',
  'Ngày Cưới',
  'Ngày Tiệc',
  'Lễ Cưới Nhà Thờ',
  'Chụp tại Studio',
  'Trang điểm'
];

export const DEFAULT_DEPARTMENTS = [
  'Sản xuất',
  'Makeup',
  'Hậu kỳ',
  'Kho',
  'Quản trị',
  'Sales/Marketing'
];

export const STAFF_ROLES = [
  'Giám đốc',
  'Tư Vấn',
  'Marketing',
  'Thợ Make',
  'Thợ Chụp',
  'Phòng Váy',
  'Hỗ Trợ'
];

export enum TransactionType {
  INCOME = 'Thu',
  EXPENSE = 'Chi'
}

export enum ExpenseCategory {
  PRODUCTION = 'Sản xuất',
  SALES = 'Bán hàng',
  MARKETING = 'Marketing',
  ADMIN = 'Quản trị',
  INVESTMENT = 'Đầu tư',
  OTHER = 'Khác'
}

export interface StudioInfo {
  name: string;
  address: string;
  phone: string;
  zalo: string;
  website: string;
  fanpage: string;
  email: string;
  directorName: string;
  googleDocsTemplateUrl: string;
  logoText: string;
  logoImage?: string;
  contractTerms: string;
}

export interface ProductionCostDetail {
  id: string;
  type: string;
  department: string;
  value: number;
  unitType: 'fixed' | 'percent';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Service {
  ma_dv: string;             // Primary Key (Supabase UUID)
  ten_dv: string;
  nhom_dv: ServiceType;
  chi_tiet_dv: string;
  don_gia: number;
  don_vi_tinh: string;
  nhan: string;
  
  // Chi phí (Stored in Supabase)
  hoa_hong_pct: number;      // Phần trăm hoa hồng
  chi_phi_cong_chup: number;
  chi_phi_makeup: number;
  chi_phi_nv_ho_tro: number;
  chi_phi_thu_vay: number;
  chi_phi_photoshop: number;
  chi_phi_in_an: number;
  chi_phi_ship: number;
  chi_phi_an_trua: number;
  chi_phi_lam_toc: number;
  chi_phi_bao_bi: number;
  chi_phi_giat_phoi: number;
  chi_phi_khau_hao: number;

  // Legacy fields (kept for compatibility with Contract module if needed, mapped from above)
  id?: string;               // maps to ma_dv
  code?: string;             // maps to ma_dv
  name?: string;             // maps to ten_dv
  price?: number;            // maps to don_gia
  type?: ServiceType;        // maps to nhom_dv
  description?: string;      // maps to chi_tiet_dv
  unit?: string;             // maps to don_vi_tinh
  label?: string;            // maps to nhan
}

export interface Contract {
  id: string;
  customerId: string;
  staffInChargeId?: string;
  contractCode: string;
  date: string;
  status: ContractStatus;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  createdBy: string;
  items: ContractItem[];
  schedules: Schedule[];
  serviceType: ServiceType;
  paymentStage?: string;
  terms?: string;
}

export interface ContractItem {
  id: string;
  contractId: string;
  serviceId: string;
  quantity: number;
  subtotal: number;
  unitPrice: number;
  discount: number;
  notes: string;
  serviceName: string;
  serviceDescription?: string;
}

export interface Schedule {
  id: string;
  contractId: string;
  contractCode?: string;
  type: ScheduleType;
  date: string;
  notes: string;
  assignments: string[];
}

export interface ModulePermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  ownOnly: boolean;
}

export interface Staff {
  id: string;
  code: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  baseSalary: number;
  status: 'Active' | 'Inactive';
  startDate: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
  username: string;
  password?: string;
  permissions: Record<string, Record<string, ModulePermission>>;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  mainCategory: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  contractId?: string;
  vendor?: string;
  staffId?: string;
  billImageUrl?: string; 
}

export interface AIRule {
  id: string;
  keyword: string;
  vendor?: string;
  category: ExpenseCategory;
}
