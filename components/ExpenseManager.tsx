import React, { useState } from 'react';
import { 
  ArrowUpCircle, ArrowDownCircle, Loader2, CheckCircle2, Trash2, 
  Search, Filter, Calendar, DollarSign, FileText, Upload, Image as ImageIcon, X,
  TrendingUp, AlertCircle
} from 'lucide-react';
import { 
  Transaction, Contract, Customer, Staff, TransactionType, ExpenseCategory 
} from '../types';
import { syncData, uploadTransactionImage } from '../apiService';
import { classifyExpense } from '../geminiService';

interface Props {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  contracts: Contract[];
  customers: Customer[];
  staff: Staff[];
  expenseCategories: string[];
  setExpenseCategories: React.Dispatch<React.SetStateAction<string[]>>;
  currentUser: Staff | null;
}

const ExpenseManager: React.FC<Props> = ({ 
  transactions, setTransactions, contracts, customers, staff, 
  expenseCategories, setExpenseCategories, currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'income' | 'expense'>('income');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [filter, setFilter] = useState('');

  const isAdmin = currentUser?.username === 'admin' || currentUser?.role === 'Giám đốc';
  
  const getPerm = (sub: 'income' | 'expense') => {
    if (!currentUser) return { view: false, add: false, edit: false, delete: false, ownOnly: false };
    if (isAdmin) return { view: true, add: true, edit: true, delete: true, ownOnly: false };
    return currentUser.permissions?.['finance']?.[sub] || { view: false, add: false, edit: false, delete: false, ownOnly: false };
  };

  const incomePerm = getPerm('income');
  const expensePerm = getPerm('expense');

  const handleOpenAdd = (type: TransactionType) => {
    const perm = type === TransactionType.INCOME ? incomePerm : expensePerm;
    if (!perm.add) {
      alert(`Bạn không có quyền thêm giao dịch ${type === TransactionType.INCOME ? 'Thu' : 'Chi'}.`);
      return;
    }
    setEditingTxId(null);
    setFormData({ 
      type, 
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      staffId: currentUser?.id
    });
    setBillFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    const perm = tx.type === TransactionType.INCOME ? incomePerm : expensePerm;
    if (perm.ownOnly && tx.staffId !== currentUser?.id) {
       alert("Hệ thống được cấu hình chỉ xem/sửa dữ liệu cá nhân.");
       // We allow viewing in read-only mode if they have view permission but enforce ownOnly logic here for simplicity
       // return; 
    }
    setEditingTxId(tx.id);
    setFormData({ ...tx });
    setBillFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const type = formData.type || TransactionType.INCOME;
    const perm = type === TransactionType.INCOME ? incomePerm : expensePerm;
    
    if (editingTxId && !perm.edit) {
        alert("Bạn không có quyền sửa giao dịch này.");
        return;
    }
    if (!editingTxId && !perm.add) {
        alert("Bạn không có quyền thêm giao dịch.");
        return;
    }

    setIsSaving(true);
    try {
      let imageUrl = formData.billImageUrl;
      if (billFile) {
        setIsUploading(true);
        const uploadRes = await uploadTransactionImage(billFile, { 
          category: formData.category, 
          timestamp: Date.now(),
          staffName: staff.find(s => s.id === formData.staffId)?.name
        });
        setIsUploading(false);
        if (uploadRes.success) {
          imageUrl = uploadRes.url;
        } else {
          alert("Upload ảnh thất bại, tiếp tục lưu thông tin...");
        }
      }

      const payload = { 
        ...formData, 
        id: formData.id || `tx-${Date.now()}`,
        billImageUrl: imageUrl 
      } as Transaction;

      const action = editingTxId ? 'UPDATE' : 'CREATE';
      const result = await syncData('transactions', action, payload);

      if (result.success) {
        if (action === 'CREATE') {
          setTransactions(prev => [...prev, result.data]);
        } else {
          setTransactions(prev => prev.map(t => t.id === result.data.id ? result.data : t));
        }
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi lưu giao dịch.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTxId) return;
    const type = formData.type || TransactionType.INCOME;
    const perm = type === TransactionType.INCOME ? incomePerm : expensePerm;

    if (!perm.delete) {
      alert("Bạn không có quyền xóa.");
      return;
    }
    if (window.confirm("Xóa giao dịch này?")) {
      await syncData('transactions', 'DELETE', formData);
      setTransactions(prev => prev.filter(t => t.id !== editingTxId));
      setIsModalOpen(false);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    (activeSubTab === 'income' ? t.type === TransactionType.INCOME : t.type === TransactionType.EXPENSE) &&
    (t.description.toLowerCase().includes(filter.toLowerCase()) || 
     t.category.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Quản lý Thu & Chi</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Theo dõi dòng tiền và chi phí vận hành</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          {incomePerm.add && (
            <button 
                onClick={() => handleOpenAdd(TransactionType.INCOME)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
                <ArrowUpCircle size={18} /> Ghi Thu
            </button>
          )}
          {expensePerm.add && (
            <button 
                onClick={() => handleOpenAdd(TransactionType.EXPENSE)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
            >
                <ArrowDownCircle size={18} /> Ghi Chi
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveSubTab('income')}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
        >
          Khoản Thu
        </button>
        <button 
          onClick={() => setActiveSubTab('expense')}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'expense' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
        >
          Khoản Chi
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Search className="text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Tìm kiếm giao dịch..."
            className="flex-1 outline-none text-sm font-medium"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <table className="w-full text-left">
           <thead className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
              <tr>
                 <th className="p-4">Ngày</th>
                 <th className="p-4">Danh mục</th>
                 <th className="p-4">Nội dung</th>
                 <th className="p-4">Nhân viên</th>
                 <th className="p-4 text-right">Số tiền</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map(t => (
                 <tr key={t.id} onClick={() => handleOpenEdit(t)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="p-4 font-bold text-slate-600">{t.date}</td>
                    <td className="p-4"><span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase">{t.category}</span></td>
                    <td className="p-4 font-medium">{t.description}</td>
                    <td className="p-4 text-sm text-slate-500">{staff.find(s => s.id === t.staffId)?.name || 'N/A'}</td>
                    <td className={`p-4 text-right font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>
                       {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString()}đ
                    </td>
                 </tr>
              ))}
              {filteredTransactions.length === 0 && (
                 <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Không có dữ liệu phù hợp</td></tr>
              )}
           </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200 border border-white/20">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-black uppercase text-slate-900">{editingTxId ? 'Cập nhật giao dịch' : (formData.type === TransactionType.INCOME ? 'Ghi khoản thu mới' : 'Ghi khoản chi mới')}</h2>
                 <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide pr-2 relative">
                 {/* Disable inputs if Read Only */}
                 {editingTxId && !((formData.type === TransactionType.INCOME ? incomePerm : expensePerm).edit) && (
                    <div className="absolute inset-0 z-10 bg-white/10 cursor-not-allowed"></div>
                 )}
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Số tiền</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-black text-slate-900"
                         placeholder="0"
                         value={formData.amount}
                         onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                       />
                       <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ngày giao dịch</label>
                       <input 
                         type="date"
                         className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                         value={formData.date}
                         onChange={e => setFormData({...formData, date: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Danh mục</label>
                       <select 
                         className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                         value={formData.category}
                         onChange={e => setFormData({...formData, category: e.target.value})}
                       >
                         <option value="">-- Chọn --</option>
                         {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                         <option value="Khác">Khác</option>
                       </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mô tả / Nội dung</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      rows={3}
                      placeholder="Chi tiết giao dịch..."
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hóa đơn / Chứng từ (Ảnh)</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => document.getElementById('bill-upload')?.click()}>
                       {formData.billImageUrl ? (
                          <div className="relative group">
                            <img src={formData.billImageUrl} alt="Bill" className="max-h-40 mx-auto rounded-lg" />
                            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center rounded-lg text-white font-bold text-xs">Thay đổi</div>
                          </div>
                       ) : billFile ? (
                          <p className="text-sm font-bold text-blue-600">{billFile.name}</p>
                       ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                             <ImageIcon size={24} />
                             <span className="text-xs font-bold uppercase">Nhấn để tải ảnh</span>
                          </div>
                       )}
                       <input id="bill-upload" type="file" accept="image/*" className="hidden" onChange={e => setBillFile(e.target.files?.[0] || null)} />
                    </div>
                 </div>
              </div>

              <div className="pt-6 flex gap-4 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600">Hủy</button>
                {/* Show Save Button Only if Allowed */}
                {((!editingTxId && (formData.type === TransactionType.INCOME ? incomePerm.add : expensePerm.add)) || 
                  (editingTxId && (formData.type === TransactionType.INCOME ? incomePerm.edit : expensePerm.edit))) && (
                    <button 
                    onClick={handleSave}
                    disabled={isSaving || isUploading}
                    className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-3xl text-xs uppercase tracking-widest shadow-xl active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-400"
                    >
                    {isSaving || isUploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} 
                    {editingTxId ? 'Lưu cập nhật' : 'Xác nhận ghi sổ'}
                    </button>
                )}
              </div>
              
              {editingTxId && (formData.type === TransactionType.INCOME ? incomePerm.delete : expensePerm.delete) && (
                <button onClick={handleDelete} disabled={isSaving} className="w-full text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 py-3 rounded-2xl transition-all">
                  {isSaving ? <Loader2 size={14} className="inline mr-1 animate-spin" /> : <Trash2 size={14} className="inline mr-1" />}
                  Xóa giao dịch này
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;