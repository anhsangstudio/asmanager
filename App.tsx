
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, DollarSign, Calendar, Package, 
  Users, Settings, LogOut, MessageSquare, Menu, Bell, Loader2, Key
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import ContractManager from './components/ContractManager';
import ExpenseManager from './components/ExpenseManager';
import ScheduleManager from './components/ScheduleManager';
import ProductManager from './components/ProductManager';
import StaffManager from './components/StaffManager';
import StudioSettings from './components/StudioSettings';
import AIAssistant from './components/AIAssistant';

import { 
  Contract, Customer, Service, Staff, Transaction, Schedule, StudioInfo, 
  DEFAULT_SCHEDULE_TYPES, DEFAULT_DEPARTMENTS, TransactionType
} from './types';
import { fetchBootstrapData, login } from './apiService';
import { mockCustomers, mockStaff, mockServices, mockContracts, mockTransactions } from './mockData';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Config State
  const [scheduleTypes, setScheduleTypes] = useState<string[]>(DEFAULT_SCHEDULE_TYPES);
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Sản xuất', 'Marketing', 'Quản trị', 'Lương', 'Đầu tư', 'Khác']);
  const [studioInfo, setStudioInfo] = useState<StudioInfo>({
    name: 'Ánh Sáng Studio',
    address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
    phone: '0987654321',
    zalo: '0987654321',
    website: 'anhsangstudio.vn',
    fanpage: 'facebook.com/anhsangstudio',
    email: 'contact@anhsangstudio.vn',
    directorName: 'Nguyễn Văn A',
    googleDocsTemplateUrl: '',
    logoText: 'AS',
    contractTerms: `1. Khách hàng vui lòng kiểm tra kỹ thông tin trước khi ký.
2. Đặt cọc 30% giá trị hợp đồng ngay khi ký.
3. Thanh toán nốt phần còn lại khi nhận sản phẩm hoàn thiện.
4. Studio chịu trách nhiệm lưu trữ file gốc trong vòng 6 tháng.`
  });

  // --- ACCESS CONTROL LOGIC ---
  // Rule: Chỉ Admin hoặc Giám đốc mới có quyền truy cập module nhạy cảm (AI, Dashboard)
  const isDirectorOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.username === 'admin' || currentUser.role === 'Giám đốc';
  }, [currentUser]);

  // Check permissions helper
  const canAccess = (module: string) => {
    if (!currentUser) return false;
    const perms = currentUser.permissions?.[module];
    if (!perms) return false;
    // Check if any submodule has view access
    return Object.values(perms).some((p: any) => p.view);
  };

  // Menu Definition with Strict Rules
  const menuItems = [
    // Override Dashboard permission: STRICTLY for Admin/Director
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan', show: isDirectorOrAdmin }, 
    { id: 'contracts', icon: FileText, label: 'Hợp đồng', show: canAccess('contracts') },
    { id: 'finance', icon: DollarSign, label: 'Thu & Chi', show: canAccess('finance') },
    { id: 'schedule', icon: Calendar, label: 'Lịch làm việc', show: canAccess('schedules') },
    { id: 'products', icon: Package, label: 'Dịch vụ', show: canAccess('products') },
    { id: 'staff', icon: Users, label: 'Nhân sự', show: canAccess('staff') },
    { id: 'settings', icon: Settings, label: 'Cấu hình', show: canAccess('settings') },
  ];

  // Route Guard & Redirect Logic
  useEffect(() => {
    if (currentUser) {
      // 1. Guard AI Assistant
      if (showAIAssistant && !isDirectorOrAdmin) {
        console.warn('Security: Closing unauthorized AI Assistant access');
        setShowAIAssistant(false);
      }

      // 2. Guard Active Tab (Dashboard)
      // Kiểm tra xem tab hiện tại có được phép hiển thị hay không
      const currentItem = menuItems.find(i => i.id === activeTab);
      
      // Nếu không tìm thấy item hoặc item bị ẩn (show = false)
      if (!currentItem || !currentItem.show) {
        console.warn(`Security: Redirecting from unauthorized tab '${activeTab}'`);
        
        // Tìm tab hợp lệ đầu tiên để redirect
        const firstValidTab = menuItems.find(i => i.show);
        if (firstValidTab) {
          setActiveTab(firstValidTab.id);
        } else {
          // Trường hợp cực đoan: không có quyền gì cả
          setActiveTab('unauthorized'); 
        }
      }
    }
  }, [currentUser, activeTab, isDirectorOrAdmin, showAIAssistant]); // Dependencies ensure this runs on user change or tab change

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchBootstrapData();
        if (data) {
          setContracts(data.contracts);
          setCustomers(data.customers);
          setTransactions(data.transactions);
          setServices(data.services);
          setStaff(data.staff);
          setSchedules(data.schedules);
        } else {
          // Fallback mock data
          setContracts(mockContracts);
          setCustomers(mockCustomers);
          setTransactions(mockTransactions);
          setServices(mockServices);
          setStaff(mockStaff);
          const extractedSchedules = mockContracts.flatMap(c => 
            (c.schedules || []).map(s => ({...s, contractCode: c.contractCode}))
          );
          setSchedules(extractedSchedules);
        }
      } catch (e) {
        console.error("Data load error", e);
        // Fallback on error
        setContracts(mockContracts);
        setCustomers(mockCustomers);
        setTransactions(mockTransactions);
        setServices(mockServices);
        setStaff(mockStaff);
        const extractedSchedules = mockContracts.flatMap(c => 
            (c.schedules || []).map(s => ({...s, contractCode: c.contractCode}))
        );
        setSchedules(extractedSchedules);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await login(username, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        // Reset active tab logic happens in useEffect, but we can hint default here
        // Note: We don't set activeTab here directly to allow the Effect to handle permissions logic centrally
      } else {
        setLoginError(res.error || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setLoginError('Lỗi kết nối');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setActiveTab('dashboard'); // Reset to default
    setShowAIAssistant(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl text-2xl font-black">
              AS
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Đăng Nhập</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Hệ thống quản trị Ánh Sáng Studio</p>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Tên đăng nhập</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="admin"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Mật khẩu</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="••••"
                />
              </div>

              {loginError && (
                <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> {loginError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoggingIn ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                Đăng nhập hệ thống
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72' : 'w-24'} hidden md:flex flex-col shadow-2xl`}
      >
        <div className={`p-8 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/30">AS</div>
              <div>
                <h1 className="font-black text-lg tracking-tight uppercase leading-none">Ánh Sáng</h1>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Studio Manager</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">AS</div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
          {menuItems.filter(i => i.show).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group relative ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'animate-pulse' : ''} />
              {isSidebarOpen && <span className="font-bold text-xs uppercase tracking-wide">{item.label}</span>}
              {!isSidebarOpen && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {/* Strictly restrict AI Assistant Button */}
          {isDirectorOrAdmin && (
            <button onClick={() => setShowAIAssistant(!showAIAssistant)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${showAIAssistant ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
               <MessageSquare size={20} />
               {isSidebarOpen && <span className="font-bold text-xs uppercase tracking-wide">Trợ lý AI</span>}
            </button>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all">
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-bold text-xs uppercase tracking-wide">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 z-40 flex items-center justify-between px-4 shadow-xl">
         <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xs">AS</div>
         <span className="font-black text-white text-sm uppercase tracking-widest">{menuItems.find(i => i.id === activeTab)?.label}</span>
         <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white"><Menu size={24}/></button>
      </div>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-72' : 'md:ml-24'} p-4 md:p-8 pt-20 md:pt-8 min-h-screen`}>
        {/* Header Bar */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1">
              Xin chào, {currentUser.name.split(' ').pop()} 👋
            </h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{currentUser.role} • {studioInfo.name}</p>
          </div>
          <div className="flex items-center gap-4">
             <button className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all relative">
                <Bell size={20} />
                <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="hidden md:flex w-12 h-12 rounded-full bg-slate-900 text-white items-center justify-center hover:bg-blue-600 transition-all shadow-lg active:scale-95"
             >
               <Menu size={20} />
             </button>
          </div>
        </header>

        {/* Dynamic Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={40} className="animate-spin text-blue-600" />
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* RENDER GUARD: Prevent flash of unprivileged content */}
            {activeTab === 'dashboard' && isDirectorOrAdmin && (
              <Dashboard 
                contracts={contracts} 
                transactions={transactions} 
                staff={staff}
                services={services}
              />
            )}
            {activeTab === 'contracts' && canAccess('contracts') && (
              <ContractManager 
                contracts={contracts} setContracts={setContracts} 
                customers={customers} setCustomers={setCustomers}
                transactions={transactions} setTransactions={setTransactions}
                services={services} staff={staff} scheduleTypes={scheduleTypes} setScheduleTypes={setScheduleTypes}
                studioInfo={studioInfo}
                currentUser={currentUser}
              />
            )}
            {activeTab === 'finance' && canAccess('finance') && (
              <ExpenseManager 
                transactions={transactions} setTransactions={setTransactions}
                contracts={contracts}
                customers={customers}
                staff={staff}
                expenseCategories={expenseCategories}
                setExpenseCategories={setExpenseCategories}
                currentUser={currentUser}
              />
            )}
            {activeTab === 'schedule' && canAccess('schedules') && (
              <ScheduleManager 
                contracts={contracts}
                staff={staff}
                scheduleTypes={scheduleTypes}
                schedules={schedules}
              />
            )}
            {activeTab === 'products' && canAccess('products') && (
              <ProductManager 
                services={services} setServices={setServices}
                departments={departments} setDepartments={setDepartments}
              />
            )}
            {activeTab === 'staff' && canAccess('staff') && (
              <StaffManager 
                staff={staff} setStaff={setStaff}
                schedules={schedules}
              />
            )}
            {activeTab === 'settings' && canAccess('settings') && (
              <StudioSettings studioInfo={studioInfo} setStudioInfo={setStudioInfo} />
            )}
            
            {/* Fallback for unauthorized state (though effect should redirect) */}
            {activeTab === 'unauthorized' && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <LogOut size={32} />
                </div>
                <h3 className="font-bold text-lg text-slate-600">Không có quyền truy cập</h3>
                <p className="text-xs uppercase tracking-widest mt-1">Vui lòng liên hệ quản trị viên</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* AI Assistant Overlay */}
      {/* Strictly restricted to Director/Admin */}
      {showAIAssistant && isDirectorOrAdmin && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] z-50 shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-right-10 border border-white/20">
          <AIAssistant 
            onClose={() => setShowAIAssistant(false)} 
            context={{
              contracts: contracts.length,
              revenue: transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0),
              staff: staff.length
            }}
          />
        </div>
      )}
    </div>
  );
};

export default App;
