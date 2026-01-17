import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Loader2, CheckCircle2, AlertCircle, 
  Calendar, DollarSign, User, FileText, ChevronRight, X
} from 'lucide-react';
import { 
  Contract, Customer, Transaction, Service, Staff, StudioInfo, 
  ContractStatus, ServiceType 
} from '../types';
import { syncData } from '../apiService';
import ContractPrint from './ContractPrint';

interface Props {
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  services: Service[];
  staff: Staff[];
  scheduleTypes: string[];
  setScheduleTypes: React.Dispatch<React.SetStateAction<string[]>>;
  studioInfo: StudioInfo;
  currentUser: Staff | null;
}

const initialFormState: Contract = {
  id: '',
  contractCode: '',
  customerId: '',
  date: new Date().toISOString().split('T')[0],
  status: ContractStatus.PENDING,
  serviceType: ServiceType.WEDDING_PHOTO,
  totalAmount: 0,
  paidAmount: 0,
  paymentMethod: 'Tiền mặt',
  items: [],
  schedules: []
};

const ContractManager: React.FC<Props> = ({ 
  contracts, setContracts, customers, setCustomers, 
  transactions, setTransactions, services, staff, scheduleTypes, setScheduleTypes,
  studioInfo, currentUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [form, setForm] = useState<Contract>(initialFormState);
  const [filter, setFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // PERMISSION CHECKS
  const isAdmin = currentUser?.username === 'admin' || currentUser?.role === 'Giám đốc';
  const perms = currentUser?.permissions?.['contracts'] || {};
  const canAdd = isAdmin || perms['create']?.add || perms['list']?.add;
  const canEdit = isAdmin || perms['list']?.edit;

  const handleOpenEdit = (contract: Contract) => {
    setEditingContractId(contract.id);
    setForm({ ...contract });
    setIsModalOpen(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContractId && !canEdit) {
      alert("Bạn không có quyền chỉnh sửa hợp đồng này.");
      return;
    }
    if (!editingContractId && !canAdd) {
      alert("Bạn không có quyền tạo hợp đồng mới.");
      return;
    }
    
    setIsSaving(true);
    setFormError(null);

    try {
      const action = editingContractId ? 'UPDATE' : 'CREATE';
      const payload = { ...form, id: form.id || `contract-${Date.now()}` };
      
      const result = await syncData('contracts', action, payload);
      
      if (result.success) {
        if (action === 'CREATE') {
          setContracts(prev => [...prev, result.data]);
        } else {
          setContracts(prev => prev.map(c => c.id === result.data.id ? result.data : c));
        }
        setIsModalOpen(false);
      } else {
        setFormError("Lỗi khi lưu hợp đồng.");
      }
    } catch (error) {
      console.error(error);
      setFormError("Đã xảy ra lỗi hệ thống.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Tìm mã HĐ, tên khách..." 
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        {canAdd && (
          <button 
            onClick={() => { setEditingContractId(null); setForm(initialFormState); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={18} /> Tạo hợp đồng mới
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="p-4">Mã HĐ</th>
              <th className="p-4">Khách hàng</th>
              <th className="p-4">Dịch vụ</th>
              <th className="p-4 text-right">Tổng tiền</th>
              <th className="p-4 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.filter(c => 
              c.contractCode.toLowerCase().includes(filter.toLowerCase()) ||
              customers.find(cust => cust.id === c.customerId)?.name.toLowerCase().includes(filter.toLowerCase())
            ).map(contract => (
              <tr key={contract.id} onClick={() => handleOpenEdit(contract)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                <td className="p-4 font-bold text-slate-700">{contract.contractCode}</td>
                <td className="p-4">
                  <div className="font-bold">{customers.find(c => c.id === contract.customerId)?.name}</div>
                  <div className="text-xs text-slate-400">{customers.find(c => c.id === contract.customerId)?.phone}</div>
                </td>
                <td className="p-4 text-sm">{contract.serviceType}</td>
                <td className="p-4 text-right font-bold text-slate-900">{contract.totalAmount.toLocaleString()}đ</td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    contract.status === ContractStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                    contract.status === ContractStatus.SIGNED ? 'bg-blue-100 text-blue-700' :
                    contract.status === ContractStatus.CANCELLED ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {contract.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <div>
                <h2 className="text-xl font-black uppercase text-slate-900">
                  {editingContractId ? `Cập nhật Hợp đồng: ${form.contractCode}` : 'Tạo Hợp đồng mới'}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Thông tin chi tiết và lịch trình</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
              {(!canEdit && editingContractId) && <div className="p-4 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl mb-4 border border-amber-200">Bạn đang xem ở chế độ chỉ đọc (Read-only)</div>}
              
              <div className={`space-y-10 ${(!canEdit && editingContractId) ? 'pointer-events-none opacity-80' : ''}`}>
                 {/* Form content placeholder for brevity, assume inputs map to `form` state */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-slate-500">Mã Hợp đồng</label>
                       <input 
                         className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                         value={form.contractCode}
                         onChange={e => setForm({...form, contractCode: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-slate-500">Khách hàng</label>
                       <select 
                         className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                         value={form.customerId}
                         onChange={e => setForm({...form, customerId: e.target.value})}
                       >
                         <option value="">-- Chọn khách hàng --</option>
                         {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              {(canAdd || (canEdit && editingContractId)) && (
                <div className="pt-10 flex flex-col items-center gap-4 border-t border-slate-50">
                  {formError && (
                    <div className="flex items-center gap-2 text-red-500 text-[11px] font-black uppercase bg-red-50 px-6 py-3 rounded-2xl border border-red-100">
                      <AlertCircle size={16} /> {formError}
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={handleSaveContract} disabled={isSaving}
                    className={`w-full py-5 rounded-2xl text-white font-black text-xs uppercase shadow-xl transition-all tracking-widest flex items-center justify-center gap-3 ${isSaving ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 active:scale-95'}`}
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    {isSaving ? "Đang đồng bộ..." : (editingContractId ? "Lưu thay đổi Hợp đồng" : "Xác nhận & Lưu")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManager;