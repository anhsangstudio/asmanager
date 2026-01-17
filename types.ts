
export enum ServiceType {
  WEDDING_PHOTO = 'Chụp Ảnh Cưới',
  RETAIL_SERVICE = 'Dịch Vụ Lẻ',
  RENTAL = 'Cho Thuê',
  MAKEUP = 'Trang Điểm',
  TRAINING = 'Đào Tạo'
}

export enum ContractStatus {
  PENDING = 'Chờ xử lý',
  SIGNED = 'Đã ký',
  COMPLETED = 'Hoàn thành',
  CANCELLED = 'Đã hủy'
}

export enum TransactionType {
  INCOME = 'Thu',
  EXPENSE = 'Chi'
}

export const ExpenseCategory = {
  OFFICE: 'Văn phòng',
  MARKETING: 'Marketing',
  SALARY: 'Lương',
  EQUIPMENT: 'Thiết bị',
  OTHER: 'Khác'
};

export const STAFF_ROLES = ['Giám đốc', 'Quản lý', 'Nhiếp ảnh gia', 'Makeup Artist', 'Hậu kỳ', 'Sale', 'Trợ lý'];

export interface ModulePermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  ownOnly: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
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
  username: string;
  password?: string;
  permissions: Record<string, Record<string, ModulePermission>>;
  updatedAt?: string;
}

export interface Service {
  // Database fields (mapped)
  ma_dv: string;
  ten_dv: string;
  nhom_dv: ServiceType | string;
  chi_tiet_dv: string;
  don_gia: number;
  don_vi_tinh: string;
  nhan: string;
  
  // Cost structure
  hoa_hong_pct?: number;
  chi_phi_cong_chup?: number;
  chi_phi_makeup?: number;
  chi_phi_nv_ho_tro?: number;
  chi_phi_thu_vay?: number;
  chi_phi_photoshop?: number;
  chi_phi_in_an?: number;
  chi_phi_ship?: number;
  chi_phi_an_trua?: number;
  chi_phi_lam_toc?: number;
  chi_phi_bao_bi?: number;
  chi_phi_giat_phoi?: number;
  chi_phi_khau_hao?: number;

  // Legacy/UI fields (optional/derived)
  id?: string;
  code?: string;
  name?: string;
  price?: number;
  type?: string;
  description?: string;
  unit?: string;
  label?: string;
}

export interface ContractItem {
  id: string;
  contractId: string;
  serviceId: string;
  serviceName: string;
  serviceDescription?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  notes?: string;
}

export interface Schedule {
  id: string;
  contractId: string;
  contractCode?: string;
  type: string;
  date: string;
  notes: string;
  assignments: string[];
}

export interface Contract {
  id: string;
  contractCode: string;
  customerId: string;
  date: string;
  status: ContractStatus;
  serviceType: ServiceType | string;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  paymentStage?: string;
  createdBy?: string;
  staffInChargeId?: string;
  items: ContractItem[];
  schedules: Schedule[];
  terms?: string;
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
  staffId?: string;
  vendor?: string;
  billImageUrl?: string;
}

export interface StudioInfo {
  name: string;
  address: string;
  phone: string;
  zalo: string;
  website: string;
  email: string;
  directorName: string;
  logoText: string;
  logoImage?: string;
  contractTerms?: string;
  googleDocsTemplateUrl?: string;
}

// Existing Rule-related interfaces
export interface Rule {
  id: string;
  code: string;
  title: string;
  content: string;
  penaltyAmount: number;
  isActive: boolean;
}

export interface RuleViolation {
  id: string;
  ruleId: string;
  staffId: string;
  date: string;
  amount: number;
  notes: string;
  createdBy: string;
  ruleTitle?: string; // For display
  staffName?: string; // For display
}

export interface SalaryPeriod {
  id: string;
  name: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  status: 'Open' | 'Closed';
}

export interface SalaryItem {
  id: string;
  slipId: string;
  type: 'HARD' | 'COMMISSION' | 'BONUS' | 'ALLOWANCE' | 'PENALTY';
  name: string;
  amount: number;
  isDeduction: boolean;
  referenceId?: string; // Violation ID link
}

export interface SalarySlip {
  id: string;
  periodId: string;
  staffId: string;
  totalIncome: number;
  totalDeduction: number;
  netSalary: number;
  status: 'Draft' | 'Confirmed' | 'Paid';
  notes: string;
  items: SalaryItem[];
  staffName?: string; // For display
  staffRole?: string; // For display
}
