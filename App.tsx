
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, FileText, DollarSign, Calendar, Package, Users, Settings, 
  LogOut, Sparkles, Gavel, Banknote, Menu, X
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import ContractManager from './components/ContractManager';
import ExpenseManager from './components/ExpenseManager';
import ScheduleManager from './components/ScheduleManager';
import ProductManager from './components/ProductManager';
import StaffManager from './components/StaffManager';
import StudioSettings from './components/StudioSettings';
import AIAssistant from './components/AIAssistant';
import RuleManager from './components/RuleManager';
import SalaryManager from './components/SalaryManager';

import { Staff, StudioInfo } from './types';
import { mockStaff, mockContracts, mockCustomers, mockTransactions, mockServices } from './mockData';
import { fetchSettings } from './apiService'; // Import mới

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  
  // Data States
  const [contracts, setContracts] = useState(mockContracts);
  const [customers, setCustomers] = useState(mockCustomers);
  const [transactions, setTransactions] = useState(mockTransactions);
  const [services, setServices] = useState(mockServices);
  const [staff, setStaff] = useState(mockStaff);
  const [scheduleTypes, setScheduleTypes] = useState(['Chụp tại Studio', 'Chụp ngoại cảnh', 'Trang điểm', 'Tư vấn']);
  const [departments, setDepartments] = useState(['Sale', 'Makeup', 'Photo', 'Editor']);
  const [expenseCategories, setExpenseCategories] = useState(['Sản xuất', 'Marketing', 'Quản trị']);
  
  const [studioInfo, setStudioInfo] = useState<StudioInfo>({
    name: 'ÁNH SÁNG STUDIO',
    address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
    phone: '0987.654.321',
    zalo: '0987.654.321',
    website: 'www.anhsangstudio.vn',
    email: 'contact@anhsangstudio.vn',
    directorName: 'Nguyễn Văn A',
    logoText: 'AS',
    contractTerms: `1. Khách hàng vui lòng kiểm tra kỹ hình ảnh trước khi in.
2. File gốc được lưu trữ trong vòng 3 tháng kể từ ngày chụp.
3. Đặt cọc 30% khi ký hợp đồng, 70% còn lại thanh toán khi nhận sản phẩm.`
  });

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // LOAD SETTINGS TỪ DB KHI APP START
  useEffect(() => {
    const loadSettings = async () => {
      const savedInfo = await fetchSettings();
      if (savedInfo) {
        setStudioInfo(savedInfo);
      }
    };
    loadSettings();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      const user = staff.find(s => s.username === loginUsername && s.password === loginPassword);
      if (user) {
        setCurrentUser(user);
      } else {
        alert('Sai thông tin đăng nhập!');
      }
      setIsLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setActiveTab('dashboard');
  };

  const hasAccess = (moduleId: string) => {
    if (!currentUser) return false;
    if (currentUser.username === 'admin' || currentUser.role === 'Giám đốc') return true;
    
    // Check specific permission
    const perms = currentUser.permissions?.[moduleId];
    if (!perms) return false;
    
    // If any sub-module is viewable, return true
    return Object.values(perms).some(p => p.view);
  };

  const isDirectorOrAdmin = currentUser?.role === 'Giám đốc' || currentUser?.username === 'admin';

  // Menu Definition
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan', show: isDirectorOrAdmin }, 
    { id: 'contracts', icon: FileText, label: 'Hợp đồng', show: hasAccess('contracts') },
    { id: 'finance', icon: DollarSign, label: 'Thu & Chi', show: hasAccess('finance') },
    { id: 'schedule', icon: Calendar, label: 'Lịch làm việc', show: hasAccess('schedules') },
    { id: 'products', icon: Package, label: 'Dịch vụ', show: hasAccess('products') },
    { id: 'staff', icon: Users, label: 'Nhân sự', show: hasAccess('staff') },
    { id: 'rules', icon: Gavel, label: 'Nội quy', show: true }, 
    { id: 'salary', icon: Banknote, label: 'Lương & Thưởng', show: true },
    { id: 'settings', icon: Settings, label: 'Cấu hình', show: hasAccess('settings') },
  ];

  if (!currentUser) {
    // ... (Giữ nguyên UI Login) ...
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-200">
           <div className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center text-3xl font-black mx-auto shadow-xl shadow-blue-500/30 mb-6">
                AS
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Ánh Sáng Studio</h1>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Hệ thống quản lý vận hành</p>
           </div>
           
           <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập</label>
                 <input 
                   type="text" 
                   required
                   className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                   value={loginUsername}
                   onChange={e => setLoginUsername(e.target.value)}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
                 <input 
                   type="password" 
                   required
                   className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                   value={loginPassword}
                   onChange={e => setLoginPassword(e.target.value)}
                 />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 disabled:opacity-70 disabled:active:scale-100"
              >
                {isLoading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}
              </button>
           </form>
           <div className="mt-8 text-center text-[10px] text-slate-300 font-bold uppercase">
              Powered by GenAI Solution
           </div>
        </div>
      </div>
    );
  }

  return (
    // ... (Giữ nguyên UI chính của App) ...
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 hidden md:flex">
        <div className="p-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-500/20">AS</div>
              <div>
                 <div className="font-black text-lg tracking-tight uppercase">Ánh Sáng</div>
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Studio Manager</div>
              </div>
           </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide py-4">
           <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Menu chính</div>
           {menuItems.filter(i => i.show).map(item => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id)}
               className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${activeTab === item.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50'}`}
             >
               <item.icon size={20} className={`${activeTab === item.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-500'} transition-colors`} />
               <span className="font-bold text-xs uppercase tracking-wide">{item.label}</span>
             </button>
           ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <div className="bg-slate-50 rounded-[2rem] p-4 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200">
                    <Users size={18} className="text-slate-400" />
                 </div>
                 <div>
                    <div className="font-bold text-sm text-slate-900">{currentUser.name}</div>
                    <div className="text-[10px] font-bold text-blue-600 uppercase">{currentUser.role}</div>
                 </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={14} /> Đăng xuất
              </button>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
         <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10 sticky top-0">
            <div className="md:hidden flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold">AS</div>
               <span className="font-black uppercase">Studio</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-400 md:flex">
               <span className="text-xs font-bold uppercase tracking-widest">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            <div className="flex items-center gap-4">
               <button 
                 onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                 className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-sm border ${isAssistantOpen ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
               >
                 <Sparkles size={16} /> Trợ lý AI
               </button>
            </div>
         </header>

         <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
            <div className="max-w-[1600px] mx-auto">
              {activeTab === 'dashboard' && (
                <Dashboard 
                  contracts={contracts} 
                  transactions={transactions}
                  staff={staff}
                  services={services}
                />
              )}
              {activeTab === 'contracts' && (
                <ContractManager 
                  contracts={contracts} setContracts={setContracts}
                  customers={customers} setCustomers={setCustomers}
                  transactions={transactions} setTransactions={setTransactions}
                  services={services}
                  staff={staff}
                  scheduleTypes={scheduleTypes} setScheduleTypes={setScheduleTypes}
                  studioInfo={studioInfo}
                  currentUser={currentUser}
                />
              )}
              {activeTab === 'finance' && (
                <ExpenseManager 
                  transactions={transactions} setTransactions={setTransactions}
                  contracts={contracts}
                  customers={customers}
                  staff={staff}
                  expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories}
                  currentUser={currentUser}
                />
              )}
              {activeTab === 'schedule' && (
                <ScheduleManager 
                  contracts={contracts}
                  staff={staff}
                  scheduleTypes={scheduleTypes}
                  schedules={contracts.flatMap(c => c.schedules)}
                />
              )}
              {activeTab === 'products' && (
                <ProductManager 
                  services={services} setServices={setServices}
                  departments={departments} setDepartments={setDepartments}
                  currentUser={currentUser} // Truyền User để check quyền
                />
              )}
              {activeTab === 'staff' && (
                <StaffManager 
                  staff={staff} setStaff={setStaff}
                  schedules={contracts.flatMap(c => c.schedules)}
                  currentUser={currentUser} // Truyền User để check quyền
                />
              )}
              {activeTab === 'rules' && (
                <RuleManager staff={staff} currentUser={currentUser} />
              )}
              {activeTab === 'salary' && (
                <SalaryManager staff={staff} currentUser={currentUser} />
              )}
              {activeTab === 'settings' && (
                <StudioSettings 
                  studioInfo={studioInfo} setStudioInfo={setStudioInfo}
                  currentUser={currentUser} // Truyền User để check quyền
                />
              )}
            </div>
         </main>

         {/* AI Assistant Sidebar */}
         {isAssistantOpen && (
            <div className="absolute right-0 top-20 bottom-0 w-full md:w-[400px] bg-white border-l border-slate-200 shadow-2xl z-30 animate-in slide-in-from-right-4">
               <AIAssistant 
                 onClose={() => setIsAssistantOpen(false)}
                 context={{ contracts, transactions, staff, services }}
               />
            </div>
         )}
      </div>
    </div>
  );
}

export default App;
