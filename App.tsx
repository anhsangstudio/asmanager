
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, Calendar, Wallet, Users, Package, 
  Menu, X, Bell, Search, MessageSquare, RefreshCw, Cloud, CloudOff, Loader2, Settings, LogOut, Key, User, Sparkles, Building, ShieldAlert, Link2, MoreHorizontal, AlertCircle, HelpCircle
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ContractManager from './components/ContractManager';
import ScheduleManager from './components/ScheduleManager';
import ExpenseManager from './components/ExpenseManager';
import StaffManager from './components/StaffManager';
import ProductManager from './components/ProductManager';
import AIAssistant from './components/AIAssistant';
import StudioSettings from './components/StudioSettings';
import { 
  mockCustomers, mockStaff, mockServices, mockContracts, mockTransactions 
} from './mockData';
import { Contract, Transaction, Staff, Customer, Service, DEFAULT_SCHEDULE_TYPES, DEFAULT_DEPARTMENTS, ExpenseCategory, StudioInfo, ModulePermission, Schedule } from './types';
import { isConfigured, fetchBootstrapData, login, supabase } from './apiService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>(isConfigured ? 'synced' : 'offline');

  // Dữ liệu nghiệp vụ trung tâm
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<string[]>(DEFAULT_SCHEDULE_TYPES);
  
  const [studioInfo, setStudioInfo] = useState<StudioInfo>({
    name: 'ÁNH SÁNG STUDIO',
    address: '81 Lý Nhật Quang, Thị Trấn Đô Lương, Nghệ An',
    phone: '097.899.4568',
    zalo: '0971368345',
    website: 'www.anhsangwedding.vn',
    fanpage: 'www.facebook.com/anhsangwedding',
    email: 'anhsangstudio.dl@gmail.com',
    directorName: 'Trần Thị Sáng',
    logoText: 'AS',
    googleDocsTemplateUrl: '',
    contractTerms: `Điều khoản mặc định...`
  });

  const loadMockData = () => {
    setStaff(mockStaff);
    setContracts(mockContracts);
    setTransactions(mockTransactions);
    setSchedules(mockContracts.flatMap(c => (c.schedules || []).map(s => ({ ...s, contractCode: c.contractCode }))));
    setServices(mockServices as unknown as Service[]);
    setSyncStatus('offline');
    setLoadError(null);
    setIsLoading(false);
    console.log("[Bootstrap Fallback] Using mock data.");
  };

  const initApp = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (!isConfigured) {
        loadMockData();
        return;
      }

      const data = await fetchBootstrapData();
      if (data) {
        setStaff(data.staff);
        setContracts(data.contracts);
        setTransactions(data.transactions);
        setSchedules(data.schedules);
        setServices(data.services);
        setSyncStatus('synced');
        console.log("[Bootstrap Success] Data loaded from Supabase.");
      }
    } catch (e: any) {
      console.error("[Bootstrap Failure]", e);
      setLoadError(e.message || "Không thể kết nối với Supabase Cloud.");
    } finally {
      setIsLoading(false);
    }
  };

  // Setup Real-time Subscriptions
  useEffect(() => {
    if (!isConfigured) return;

    const servicesChannel = supabase
      .channel('services_changes')
      .on('postgres_changes', { event: '*', table: 'services' }, (payload) => {
        console.log('[Realtime Service Update]', payload);
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        // Map record for app compatibility
        const mapped = newRecord ? {
          ...newRecord,
          id: newRecord.ma_dv,
          code: newRecord.ma_dv,
          name: newRecord.ten_dv,
          price: newRecord.don_gia,
          type: newRecord.nhom_dv,
          description: newRecord.chi_tiet_dv,
          unit: newRecord.don_vi_tinh,
          label: newRecord.nhan
        } : null;

        if (eventType === 'INSERT') {
          setServices(prev => [mapped as Service, ...prev]);
        } else if (eventType === 'UPDATE') {
          setServices(prev => prev.map(s => s.ma_dv === mapped?.ma_dv ? mapped as Service : s));
        } else if (eventType === 'DELETE') {
          setServices(prev => prev.filter(s => s.ma_dv !== oldRecord.ma_dv));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
    };
  }, []);

  useEffect(() => {
    initApp();
  }, []);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    
    try {
      const result = await login(loginForm.username, loginForm.password);
      if (result.success && result.user) {
        const user = result.user;
        const userPermissions = user.permissions || {};
        
        const permittedModules = Object.keys(userPermissions).filter(modId => {
          const subPerms = userPermissions[modId] || {};
          return Object.values(subPerms).some((p: any) => p && p.view);
        });

        if (permittedModules.length > 0 || user.username === 'admin') {
          setCurrentUser(user);
          setActiveTab(permittedModules[0] || 'dashboard');
        } else {
          setLoginError('Tài khoản này chưa được phân quyền truy cập module.');
        }
      } else {
        setLoginError(result.error || 'Sai thông tin đăng nhập.');
      }
    } catch (e: any) {
      setLoginError(e.message || 'Lỗi hệ thống hoặc kết nối Supabase Cloud.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
  };

  const allNavItems = [
    { id: 'dashboard', label: 'T.Quan', fullLabel: 'Tổng quan', icon: LayoutDashboard },
    { id: 'contracts', label: 'H.Đồng', fullLabel: 'Hợp đồng', icon: FileText },
    { id: 'schedules', label: 'Lịch', fullLabel: 'Lịch làm việc', icon: Calendar },
    { id: 'finance', label: 'Thu Chi', fullLabel: 'Tài chính', icon: Wallet },
    { id: 'staff', label: 'N.Sự', fullLabel: 'Nhân sự', icon: Users },
    { id: 'products', label: 'S.Phẩm', fullLabel: 'Sản phẩm', icon: Package },
    { id: 'settings', label: 'C.Hình', fullLabel: 'Cấu hình', icon: Settings },
  ];

  const permittedNavItems = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.username === 'admin') return allNavItems;
    
    return allNavItems.filter(item => {
      const subPerms = (currentUser.permissions || {})[item.id] || {};
      return Object.values(subPerms).some((p: any) => p && p.view);
    });
  }, [currentUser]);

  if (loadError) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center gap-6 overflow-y-auto">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2 shrink-0">
           <AlertCircle size={48} />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Lỗi Supabase Cloud</h1>
        
        <div className="max-w-md bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4">
          <p className="text-slate-400 font-medium text-sm leading-relaxed">{loadError}</p>
          <div className="pt-4 border-t border-white/10 text-left space-y-3 text-[11px] text-slate-500 font-medium">
             <p>Vui lòng kiểm tra thông số SUPABASE_URL và SUPABASE_ANON_KEY trong môi trường.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs shrink-0">
          <button 
            onClick={initApp}
            className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Thử kết nối lại
          </button>
          <button 
            onClick={loadMockData}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
          >
            Sử dụng Dữ liệu mẫu (Offline)
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && isConfigured) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-blue-500 animate-spin" size={48} />
        <div className="text-white font-black uppercase text-[10px] tracking-[0.2em]">Đồng bộ hóa Supabase Ánh Sáng Studio...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white/10 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/10 shadow-2xl animate-in">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
              <span className="text-4xl font-black text-white">AS</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Ánh Sáng Studio</h1>
            <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Supabase Powered v3.0</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tên đăng nhập</label>
              <input type="text" placeholder="Nhập username..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mật khẩu</label>
              <input type="password" placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            </div>
            {loginError && <div className="text-red-400 text-xs font-bold text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20">{loginError}</div>}
            <button disabled={isLoggingIn} className="w-full bg-blue-600 py-5 rounded-[1.5rem] text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all disabled:bg-slate-700">
              {isLoggingIn ? <Loader2 className="animate-spin mx-auto" /> : 'Truy cập hệ thống'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentTabInfo = allNavItems.find(i => i.id === activeTab);
  const canUseAI = currentUser?.username === 'admin' || currentUser?.role === 'Giám đốc';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans flex-col md:flex-row">
      <aside className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} z-30`}>
        <div className="p-6 flex items-center gap-3">
          <div className="min-w-[32px] w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">AS</div>
          {isSidebarOpen && <span className="font-black text-xl tracking-tight text-blue-900 uppercase truncate">Ánh Sáng</span>}
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-hide">
          {permittedNavItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon className="w-5 h-5" />
              {isSidebarOpen && <span className="text-sm truncate">{item.fullLabel}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-4">
           {isSidebarOpen && (
             <div className={`p-4 rounded-2xl border transition-all ${syncStatus === 'offline' ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center gap-3">
                   {syncStatus === 'offline' ? <CloudOff size={18} className="text-orange-500" /> : <Cloud size={18} className="text-emerald-500" />}
                   <div className="flex-1 min-w-0">
                      <div className={`text-[9px] font-black uppercase truncate ${syncStatus === 'offline' ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {syncStatus === 'offline' ? 'Offline Mode' : 'Supabase Active'}
                      </div>
                   </div>
                </div>
             </div>
           )}
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex w-full justify-center p-2 text-slate-300 hover:text-slate-600 transition-colors"><Menu size={20}/></button>
           <button onClick={handleLogout} className={`w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold text-[10px] uppercase tracking-widest ${!isSidebarOpen && 'justify-center'}`}>
              <LogOut size={18}/> {isSidebarOpen && "Đăng xuất"}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                {currentTabInfo?.icon && React.createElement(currentTabInfo.icon, {size: 20})}
             </div>
             <h1 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">{currentTabInfo?.fullLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser.role}</div>
               <div className="text-sm font-black text-slate-900">{currentUser.name}</div>
             </div>
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl border border-blue-200 flex items-center justify-center font-black text-xs">
               {currentUser.name.charAt(0)}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide mobile-nav-padding">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === 'dashboard' && <Dashboard contracts={contracts} transactions={transactions} staff={staff} services={services} />}
            {activeTab === 'contracts' && (
              <ContractManager 
                contracts={contracts} setContracts={setContracts} 
                customers={customers} setCustomers={setCustomers}
                transactions={transactions} setTransactions={setTransactions}
                services={services} staff={staff} scheduleTypes={scheduleTypes} setScheduleTypes={setScheduleTypes}
                studioInfo={studioInfo}
              />
            )}
            {activeTab === 'finance' && (
              <ExpenseManager 
                transactions={transactions} setTransactions={setTransactions} 
                contracts={contracts} customers={customers} staff={staff}
                expenseCategories={Object.values(ExpenseCategory)} setExpenseCategories={() => {}} 
                currentUser={currentUser}
              />
            )}
            {activeTab === 'staff' && <StaffManager staff={staff} setStaff={setStaff} schedules={schedules} />}
            {activeTab === 'products' && <ProductManager services={services} setServices={setServices} departments={DEFAULT_DEPARTMENTS} setDepartments={() => {}} />}
            {activeTab === 'schedules' && <ScheduleManager contracts={contracts} staff={staff} scheduleTypes={scheduleTypes} schedules={schedules} />}
            {activeTab === 'settings' && <StudioSettings studioInfo={studioInfo} setStudioInfo={setStudioInfo} />}
          </div>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {permittedNavItems.slice(0, 4).map(item => (
            <button 
              key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === item.id ? 'text-blue-600' : 'text-slate-300'}`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'scale-110 transition-transform' : ''} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
          <button onClick={() => setShowMobileMore(true)} className="flex flex-col items-center gap-1 flex-1 py-1 text-slate-300">
            <MoreHorizontal size={22} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Thêm</span>
          </button>
        </nav>

        {showMobileMore && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end animate-in" onClick={() => setShowMobileMore(false)}>
            <div className="bg-white w-full rounded-t-[3rem] p-8 space-y-6 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4"></div>
              <h3 className="text-center font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Danh mục mở rộng</h3>
              <div className="grid grid-cols-3 gap-4">
                {permittedNavItems.map(item => (
                  <button 
                    key={item.id} onClick={() => { setActiveTab(item.id); setShowMobileMore(false); }}
                    className={`flex flex-col items-center gap-3 p-4 rounded-[2rem] transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'bg-slate-50 text-slate-500 active:bg-slate-100'}`}
                  >
                    <item.icon size={24} />
                    <span className="text-[10px] font-black uppercase tracking-tight">{item.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={handleLogout} className="w-full py-5 bg-red-50 text-red-500 rounded-3xl font-black uppercase text-xs tracking-widest mt-4">Đăng xuất hệ thống</button>
            </div>
          </div>
        )}

        {canUseAI && (
          <button onClick={() => setShowAssistant(!showAssistant)} className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 md:bottom-8 md:right-8">
            <MessageSquare />
          </button>
        )}

        {showAssistant && canUseAI && (
          <div className="fixed inset-0 bg-white z-[150] md:inset-auto md:bottom-24 md:right-8 md:w-[400px] md:h-[550px] md:rounded-[2.5rem] md:shadow-2xl overflow-hidden md:border md:border-slate-200 animate-in">
            <AIAssistant onClose={() => setShowAssistant(false)} context={{ contracts, transactions, staff, services }} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
