
// @google/genai guidelines: Fixed property access errors in handleSaveContract and corrected JSX syntax errors in payment method selection.
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, Trash2, Calendar as CalIcon, User, CreditCard, Package, Settings, AlignLeft, MapPin, CalendarDays, AlertCircle, Loader2, CheckCircle2, History, Banknote, ArrowRight, CloudOff, Printer, ExternalLink, FileText, Briefcase, Wallet, Info, Tag, Edit3, UserPlus, Clock, Check } from 'lucide-react';
import { Contract, ContractStatus, Service, Customer, Staff, ContractItem, ServiceType, Transaction, TransactionType, StudioInfo, Schedule } from '../types';
import { syncData, isConfigured } from '../apiService';
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

const ContractManager: React.FC<Props> = ({ 
  contracts, setContracts, customers, setCustomers, 
  transactions, setTransactions, services, staff, scheduleTypes, setScheduleTypes,
  studioInfo, currentUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [isManagingTypes, setIsManagingTypes] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeIndex, setEditingTypeIndex] = useState<number | null>(null);
  const [editingTypeValue, setEditingTypeValue] = useState('');

  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ContractItem> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const paymentStages = ["Đặt cọc", "Đợt 1", "Đợt 2", "Đợt 3", "Đợt 4", "Đợt 5", "Thanh toán hết"];

  const [editingTxInHistoryId, setEditingTxInHistoryId] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    method: 'Chuyển khoản',
    stage: 'Đặt cọc',
    date: new Date().toISOString().split('T')[0],
    staffId: '' 
  });

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  };

  const getTodayISO = () => new Date().toISOString().split('T')[0];

  const initialFormState = {
    contractCode: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    staffInChargeId: '',
    date: getTodayISO(),
    status: ContractStatus.SIGNED,
    serviceType: ServiceType.WEDDING_PHOTO,
    items: [] as ContractItem[],
    schedules: [] as Schedule[],
    paidAmount: 0,
    paymentMethod: 'Chuyển khoản',
    paymentStage: 'Đặt cọc',
    totalAmount: 0,
    terms: ''
  };

  const [form, setForm] = useState(initialFormState);

  const contractPayments = useMemo(() => {
    if (!editingContractId) return [];
    return transactions
      .filter(t => t.contractId === editingContractId && t.type === TransactionType.INCOME)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, editingContractId]);

  useEffect(() => {
    if (isModalOpen && !editingContractId) {
      const timestamp = new Date().getTime().toString().substr(-4);
      setForm(prev => ({
        ...prev,
        contractCode: `AS-${new Date().getFullYear()}-${timestamp}`,
        staffInChargeId: currentUser?.id || ''
      }));
      setNewPayment({
        amount: 0,
        method: 'Chuyển khoản',
        stage: 'Đặt cọc',
        date: getTodayISO(),
        staffId: currentUser?.id || ''
      });
    }
  }, [isModalOpen, editingContractId, currentUser]);

  const handleOpenEdit = (contract: Contract) => {
    const customer = customers.find(c => c.id === contract.customerId);
    const payments = transactions.filter(t => t.contractId === contract.id && t.type === TransactionType.INCOME);
    
    setEditingContractId(contract.id);
    setForm({
      contractCode: contract.contractCode,
      customerName: customer?.name || '',
      customerPhone: customer?.phone || '',
      customerAddress: customer?.address || '',
      staffInChargeId: contract.staffInChargeId || '',
      date: contract.date || getTodayISO(),
      status: contract.status,
      serviceType: contract.serviceType,
      items: contract.items || [],
      schedules: contract.schedules || [],
      paidAmount: contract.paidAmount || 0,
      paymentMethod: contract.paymentMethod || 'Chuyển khoản',
      paymentStage: contract.paymentStage || 'Đặt cọc',
      totalAmount: contract.totalAmount || 0,
      terms: contract.terms || ''
    });

    let nextStage = "Đợt 2";
    if (payments.length === 0) nextStage = "Đặt cọc";
    else if (payments.length === 1) nextStage = "Đợt 1";
    else if (payments.length >= 6) nextStage = "Thanh toán hết";
    else nextStage = `Đợt ${payments.length}`;

    setNewPayment({
      amount: 0,
      method: contract.paymentMethod || 'Chuyển khoản',
      stage: nextStage,
      date: getTodayISO(),
      staffId: ''
    });
    setEditingTxInHistoryId(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddExtraPayment = async () => {
    if (newPayment.amount <= 0) return;
    
    // Tìm tên nhân viên thu
    const collector = staff.find(s => s.id === newPayment.staffId);

    if (!editingContractId) {
        setForm(prev => ({
            ...prev,
            paidAmount: prev.paidAmount + newPayment.amount,
            paymentMethod: newPayment.method,
            paymentStage: newPayment.stage,
            staffInChargeId: newPayment.staffId || prev.staffInChargeId
        }));
        setNewPayment(prev => ({ ...prev, amount: 0 }));
        return;
    }

    setIsSaving(true);
    try {
      if (editingTxInHistoryId) {
        const updatedTxs = transactions.map(t => {
          if (t.id === editingTxInHistoryId) {
            const updatedTx = {
              ...t,
              amount: newPayment.amount,
              description: `Thanh toán ${newPayment.stage} HĐ ${form.contractCode}`,
              date: newPayment.date,
              vendor: newPayment.method,
              staffId: newPayment.staffId
            };
            return updatedTx;
          }
          return t;
        });
        setTransactions(updatedTxs);
        
        const newPaidTotal = updatedTxs
          .filter(t => t.contractId === editingContractId && t.type === TransactionType.INCOME)
          .reduce((sum, tx) => sum + tx.amount, 0);
        setForm(prev => ({ ...prev, paidAmount: newPaidTotal }));
        
        const txToSync = updatedTxs.find(t => t.id === editingTxInHistoryId);
        if (txToSync) {
            syncData('Transactions', 'UPDATE', {
                ...txToSync,
                contractCode: form.contractCode,
                staffName: collector?.name || 'Admin'
            });
        }
        
        setEditingTxInHistoryId(null);
      } else {
        const txId = 'tx-' + Math.random().toString(36).substr(2, 9);
        const txObj: Transaction = {
          id: txId,
          type: TransactionType.INCOME,
          mainCategory: 'Hợp đồng',
          category: 'Hợp đồng',
          amount: newPayment.amount,
          description: `Thanh toán ${newPayment.stage} HĐ ${form.contractCode}`,
          date: newPayment.date,
          contractId: editingContractId,
          vendor: newPayment.method,
          staffId: newPayment.staffId 
        };

        setTransactions(prev => [txObj, ...prev]);
        const updatedPaidAmount = form.paidAmount + newPayment.amount;
        setForm(prev => ({ ...prev, paidAmount: updatedPaidAmount }));
        
        syncData('Transactions', 'CREATE', {
            ...txObj,
            contractCode: form.contractCode,
            staffName: collector?.name || 'Admin'
        });
      }
      
      const currentPaymentsCount = editingTxInHistoryId ? contractPayments.length : contractPayments.length + 1;
      let nextStage = currentPaymentsCount >= 6 ? "Thanh toán hết" : `Đợt ${currentPaymentsCount}`;

      setNewPayment({
        amount: 0,
        method: 'Chuyển khoản',
        stage: nextStage,
        date: getTodayISO(),
        staffId: ''
      });
    } catch (err) {
      setFormError("Gặp lỗi khi xử lý thanh toán.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPastPayment = (tx: Transaction) => {
    setEditingTxInHistoryId(tx.id);
    const stageMatch = tx.description.match(/Đợt \d+|Đặt cọc|Thanh toán hết/);
    setNewPayment({
      amount: tx.amount,
      method: tx.vendor || 'Chuyển khoản',
      stage: stageMatch ? stageMatch[0] : 'Đợt 2',
      date: tx.date,
      staffId: tx.staffId || ''
    });
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || form.items.length === 0) {
      setFormError("Vui lòng nhập Tên khách hàng và chọn ít nhất 1 dịch vụ.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      // 1. Xử lý lưu Khách hàng trước
      let customerId = '';
      const existingCust = customers.find(c => c.phone === form.customerPhone);
      let customerObj: Customer;
      
      if (existingCust) {
        customerId = existingCust.id;
        customerObj = { ...existingCust, name: form.customerName, address: form.customerAddress };
        setCustomers(prev => prev.map(c => c.id === customerId ? customerObj : c));
      } else {
        customerId = 'cust-' + Math.random().toString(36).substr(2, 9);
        customerObj = { id: customerId, name: form.customerName, phone: form.customerPhone, address: form.customerAddress };
        setCustomers(prev => [...prev, customerObj]);
      }
      
      await syncData('Customers', existingCust ? 'UPDATE' : 'CREATE', customerObj);

      // 2. Xử lý lưu Hợp đồng
      const contractId = editingContractId || 'con-' + Math.random().toString(36).substr(2, 9);
      
      // FIX: Lấy ID người tạo thực tế
      const creatorId = currentUser?.id || (staff.length > 0 ? staff[0].id : undefined);

      // FIX QUAN TRỌNG: Cập nhật contractId cho toàn bộ schedules trước khi lưu
      // Đảm bảo không có schedule nào bị contractId rỗng hoặc null
      const validSchedules = form.schedules.map(sch => ({
        ...sch,
        contractId: contractId,
        contractCode: form.contractCode // Đồng bộ luôn mã code nếu cần
      }));

      const finalContract: Contract = {
        ...form,
        id: contractId,
        customerId: customerId,
        createdBy: creatorId,
        schedules: validSchedules
      } as Contract;

      // Cập nhật State UI trước (Optimistic UI)
      if (editingContractId) {
        setContracts(prev => prev.map(c => c.id === editingContractId ? finalContract : c));
      } else {
        setContracts(prev => [finalContract, ...prev]);
      }
      
      // Đồng bộ Hợp đồng lên DB (apiService sẽ tự động xử lý lưu schedules con bên trong)
      await syncData('Contracts', editingContractId ? 'UPDATE' : 'CREATE', finalContract);

      // (Đã xóa bỏ đoạn code lưu lẻ Schedule ở đây để tránh trùng lặp và Race Condition)

      // 4. Xử lý Giao dịch đặt cọc (Nếu là tạo mới và có tiền cọc)
      if (!editingContractId && form.paidAmount > 0) {
        const txObj: Transaction = {
          id: 'tx-' + Math.random().toString(36).substr(2, 9),
          type: TransactionType.INCOME,
          mainCategory: 'Hợp đồng',
          category: 'Hợp đồng',
          amount: form.paidAmount,
          description: `Thanh toán ${form.paymentStage} HĐ ${form.contractCode}`,
          date: form.date,
          contractId: contractId,
          vendor: form.paymentMethod,
          staffId: form.staffInChargeId || creatorId
        };
        const collector = staff.find(s => s.id === form.staffInChargeId);
        setTransactions(prev => [txObj, ...prev]);
        
        syncData('Transactions', 'CREATE', {
            ...txObj,
            contractCode: form.contractCode,
            staffName: collector?.name || 'Admin'
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Lưu hợp đồng thất bại:", err);
      let errorMessage = "Đã có lỗi xảy ra. Dữ liệu có thể chưa được đồng bộ Cloud.";
      if (err.message && (err.message.includes("foreign key constraint") || err.message.includes("Key is not present"))) {
         errorMessage = "Lỗi dữ liệu: Thông tin liên kết (Khách hàng/Nhân viên/Hợp đồng) không hợp lệ.";
      } else if (err.message && err.message.includes("duplicate key")) {
         errorMessage = "Lỗi: Mã hợp đồng đã tồn tại. Vui lòng kiểm tra lại.";
      }
      setFormError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectService = (service: Service) => {
    setEditingItem({
      id: Math.random().toString(36).substr(2, 9),
      serviceId: service.id,
      serviceName: service.name,
      serviceDescription: service.description,
      unitPrice: service.price,
      quantity: 1,
      discount: 0,
      subtotal: service.price
    });
    setIsItemEditModalOpen(true);
    setShowServiceDropdown(false);
    setServiceSearch('');
  };

  const handleAddSchedule = () => {
    const newSched: Schedule = {
      id: Math.random().toString(36).substr(2, 9),
      contractId: editingContractId || '', // Tạm thời để rỗng, sẽ được update khi lưu
      type: scheduleTypes[0] || 'Lịch mới',
      date: form.date || getTodayISO(),
      notes: '',
      assignments: []
    };
    setForm({ ...form, schedules: [...form.schedules, newSched] });
  };

  const handleUpdateSchedule = (id: string, updates: Partial<Schedule>) => {
    setForm({
      ...form,
      schedules: form.schedules.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const handleRemoveSchedule = (id: string) => {
    setForm({
      ...form,
      schedules: form.schedules.filter(s => s.id !== id)
    });
  };

  const toggleStaffAssignment = (schedId: string, sid: string) => {
    const sched = form.schedules.find(s => s.id === schedId);
    if (!sched) return;
    
    let newAssignments = [...sched.assignments];
    if (newAssignments.includes(sid)) {
      newAssignments = newAssignments.filter(id => id !== sid);
    } else {
      newAssignments.push(sid);
    }
    
    handleUpdateSchedule(schedId, { assignments: newAssignments });
  };

  const handleAddScheduleType = () => {
    const trimmed = newTypeName.trim();
    if (trimmed && !scheduleTypes.includes(trimmed)) {
      setScheduleTypes(prev => [...prev, trimmed]);
      setNewTypeName('');
    }
  };

  const handleUpdateScheduleType = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingTypeIndex !== null && editingTypeValue.trim()) {
      const oldVal = scheduleTypes[editingTypeIndex];
      const newVal = editingTypeValue.trim();
      
      setScheduleTypes(prev => {
        const newList = [...prev];
        newList[editingTypeIndex] = newVal;
        return newList;
      });
      
      setForm(prev => ({
        ...prev,
        schedules: prev.schedules.map(s => s.type === oldVal ? { ...s, type: newVal } : s)
      }));
      
      setEditingTypeIndex(null);
    }
  };

  const handleDeleteScheduleType = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const typeToDelete = scheduleTypes[index];
    if (window.confirm(`Xóa loại lịch "${typeToDelete}"? Các lịch trình đang dùng loại này sẽ cần được gán lại.`)) {
      setScheduleTypes(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handlePrintTrigger = () => {
    const printContent = document.getElementById('contract-print-template');
    if (!printContent) {
      alert("Lỗi: Không tìm thấy nội dung in. Vui lòng thử lại.");
      return;
    }

    setIsPrinting(true);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép để xem bản in.");
      setIsPrinting(false);
      return;
    }

    const contentHtml = printContent.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Hợp đồng Ánh Sáng Studio - ${form.contractCode}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Times New Roman', Times, serif; background: #f1f5f9; padding: 40px; display: flex; flex-direction: column; align-items: center; }
            .print-container { background: white; width: 210mm; padding: 20mm; box-shadow: 0 15px 35px rgba(0,0,0,0.15); position: relative; }
            table { font-size: 13px; border-collapse: collapse; }
            .no-print { margin-top: 30px; display: flex; gap: 20px; }
            button { cursor: pointer; padding: 10px 20px; border-radius: 8px; font-weight: bold; border: none; }
            .btn-print { background: #1e293b; color: white; }
            .btn-close { background: #94a3b8; color: white; }
            @media print { body { background: white; padding: 0; } .print-container { box-shadow: none; width: 100%; padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="print-container">${contentHtml}</div>
          <div class="no-print">
             <button onclick="window.close()" class="btn-close">ĐÓNG CỬA SỔ</button>
             <button onclick="window.print()" class="btn-print">XÁC NHẬN IN / LƯU PDF</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setIsPrinting(false);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.type.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Tìm mã HĐ, tên khách..." 
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { setEditingContractId(null); setForm(initialFormState); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={18} /> Tạo hợp đồng mới
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Mã HĐ</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ngày lập</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Khách hàng</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Tổng tiền</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Còn nợ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.filter(c => 
              c.contractCode.toLowerCase().includes(filter.toLowerCase()) ||
              customers.find(cust => cust.id === c.customerId)?.name.toLowerCase().includes(filter.toLowerCase())
            ).map(contract => (
              <tr key={contract.id} onClick={() => handleOpenEdit(contract)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                <td className="px-6 py-4 font-bold text-blue-600">{contract.contractCode}</td>
                <td className="px-6 py-4 text-slate-500 text-sm font-medium">{formatDisplayDate(contract.date)}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{customers.find(c => c.id === contract.customerId)?.name || 'Khách hàng'}</div>
                  <div className="text-xs text-slate-500">{customers.find(c => c.id === contract.customerId)?.phone}</div>
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">{contract.totalAmount.toLocaleString()}đ</td>
                <td className="px-6 py-4 text-right font-bold text-red-500">{(contract.totalAmount - contract.paidAmount).toLocaleString()}đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  <CalIcon size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {editingContractId ? `Chi tiết Hợp đồng ${form.contractCode}` : 'Tạo Hợp đồng mới'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {editingContractId && (
                  <>
                    <button 
                      onClick={() => studioInfo.googleDocsTemplateUrl && window.open(studioInfo.googleDocsTemplateUrl, '_blank')}
                      className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
                    >
                      <ExternalLink size={16} /> Xem mẫu chuẩn
                    </button>
                    <button 
                      onClick={handlePrintTrigger}
                      className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg"
                    >
                      {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} 
                      Kiểm tra & Xuất PDF
                    </button>
                  </>
                )}
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
              {editingContractId && (
                <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                   <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                        <span>Tiến độ thanh toán</span>
                        <span>{Math.round((form.paidAmount / (form.totalAmount || 1)) * 100)}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-700" style={{width: `${(form.paidAmount / (form.totalAmount || 1)) * 100}%`}}></div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-8 border-l border-white/10 pl-8">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng giá trị</div>
                        <div className="text-xl font-black">{form.totalAmount.toLocaleString()}đ</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-red-400 uppercase">Còn phải thu</div>
                        <div className="text-xl font-black text-red-400">{(form.totalAmount - form.paidAmount).toLocaleString()}đ</div>
                      </div>
                   </div>
                </div>
              )}

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-blue-600 border-b border-blue-50 pb-2 font-bold uppercase text-xs tracking-wider">
                  <User size={16} /> 1. Thông tin khách hàng & Phụ trách
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tên khách hàng *</label>
                    <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Số điện thoại</label>
                    <input type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ngày lập HĐ</label>
                    <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nhân viên lập HĐ</label>
                    <select className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl outline-none font-bold cursor-pointer" value={form.staffInChargeId} onChange={e => setForm({...form, staffInChargeId: e.target.value})}>
                      <option value="">-- Chọn nhân viên --</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Địa chỉ khách hàng</label>
                    <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={form.customerAddress} onChange={e => setForm({...form, customerAddress: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dịch vụ chính</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value as ServiceType})}>
                      {Object.values(ServiceType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-purple-50 pb-2">
                  <div className="flex items-center gap-2 text-purple-600 font-bold uppercase text-xs tracking-wider">
                    <Package size={16} /> 2. Chi tiết dịch vụ
                  </div>
                  <div className="relative">
                    <input 
                      type="text" placeholder="Tìm dịch vụ..." 
                      className="pl-8 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none w-64 focus:ring-2 focus:ring-purple-500 shadow-sm" 
                      value={serviceSearch} onFocus={() => setShowServiceDropdown(true)} onChange={e => setServiceSearch(e.target.value)} 
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 w-3.5 h-3.5" />
                    {showServiceDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-100 rounded-xl shadow-2xl z-[60] max-h-60 overflow-y-auto">
                        {filteredServices.map(s => (
                          <button key={s.id} type="button" onClick={() => handleSelectService(s)} className="w-full px-4 py-3 text-left hover:bg-slate-50 flex justify-between items-center border-b last:border-0 transition-colors">
                            <span className="font-bold text-slate-700 text-xs">{s.name}</span>
                            <span className="text-purple-600 font-black text-xs">{s.price.toLocaleString()}đ</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/50">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Dịch vụ</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-right">Giá</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-center">SL</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-right">Giảm giá</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-right">Thành tiền</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.items.map(item => (
                        <tr key={item.id} className="bg-white hover:bg-slate-50 group transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold text-slate-700">{item.serviceName}</div>
                            {item.serviceDescription && <div className="text-[10px] text-slate-400 italic line-clamp-1">{item.serviceDescription}</div>}
                          </td>
                          <td className="px-4 py-3 text-xs text-right">{item.unitPrice.toLocaleString()}đ</td>
                          <td className="px-4 py-3 text-xs text-center font-bold">{item.quantity}</td>
                          <td className="px-4 py-3 text-xs text-right text-red-500">{item.discount > 0 ? `-${item.discount.toLocaleString()}đ` : '-'}</td>
                          <td className="px-4 py-3 text-xs text-right font-black text-purple-600">{item.subtotal.toLocaleString()}đ</td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => setForm({...form, items: form.items.filter(it => it.id !== item.id), totalAmount: form.totalAmount - item.subtotal})} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {form.items.length > 0 && (
                      <tfoot className="bg-slate-900 text-white font-bold">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-widest">Giá trị hợp đồng:</td>
                          <td className="px-4 py-3 text-right text-lg">{form.totalAmount.toLocaleString()}đ</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-blue-50 pb-2">
                  <div className="flex items-center gap-2 text-blue-600 font-bold uppercase text-xs tracking-wider">
                    <CalendarDays size={16} /> 3. Lịch trình & Phân công nhân sự
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setIsManagingTypes(!isManagingTypes)}
                      className={`p-2 rounded-xl transition-all border ${isManagingTypes ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}
                      title="Cấu hình loại lịch"
                    >
                      <Settings size={16} />
                    </button>
                    <button 
                      type="button" 
                      onClick={handleAddSchedule}
                      className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all border border-blue-200"
                    >
                      <Plus size={14} /> Thêm mốc thời gian
                    </button>
                  </div>
                </div>

                {isManagingTypes && (
                  <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-dashed border-blue-200 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Quản lý nhãn lịch trình</h4>
                       <button type="button" onClick={() => setIsManagingTypes(false)} className="text-blue-400 hover:text-blue-600"><X size={16}/></button>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Nhãn mới (VD: Chụp ngoại cảnh...)" 
                        className="flex-1 p-3 bg-white border border-blue-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        value={newTypeName}
                        onChange={e => setNewTypeName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddScheduleType()}
                      />
                      <button type="button" onClick={handleAddScheduleType} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"><Plus size={20}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                      {scheduleTypes.map((type, idx) => (
                        <div key={idx} className="flex items-center bg-white border border-blue-100 rounded-xl px-3 py-2 gap-2 group transition-all hover:border-blue-300">
                          {editingTypeIndex === idx ? (
                             <>
                               <input 
                                autoFocus
                                className="text-xs font-bold outline-none bg-blue-50 px-2 py-1 rounded"
                                value={editingTypeValue}
                                onChange={e => setEditingTypeValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleUpdateScheduleType(e as any)}
                               />
                               <button type="button" onClick={(e) => handleUpdateScheduleType(e)} className="text-emerald-500"><Check size={14}/></button>
                             </>
                          ) : (
                             <>
                               <span className="text-xs font-bold text-slate-700">{type}</span>
                               <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button type="button" onClick={() => { setEditingTypeIndex(idx); setEditingTypeValue(type); }} className="p-1 text-slate-400 hover:text-blue-500"><Edit3 size={12}/></button>
                                  <button type="button" onClick={(e) => handleDeleteScheduleType(e, idx)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12}/></button>
                               </div>
                             </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {form.schedules.map((sch) => (
                    <div key={sch.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 hover:border-blue-300 transition-all group animate-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-3">
                           <div className="flex items-center gap-3">
                              <select 
                                className="bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 text-[11px] font-black text-blue-600 uppercase outline-none appearance-none cursor-pointer hover:bg-blue-100"
                                value={sch.type}
                                onChange={e => handleUpdateSchedule(sch.id, { type: e.target.value })}
                              >
                                {scheduleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                                <Clock size={12} /> mốc thời gian
                              </div>
                           </div>
                           <input 
                            type="date" 
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-black text-slate-800 outline-none"
                            value={sch.date}
                            onChange={e => handleUpdateSchedule(sch.id, { date: e.target.value })}
                           />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveSchedule(sch.id)}
                          className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <UserPlus size={12} /> Nhân sự tham gia
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          {staff.map(s => {
                            const isAssigned = sch.assignments.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleStaffAssignment(sch.id, s.id)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${isAssigned ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                              >
                                {s.name.split(' ').pop()}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú riêng cho lịch này</label>
                        <textarea 
                          placeholder="Ví dụ: Mang theo váy đuôi cá, địa điểm tại bãi đá..."
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                          value={sch.notes}
                          onChange={e => handleUpdateSchedule(sch.id, { notes: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                  {form.schedules.length === 0 && (
                    <div className="col-span-full py-10 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 gap-3">
                       <CalendarDays size={40} className="opacity-20" />
                       <p className="text-sm font-medium">Chưa có mốc thời gian nào cho hợp đồng này</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex justify-between items-center border-b border-emerald-50 pb-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase text-xs tracking-wider">
                    <CreditCard size={16} /> 4. Quản lý Thanh toán
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                    {editingContractId && (
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                                <History size={14} /> Lịch sử các đợt đã đóng
                            </h4>
                            <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shadow-inner">
                                <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/50 text-[9px] font-black uppercase text-slate-400 tracking-tighter">
                                    <tr>
                                    <th className="px-4 py-2.5">Ngày</th>
                                    <th className="px-4 py-2.5">Mô tả</th>
                                    <th className="px-4 py-2.5 text-right">Số tiền</th>
                                    <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {contractPayments.map(p => (
                                    <tr key={p.id} className="hover:bg-white transition-colors group">
                                        <td className="px-4 py-3 text-slate-400">{formatDisplayDate(p.date)}</td>
                                        <td className="px-4 py-3">
                                        <div className="font-bold text-slate-700">{p.description}</div>
                                        <div className="text-[9px] text-slate-400">{p.vendor}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-emerald-600">+{p.amount.toLocaleString()}đ</td>
                                        <td className="px-2 py-3 text-center">
                                        <button 
                                            type="button"
                                            onClick={() => handleEditPastPayment(p)}
                                            className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        </td>
                                    </tr>
                                    ))}
                                    {contractPayments.length === 0 && (
                                    <tr><td colSpan={4} className="p-8 text-center italic text-slate-400">Chưa có giao dịch thanh toán</td></tr>
                                    )}
                                </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className={`${editingContractId ? '' : 'lg:col-span-2 max-w-2xl mx-auto'} bg-white p-8 rounded-[2.5rem] border-2 border-dotted border-slate-300 space-y-8 shadow-sm w-full transition-all`}>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Wallet size={24} />
                         </div>
                         <h4 className="text-[15px] font-black text-blue-600 uppercase tracking-widest">
                           {editingContractId ? 'THU THÊM ĐỢT THANH TOÁN MỚI' : 'THÔNG TIN THANH TOÁN BAN ĐẦU'}
                         </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase ml-1">ĐỢT/LÝ DO</label>
                          <select 
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none hover:border-blue-200 transition-all text-slate-900"
                            value={newPayment.stage} onChange={e => setNewPayment({...newPayment, stage: e.target.value})}
                          >
                            {paymentStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase ml-1">NGÀY ĐÓNG</label>
                          <div className="relative">
                            <input 
                                type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none cursor-pointer hover:border-blue-200 transition-all text-slate-900"
                                value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase ml-1">SỐ TIỀN THU THÊM</label>
                          <div className="relative">
                            <input 
                              type="number" className="w-full p-4 pl-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-sm font-black text-emerald-700 outline-none"
                              value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                  const total = editingContractId ? (form.totalAmount - form.paidAmount + (editingTxInHistoryId ? contractPayments.find(t => t.id === editingTxInHistoryId)?.amount || 0 : 0)) : form.totalAmount;
                                  setNewPayment({...newPayment, amount: total});
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 transition-colors"
                            >HẾT</button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase ml-1">NGƯỜI THU (NHÂN VIÊN)</label>
                          <select 
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none hover:border-blue-200 transition-all text-slate-600"
                            value={newPayment.staffId} onChange={e => setNewPayment({...newPayment, staffId: e.target.value})}
                          >
                            <option value="">-- Chọn nhân viên --</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase ml-1">PHƯƠNG THỨC</label>
                        <select 
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer hover:border-blue-200 transition-all text-slate-900"
                          value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}
                        >
                          <option value="Chuyển khoản">Chuyển khoản</option>
                          <option value="Tiền mặt">Tiền mặt</option>
                          <option value="Quẹt thẻ">Quẹt thẻ</option>
                        </select>
                      </div>

                      <button 
                        type="button"
                        onClick={handleAddExtraPayment}
                        disabled={newPayment.amount <= 0 || isSaving}
                        className="w-full py-5 bg-blue-400 hover:bg-blue-500 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        {editingContractId ? (editingTxInHistoryId ? 'XÁC NHẬN CẬP NHẬT' : 'XÁC NHẬN THU THÊM') : 'XÁC NHẬN THANH TOÁN'}
                      </button>

                      {!editingContractId && form.paidAmount > 0 && (
                          <div className="bg-emerald-50 p-4 rounded-xl flex items-center justify-between border border-emerald-100 animate-in fade-in zoom-in-95">
                              <span className="text-xs font-bold text-emerald-600 uppercase">Tổng tiền đã xác nhận thu:</span>
                              <span className="text-lg font-black text-emerald-700">{form.paidAmount.toLocaleString()}đ</span>
                          </div>
                      )}
                    </div>
                  </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-600 border-b border-slate-100 pb-2 font-bold uppercase text-xs tracking-wider">
                  <FileText size={16} /> 5. Điều khoản riêng dành cho hợp đồng này
                </div>
                <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-serif min-h-[150px] leading-relaxed"
                  placeholder="Nhập điều khoản bổ sung riêng cho khách hàng này (Sẽ xuất hiện tại Mục VI trên bản in)..."
                  value={form.terms} onChange={e => setForm({...form, terms: e.target.value})}
                />
              </section>

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
            </div>
          </div>
        </div>
      )}

      <div id="contract-print-template" className="hidden">
        {editingContractId && (
          <ContractPrint 
            contract={contracts.find(c => c.id === editingContractId)!}
            customer={customers.find(c => c.id === contracts.find(c => c.id === editingContractId)?.customerId)}
            staff={staff.find(s => s.id === contracts.find(c => c.id === editingContractId)?.staffInChargeId)}
            transactions={transactions}
            services={services}
            studioInfo={studioInfo}
          />
        )}
      </div>

      {isItemEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cấu hình dịch vụ</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tùy chỉnh nội dung và giá hợp đồng</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsItemEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300 transition-colors"><X size={24} /></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
                  <Info size={14} /> Tên dịch vụ & Mô tả chi tiết
                </label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800 mb-2">
                  {editingItem.serviceName}
                </div>
                <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed min-h-[120px]"
                  placeholder="Mô tả cụ thể dịch vụ khách nhận được..."
                  value={editingItem.serviceDescription}
                  onChange={e => setEditingItem({...editingItem, serviceDescription: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Đơn giá (VNĐ)</label>
                  <input type="number" className="w-full p-4 bg-white border-2 border-slate-900 rounded-2xl font-black text-lg outline-none" value={editingItem.unitPrice} onChange={e => setEditingItem({...editingItem, unitPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Số lượng</label>
                  <input type="number" min="1" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-lg outline-none" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-red-500 uppercase ml-1 tracking-widest flex items-center gap-1"><Tag size={12} /> Giảm giá trực tiếp</label>
                  <input type="number" className="w-full p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl font-black text-lg outline-none" placeholder="0" value={editingItem.discount} onChange={e => setEditingItem({...editingItem, discount: Number(e.target.value)})} />
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[2rem] flex justify-between items-center shadow-xl">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Thành tiền hạng mục</div>
                  <div className="text-white font-black text-2xl tracking-tighter">
                    {((editingItem.unitPrice || 0) * (editingItem.quantity || 1) - (editingItem.discount || 0)).toLocaleString()}đ
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button type="button" onClick={() => setIsItemEditModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">Hủy</button>
              <button 
                type="button" 
                onClick={() => {
                  const sub = (editingItem.unitPrice || 0) * (editingItem.quantity || 1) - (editingItem.discount || 0);
                  const finalItem = { ...editingItem, subtotal: sub } as ContractItem;
                  setForm({...form, items: [...form.items, finalItem], totalAmount: form.totalAmount + sub});
                  setIsItemEditModalOpen(false);
                }} 
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Xác nhận thêm vào HĐ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManager;
