
import React, { useState, useMemo, useRef } from 'react';
import { 
  DollarSign, Plus, Sparkles, AlertCircle, Calendar as CalIcon, 
  Tag, ArrowUpCircle, ArrowDownCircle, Scale, Search, Filter, 
  ChevronRight, CreditCard, Banknote, History, BarChart3, TrendingUp, TrendingDown,
  X, CheckCircle2, MoreVertical, User, Trash2, Settings, Edit3, Calendar, PieChart as PieIcon, LineChart as LineIcon, Camera, Image as ImageIcon, ExternalLink, Loader2, ListPlus, ChevronDown, ChevronUp, FileText, LayoutDashboard, BarChart, Upload
} from 'lucide-react';
import { Transaction, TransactionType, ExpenseCategory, Contract, Customer, Staff, ModulePermission } from '../types';
import { classifyExpense } from '../geminiService';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend } from 'recharts';

interface Props {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  contracts: Contract[];
  customers: Customer[];
  staff: Staff[];
  expenseCategories: string[]; // Dùng làm danh sách Hạng mục Lớn (Cha) ban đầu
  setExpenseCategories: React.Dispatch<React.SetStateAction<string[]>>;
  currentUser: Staff; // Bổ sung currentUser để kiểm tra quyền
}

type SubTab = 'income' | 'expense' | 'report';

// Định nghĩa cấu trúc danh mục 2 cấp
interface CategoryHierarchy {
  [main: string]: string[];
}

const ExpenseManager: React.FC<Props> = ({ 
  transactions, setTransactions, contracts, customers, staff, 
  expenseCategories, setExpenseCategories, currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('income');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const billInputRef = useRef<HTMLInputElement>(null);
  
  // Kiểm tra quyền Module hiện tại
  const currentModulePerm = useMemo(() => {
    const financePerms = currentUser.permissions['finance'] || {};
    if (activeSubTab === 'income') return financePerms['income'] || { view: true, add: true, edit: true, delete: true, ownOnly: false };
    if (activeSubTab === 'expense') return financePerms['expense'] || { view: true, add: true, edit: true, delete: true, ownOnly: false };
    return financePerms['report'] || { view: true, add: true, edit: true, delete: true, ownOnly: false };
  }, [currentUser, activeSubTab]);

  // States cho Quản lý danh mục 2 cấp
  const [categories, setCategories] = useState<CategoryHierarchy>(() => {
    const initial: CategoryHierarchy = {
      'Sản xuất': ['In ấn', 'Makeup', 'Công chụp', 'Váy cưới'],
      'Marketing': ['Facebook Ads', 'Tiktok Ads', 'Sự kiện'],
      'Quản trị': ['Tiền điện', 'Tiền nước', 'Mặt bằng'],
      'Lương': ['Lương cứng', 'Hoa hồng'],
      'Đầu tư': ['Mua máy ảnh', 'Mua ống kính', 'Decor Studio']
    };
    expenseCategories.forEach(cat => {
      if (!initial[cat]) initial[cat] = ['Khác'];
    });
    return initial;
  });

  const [newMainCat, setNewMainCat] = useState('');
  const [activeMainCat, setActiveMainCat] = useState<string | null>(null);
  const [newSubCat, setNewSubCat] = useState('');

  const initialForm: Partial<Transaction> = {
    type: TransactionType.INCOME,
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    mainCategory: 'Hợp đồng',
    category: 'Thu đợt 1',
    vendor: 'Chuyển khoản',
    staffId: currentUser.id, // Mặc định là ID của người đang dùng
    billImageUrl: ''
  };

  const [formData, setFormData] = useState<Partial<Transaction>>(initialForm);

  const filteredData = useMemo(() => {
    if (activeSubTab === 'report') return [];
    const typeToFilter = activeSubTab === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;
    
    return transactions
      .filter(t => t.type === typeToFilter)
      .filter(t => {
        // Áp dụng logic ownOnly: Nếu bật ownOnly, chỉ hiện giao dịch của mình
        if (currentModulePerm.ownOnly) {
          return t.staffId === currentUser.id;
        }
        return true;
      })
      .filter(t => 
        t.description.toLowerCase().includes(filterText.toLowerCase()) || 
        t.category.toLowerCase().includes(filterText.toLowerCase()) ||
        t.mainCategory.toLowerCase().includes(filterText.toLowerCase())
      );
  }, [transactions, activeSubTab, filterText, currentModulePerm, currentUser]);

  const reportYear = new Date().getFullYear();
  
  // Lọc transactions cho báo cáo cũng tuân thủ quyền ownOnly
  const expenseTransactions = useMemo(() => {
    const expensePerm = currentUser.permissions['finance']?.['expense'] || { ownOnly: false };
    return transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .filter(t => expensePerm.ownOnly ? t.staffId === currentUser.id : true);
  }, [transactions, currentUser]);

  const reportData = useMemo(() => {
    const yearlyByCategory: Record<number, Record<string, number>> = {};
    const monthlyByCategory: Record<number, Record<string, number>> = {};
    const pieData: {name: string, value: number}[] = [];
    const pieMap: Record<string, number> = {};

    expenseTransactions.forEach(t => {
      const date = new Date(t.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (!yearlyByCategory[year]) yearlyByCategory[year] = {};
      yearlyByCategory[year][t.mainCategory] = (yearlyByCategory[year][t.mainCategory] || 0) + t.amount;

      if (year === reportYear) {
        if (!monthlyByCategory[month]) monthlyByCategory[month] = {};
        monthlyByCategory[month][t.mainCategory] = (monthlyByCategory[month][t.mainCategory] || 0) + t.amount;
        pieMap[t.mainCategory] = (pieMap[t.mainCategory] || 0) + t.amount;
      }
    });

    Object.entries(pieMap).forEach(([name, value]) => pieData.push({name, value}));
    return { yearlyByCategory, monthlyByCategory, pieData };
  }, [expenseTransactions, reportYear]);

  const handleOpenAdd = (type: TransactionType) => {
    // Kiểm tra quyền thêm
    if (!currentModulePerm.add) {
      alert("Bạn không có quyền thực hiện chức năng này.");
      return;
    }

    setEditingTxId(null);
    const firstMain = type === TransactionType.INCOME ? 'Hợp đồng' : Object.keys(categories)[0];
    const firstSub = type === TransactionType.INCOME ? 'Thu đợt 1' : categories[firstMain]?.[0] || 'Khác';
    
    setFormData({
      ...initialForm,
      type,
      mainCategory: firstMain,
      category: firstSub,
      billImageUrl: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    // Nếu ownOnly được bật, không cho sửa giao dịch người khác
    if (currentModulePerm.ownOnly && tx.staffId !== currentUser.id) {
       alert("Hệ thống được cấu hình chỉ xem/sửa dữ liệu cá nhân.");
       return;
    }
    
    if (!currentModulePerm.edit) {
      alert("Bạn không có quyền chỉnh sửa.");
      return;
    }

    setEditingTxId(tx.id);
    setFormData({ ...tx });
    setIsModalOpen(true);
  };

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ảnh quá dung lượng (tối đa 5MB)");
        return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, billImageUrl: reader.result as string }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!formData.description || !formData.amount) {
      alert("Vui lòng điền đủ thông tin giao dịch");
      return;
    }

    if (editingTxId) {
      setTransactions(prev => prev.map(t => t.id === editingTxId ? { ...t, ...formData as Transaction } : t));
    } else {
      const newTx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData as Transaction
      };
      setTransactions([newTx, ...transactions]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!editingTxId) return;
    if (!currentModulePerm.delete) {
      alert("Bạn không có quyền xóa.");
      return;
    }

    if (window.confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) {
      setTransactions(prev => prev.filter(t => t.id !== editingTxId));
      setIsModalOpen(false);
    }
  };

  const addMainCat = () => {
    if (newMainCat.trim() && !categories[newMainCat.trim()]) {
      setCategories({...categories, [newMainCat.trim()]: []});
      setNewMainCat('');
    }
  };

  const addSubCat = (main: string) => {
    if (newSubCat.trim() && !categories[main].includes(newSubCat.trim())) {
      setCategories({
        ...categories,
        [main]: [...categories[main], newSubCat.trim()]
      });
      setNewSubCat('');
    }
  };

  const deleteMainCat = (main: string) => {
    if (window.confirm(`Xóa hạng mục lớn "${main}" và tất cả hạng mục con?`)) {
      const newCats = { ...categories };
      delete newCats[main];
      setCategories(newCats);
    }
  };

  const deleteSubCat = (main: string, sub: string) => {
    setCategories({
      ...categories,
      [main]: categories[main].filter(s => s !== sub)
    });
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <BarChart3 className="text-blue-600" /> Tài chính Studio
          </h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
             {currentModulePerm.ownOnly ? 'Chế độ dữ liệu cá nhân' : 'Hệ thống quản lý dòng tiền và báo cáo đa chiều'}
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={() => handleOpenAdd(TransactionType.INCOME)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <ArrowUpCircle size={18} /> Ghi Thu
          </button>
          <button 
            onClick={() => handleOpenAdd(TransactionType.EXPENSE)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
          >
            <ArrowDownCircle size={18} /> Ghi Chi
          </button>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1.5 rounded-3xl w-full max-w-2xl mx-auto shadow-inner border border-slate-200">
        <button 
          onClick={() => setActiveSubTab('income')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'income' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ArrowUpCircle size={14} /> Danh sách Thu
        </button>
        <button 
          onClick={() => setActiveSubTab('expense')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'expense' ? 'bg-white text-red-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ArrowDownCircle size={14} /> Danh sách Chi
        </button>
        <button 
          onClick={() => setActiveSubTab('report')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'report' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <BarChart3 size={14} /> Báo cáo chi tiền
        </button>
      </div>

      <div className="space-y-6">
        {activeSubTab !== 'report' ? (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Tìm giao dịch, hạng mục..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setIsCategoryManagerOpen(true)}
                className="flex items-center gap-2 text-[10px] font-black uppercase bg-white text-slate-600 px-5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
              >
                <Settings size={16} /> Quản lý danh mục 2 cấp
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh mục Lớn</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hạng mục con</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">P.Thức / N.Viên</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Số tiền</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.map(tx => (
                    <tr key={tx.id} onClick={() => handleOpenEdit(tx)} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <div className="font-black text-slate-800 text-sm">{tx.description}</div>
                           {tx.billImageUrl && <ImageIcon size={14} className="text-blue-500" />}
                        </div>
                        {tx.contractId && (
                           <div className="text-[10px] text-blue-500 font-bold uppercase mt-1">HĐ: {contracts.find(c => c.id === tx.contractId)?.contractCode || 'Lẻ'}</div>
                        )}
                      </td>
                      <td className="px-6 py-6">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">{tx.mainCategory}</span>
                      </td>
                      <td className="px-6 py-6">
                         <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                           {tx.category}
                         </span>
                      </td>
                      <td className="px-6 py-6">
                         <div className="text-xs font-bold text-slate-600">{tx.vendor}</div>
                         <div className="text-[10px] text-slate-400">{staff.find(s => s.id === tx.staffId)?.name || '-'}</div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className={`text-lg font-black ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {tx.type === TransactionType.INCOME ? '+' : '-'}{tx.amount.toLocaleString()}đ
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right text-slate-400 text-sm font-bold">
                        {tx.date.split('-').reverse().join('/')}
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold italic">Không tìm thấy giao dịch nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-10 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Chi phí hàng tháng ({reportYear})</h3>
                     <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded-full"></div> <span className="text-[10px] font-black text-slate-400">TỔNG CHI</span></div>
                  </div>
                  <div className="h-72">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={Object.entries(reportData.monthlyByCategory).map(([m, cats]) => ({
                          name: `T${m}`,
                          total: Object.values(cats).reduce((s: number, v: number) => s + v, 0)
                        }))}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                           <YAxis hide />
                           <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                           <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={5} dot={{r: 6, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff'}} />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
               </div>
               
               <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tỷ trọng chi tiêu</h3>
                  <div className="h-72">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie data={reportData.pieData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                              {reportData.pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                           </Pie>
                           <Tooltip />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
                  <TrendingUp className="text-emerald-500" /> Bảng tổng chi hàng năm theo danh mục
               </h3>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Năm</th>
                        {Object.keys(categories).map(cat => (
                          <th key={cat} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{cat}</th>
                        ))}
                        <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-right">Tổng cộng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(reportData.yearlyByCategory).map(([year, cats]) => {
                         const total = Object.values(cats).reduce((s: number, v: number) => s + v, 0);
                         return (
                           <tr key={year} className="hover:bg-slate-50 transition-colors">
                             <td className="px-6 py-5 font-black text-blue-600">{year}</td>
                             {Object.keys(categories).map(cat => (
                               <td key={cat} className="px-6 py-5 text-right font-bold text-slate-600">{(cats[cat] || 0).toLocaleString()}đ</td>
                             ))}
                             <td className="px-6 py-5 text-right font-black text-slate-900 text-lg">{total.toLocaleString()}đ</td>
                           </tr>
                         );
                      })}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
                  <Calendar className="text-blue-500" /> Bảng chi tiết chi phí theo tháng (Năm {reportYear})
               </h3>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tháng</th>
                        {Object.keys(categories).map(cat => (
                          <th key={cat} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{cat}</th>
                        ))}
                        <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-right">Tổng tháng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                         const cats = reportData.monthlyByCategory[month] || {};
                         const total = Object.values(cats).reduce((s: number, v: number) => s + v, 0);
                         return (
                           <tr key={month} className="hover:bg-slate-50 transition-colors">
                             <td className="px-6 py-4 font-bold text-slate-700">Tháng {month}</td>
                             {Object.keys(categories).map(cat => (
                               <td key={cat} className="px-6 py-4 text-right font-medium text-slate-500">{(cats[cat] || 0).toLocaleString()}đ</td>
                             ))}
                             <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/50">{total.toLocaleString()}đ</td>
                           </tr>
                         );
                      })}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200 border border-white/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 ${formData.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} rounded-2xl flex items-center justify-center shadow-inner`}>
                    {formData.type === TransactionType.INCOME ? <ArrowUpCircle size={30} /> : <ArrowDownCircle size={30} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{editingTxId ? 'Cập nhật giao dịch' : (formData.type === TransactionType.INCOME ? 'Thu tiền Studio' : 'Chi phí Studio')}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi nhận vào sổ quỹ hệ thống</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300 transition-colors"><X size={28}/></button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide pr-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Nội dung diễn giải *</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    placeholder="Váy cưới cô dâu An, Tiền điện tháng 5..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Số tiền (VNĐ) *</label>
                    <input 
                      type="number" 
                      className="w-full p-4 bg-white border-2 border-slate-900 rounded-2xl outline-none font-black text-xl"
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Ngày thực hiện</label>
                    <input 
                      type="date" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold cursor-pointer"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Hạng mục lớn</label>
                    <select 
                      className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none font-black text-xs uppercase cursor-pointer"
                      value={formData.mainCategory}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({
                          ...formData, 
                          mainCategory: val, 
                          category: formData.type === TransactionType.INCOME ? 'Thu đợt 1' : (categories[val]?.[0] || 'Khác')
                        });
                      }}
                    >
                      {formData.type === TransactionType.INCOME ? (
                        <>
                          <option value="Hợp đồng">Hợp đồng</option>
                          <option value="Dịch vụ lẻ">Dịch vụ lẻ</option>
                          <option value="Khác">Thu nhập khác</option>
                        </>
                      ) : (
                        Object.keys(categories).map(c => <option key={c} value={c}>{c}</option>)
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Hạng mục nhỏ</label>
                    <select 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-xs cursor-pointer"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      {formData.type === TransactionType.INCOME ? (
                        <>
                          <option value="Thu đợt 1">Thu đợt 1</option>
                          <option value="Thu đợt 2">Thu đợt 2</option>
                          <option value="Thu đợt 3">Thu đợt 3</option>
                          <option value="Tất toán">Tất toán</option>
                        </>
                      ) : (
                        (categories[formData.mainCategory!] || ['Khác']).map(sub => (
                           <option key={sub} value={sub}>{sub}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {formData.type === TransactionType.EXPENSE && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
                      <ImageIcon size={14} /> Ảnh hóa đơn / Chứng từ chi
                    </label>
                    <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 group">
                      {formData.billImageUrl ? (
                        <div className="relative">
                          <img src={formData.billImageUrl} className="w-24 h-24 object-cover rounded-2xl shadow-md border-2 border-white" alt="Bill" />
                          <button 
                            onClick={() => setFormData({...formData, billImageUrl: ''})}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => billInputRef.current?.click()}
                          className="w-24 h-24 bg-white rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:bg-blue-50 hover:text-blue-400 hover:border-blue-100 transition-all shadow-sm"
                        >
                          {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                          <span className="text-[8px] font-black mt-1 uppercase">Tải ảnh</span>
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Lưu trữ minh chứng chi tiền</p>
                        <p className="text-[9px] text-slate-300 italic">PNG, JPG tối đa 5MB</p>
                        <input 
                          type="file" 
                          ref={billInputRef}
                          className="hidden" 
                          accept="image/*"
                          onChange={handleBillUpload}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Phương thức</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})}>
                       <option value="Chuyển khoản">Chuyển khoản</option>
                       <option value="Tiền mặt">Tiền mặt</option>
                       <option value="Quẹt thẻ">Quẹt thẻ</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Người thực hiện</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.staffId} disabled={currentModulePerm.ownOnly} onChange={e => setFormData({...formData, staffId: e.target.value})}>
                       <option value="">-- Chọn --</option>
                       {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">Hủy</button>
                <button 
                  onClick={handleSave}
                  className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-3xl text-xs uppercase tracking-widest shadow-xl active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> {editingTxId ? 'Lưu cập nhật' : 'Xác nhận ghi sổ'}
                </button>
              </div>
              {editingTxId && (
                <button onClick={handleDelete} className="w-full text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 py-3 rounded-2xl transition-all"><Trash2 size={14} className="inline mr-1" /> Xóa giao dịch này</button>
              )}
           </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 bg-white shrink-0">
              <div className="flex items-center gap-3">
                 <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl shadow-inner"><Settings size={24} /></div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cấu hình Danh mục chi</h3>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Quản lý phân cấp hạng mục Lớn - Con</p>
                 </div>
              </div>
              <button onClick={() => setIsCategoryManagerOpen(false)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-400"><X size={28} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-hide">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest">Thêm hạng mục lớn mới</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Tên hạng mục chính (VD: Tiền nhà, Vận hành...)" 
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-600"
                    value={newMainCat}
                    onChange={e => setNewMainCat(e.target.value)}
                  />
                  <button onClick={addMainCat} className="bg-blue-600 text-white px-6 rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95"><Plus size={24}/></button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.keys(categories).map(main => (
                  <div key={main} className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden group">
                     <div className="p-5 flex justify-between items-center bg-white border-b border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-black">{main.charAt(0)}</div>
                           <h4 className="font-black text-slate-900 uppercase text-xs tracking-tight">{main}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => deleteMainCat(main)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                        </div>
                     </div>
                     
                     <div className="p-6 space-y-4 bg-slate-50/50">
                        <div className="flex flex-wrap gap-2">
                           {categories[main].map(sub => (
                             <div key={sub} className="flex items-center bg-white border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-600 group/sub">
                                {sub}
                                <button onClick={() => deleteSubCat(main, sub)} className="ml-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-all"><X size={12}/></button>
                             </div>
                           ))}
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100 border-dashed">
                           <input 
                            type="text" 
                            placeholder={`Thêm con cho ${main}...`} 
                            className="flex-1 bg-white p-2.5 rounded-xl text-xs outline-none border border-slate-200 focus:border-blue-500"
                            value={activeMainCat === main ? newSubCat : ''}
                            onFocus={() => setActiveMainCat(main)}
                            onChange={e => setNewSubCat(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSubCat(main)}
                           />
                           <button onClick={() => addSubCat(main)} className="bg-slate-900 text-white px-3 rounded-xl hover:bg-blue-600 transition-all"><Plus size={16}/></button>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setIsCategoryManagerOpen(false)} 
              className="w-full mt-8 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 shrink-0"
            >
              Hoàn tất thiết lập danh mục
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
