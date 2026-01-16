
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { 
  FileText, TrendingUp, AlertCircle, Calendar, 
  ArrowUpRight, ArrowDownRight, PieChart as PieIcon,
  X, Calculator, ArrowRightLeft, Target, Wallet, Sparkles, Loader2, ArrowUpCircle, ArrowDownCircle, History, Clock, ChevronUp, ChevronDown, Package, List
} from 'lucide-react';
import { Contract, Transaction, Staff, Service, TransactionType, ServiceType } from '../types';
import { analyzeFinancials } from '../geminiService';

interface DashboardProps {
  contracts: Contract[];
  transactions: Transaction[];
  staff: Staff[];
  services: Service[];
}

type FilterPeriod = 
  | 'today' | 'this_week' | 'last_week' 
  | 'this_month' | 'select_month' | 'select_year' 
  | 'compare_years' | 'compare_months' | 'compare_weeks';

type RankingMode = 'type' | 'product';

const Dashboard: React.FC<DashboardProps> = ({ contracts, transactions, staff, services }) => {
  const [activeFilter, setActiveFilter] = useState<FilterPeriod>('this_month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [compareYearA, setCompareYearA] = useState(new Date().getFullYear());
  const [compareYearB, setCompareYearB] = useState(new Date().getFullYear() - 1);
  const [compareMonth, setCompareMonth] = useState(new Date().getMonth() + 1);
  const [showRevenueDetail, setShowRevenueDetail] = useState(false);
  
  // States cho bảng xếp hạng
  const [rankingMode, setRankingMode] = useState<RankingMode>('type');
  const [rankingPeriod, setRankingPeriod] = useState<string>('global'); // 'global' | 'this_month' | 'this_year'
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const YEARS = [2023, 2024, 2025, 2026];

  const getPeriodRange = (period: string, year: number, month?: number) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this_week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;
      case 'last_week':
        const lDay = now.getDay();
        const lDiff = now.getDate() - lDay - 6;
        start = new Date(now.setDate(lDiff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'select_month':
        start = new Date(year, month! - 1, 1);
        end = new Date(year, month!, 0);
        break;
      case 'select_year':
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
        break;
    }
    return { start, end };
  };

  const calculateForRange = (rangeStart: Date, rangeEnd: Date) => {
    const filteredContracts = contracts.filter(c => {
      const d = new Date(c.date);
      return d >= rangeStart && d <= rangeEnd;
    });

    const filteredTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= rangeStart && d <= rangeEnd;
    });

    const income = filteredTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const expense = filteredTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    const contractRevenue = filteredContracts.reduce((s, c) => s + c.totalAmount, 0);
    const remainingAmount = filteredContracts.reduce((s, c) => s + (c.totalAmount - c.paidAmount), 0);

    const breakdown = Object.values(ServiceType).map(type => {
      const typeContracts = filteredContracts.filter(c => c.serviceType === type);
      const typeRevenue = typeContracts.reduce((s, c) => s + c.totalAmount, 0);
      const typeCount = typeContracts.length;
      const typePaid = transactions
        .filter(t => t.type === TransactionType.INCOME && t.contractId && typeContracts.some(tc => tc.id === t.contractId))
        .reduce((s, t) => s + t.amount, 0);

      return {
        name: type,
        count: typeCount,
        revenue: typeRevenue,
        actualPaid: typePaid,
        remaining: typeRevenue - typePaid,
        aov: typeCount > 0 ? Math.round(typeRevenue / typeCount) : 0,
        health: typeRevenue > 0 ? Math.round((typePaid / typeRevenue) * 100) : 0
      };
    }).filter(b => b.revenue > 0 || b.count > 0);

    return { income, expense, contractRevenue, remainingAmount, breakdown, count: filteredContracts.length, filteredContracts, filteredTxs };
  };

  const summaryData = useMemo(() => {
    if (activeFilter.startsWith('compare')) {
      let dataA, dataB;
      if (activeFilter === 'compare_years') {
        dataA = calculateForRange(new Date(compareYearA, 0, 1), new Date(compareYearA, 11, 31));
        dataB = calculateForRange(new Date(compareYearB, 0, 1), new Date(compareYearB, 11, 31));
      } else if (activeFilter === 'compare_months') {
        dataA = calculateForRange(new Date(compareYearA, compareMonth - 1, 1), new Date(compareYearA, compareMonth, 0));
        dataB = calculateForRange(new Date(compareYearB, compareMonth - 1, 1), new Date(compareYearB, compareMonth, 0));
      } else { // compare weeks
        const now = new Date();
        dataA = calculateForRange(new Date(compareYearA, now.getMonth(), now.getDate() - 7), new Date(compareYearA, now.getMonth(), now.getDate()));
        dataB = calculateForRange(new Date(compareYearB, now.getMonth(), now.getDate() - 7), new Date(compareYearB, now.getMonth(), now.getDate()));
      }
      return { dataA, dataB, isCompare: true };
    } else {
      const range = getPeriodRange(activeFilter, selectedYear, selectedMonth);
      const data = calculateForRange(range.start, range.end);
      return { data, isCompare: false };
    }
  }, [contracts, transactions, activeFilter, selectedYear, selectedMonth, compareYearA, compareYearB, compareMonth]);

  const stats = summaryData.isCompare ? summaryData.dataA! : summaryData.data!;

  // Logic xếp hạng nâng cao
  const rankingData = useMemo(() => {
    let rangeStart, rangeEnd;
    const now = new Date();
    
    if (rankingPeriod === 'global') {
      const range = activeFilter.startsWith('compare') 
        ? { start: new Date(compareYearA, 0, 1), end: new Date(compareYearA, 11, 31) }
        : getPeriodRange(activeFilter, selectedYear, selectedMonth);
      rangeStart = range.start;
      rangeEnd = range.end;
    } else if (rankingPeriod === 'this_month') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else { // this_year
      rangeStart = new Date(now.getFullYear(), 0, 1);
      rangeEnd = new Date(now.getFullYear(), 11, 31);
    }

    const filteredContracts = contracts.filter(c => {
      const d = new Date(c.date);
      return d >= rangeStart && d <= rangeEnd;
    });

    if (rankingMode === 'type') {
      return Object.values(ServiceType).map(type => {
        const typeContracts = filteredContracts.filter(c => c.serviceType === type);
        const revenue = typeContracts.reduce((s, c) => s + c.totalAmount, 0);
        const count = typeContracts.length;
        const paid = transactions
          .filter(t => t.type === TransactionType.INCOME && t.contractId && typeContracts.some(tc => tc.id === t.contractId))
          .reduce((s, t) => s + t.amount, 0);
        return {
          name: type,
          count,
          revenue,
          actualPaid: paid,
          remaining: revenue - paid,
          health: revenue > 0 ? Math.round((paid / revenue) * 100) : 0
        };
      }).filter(i => i.count > 0 || i.revenue > 0);
    } else {
      // Xếp hạng theo sản phẩm (Individual Products)
      const productMap: Record<string, any> = {};
      filteredContracts.forEach(c => {
        c.items.forEach(item => {
          const name = item.serviceName;
          if (!productMap[name]) {
            productMap[name] = { name, count: 0, revenue: 0, actualPaid: 0, remaining: 0, health: 0 };
          }
          productMap[name].count += item.quantity;
          productMap[name].revenue += item.subtotal;
          
          // Ước tính số tiền đã thu cho sản phẩm này dựa trên tỷ lệ thanh toán của Hợp đồng đó
          const payRatio = c.totalAmount > 0 ? c.paidAmount / c.totalAmount : 0;
          productMap[name].actualPaid += Math.round(item.subtotal * payRatio);
          productMap[name].remaining = productMap[name].revenue - productMap[name].actualPaid;
          productMap[name].health = productMap[name].revenue > 0 ? Math.round((productMap[name].actualPaid / productMap[name].revenue) * 100) : 0;
        });
      });
      return Object.values(productMap);
    }
  }, [contracts, transactions, rankingMode, rankingPeriod, activeFilter, selectedYear, selectedMonth, compareYearA]);

  const sortedRankingData = useMemo(() => {
    return [...rankingData].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (sortConfig.direction === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [rankingData, sortConfig]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAiInsight(null);
    const result = await analyzeFinancials(summaryData);
    setAiInsight(result);
    setIsAnalyzing(false);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const compareChartData = useMemo(() => {
    if (!summaryData.isCompare) return [];
    return [
      { name: 'Doanh số HĐ', PerA: summaryData.dataA!.contractRevenue, PerB: summaryData.dataB!.contractRevenue },
      { name: 'Tiền đã thu', PerA: summaryData.dataA!.income, PerB: summaryData.dataB!.income },
      { name: 'Tiền chưa thu', PerA: summaryData.dataA!.remainingAmount, PerB: summaryData.dataB!.remainingAmount },
      { name: 'Chi phí', PerA: summaryData.dataA!.expense, PerB: summaryData.dataB!.expense },
    ];
  }, [summaryData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Mega Filter Header */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Target size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Phân tích chuyên sâu</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                {summaryData.isCompare ? 'Chế độ so sánh đối soát 2 kỳ' : 'Giám sát sức khỏe tài chính'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide max-w-full">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: 'this_week', label: 'Tuần này' },
                { id: 'last_week', label: 'Tuần trước' },
                { id: 'this_month', label: 'Tháng này' },
                { id: 'select_month', label: 'Chọn Tháng' },
                { id: 'select_year', label: 'Chọn Năm' },
                { id: 'compare_years', label: 'So sánh Năm' },
                { id: 'compare_months', label: 'So sánh Tháng' }
              ].map(p => (
                <button 
                  key={p.id}
                  onClick={() => { setActiveFilter(p.id as FilterPeriod); setAiInsight(null); }}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-all ${activeFilter === p.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Selection Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-50">
           <div className="flex flex-wrap items-center gap-3">
              {activeFilter.startsWith('compare') ? (
                <div className="flex items-center gap-3 animate-in slide-in-from-left-2">
                  <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                    <span className="text-[10px] font-black text-blue-600 uppercase">Kỳ A</span>
                    <select className="bg-transparent text-xs font-black outline-none" value={compareYearA} onChange={e => setCompareYearA(Number(e.target.value))}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <ArrowRightLeft size={16} className="text-slate-300" />
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Kỳ B</span>
                    <select className="bg-transparent text-xs font-black outline-none" value={compareYearB} onChange={e => setCompareYearB(Number(e.target.value))}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  {activeFilter === 'compare_months' && (
                    <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl border border-purple-100">
                       <span className="text-[10px] font-black text-purple-600 uppercase">Tháng</span>
                       <select className="bg-transparent text-xs font-black outline-none" value={compareMonth} onChange={e => setCompareMonth(Number(e.target.value))}>
                        {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>T{i+1}</option>)}
                       </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 animate-in slide-in-from-left-2">
                  <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                    {YEARS.map(y => <option key={y} value={y}>Năm {y}</option>)}
                  </select>
                  {activeFilter === 'select_month' && (
                    <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                    </select>
                  )}
                </div>
              )}
           </div>

           <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
           >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
            Cố vấn Tài chính AI
           </button>
        </div>
      </div>

      {/* AI Insights Display */}
      {aiInsight && (
        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl animate-in slide-in-from-top-4 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000"></div>
           <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                    <Sparkles size={24} className="text-blue-200" />
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tight">Báo cáo phân tích chuyên sâu AI</h3>
              </div>
              <button onClick={() => setAiInsight(null)} className="text-white/40 hover:text-white transition-colors"><X size={24}/></button>
           </div>
           <div className="prose prose-invert max-w-none">
              <div className="text-sm font-medium leading-relaxed whitespace-pre-line text-blue-50 bg-white/5 p-6 rounded-3xl border border-white/10">
                {aiInsight}
              </div>
           </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Doanh số HĐ (Gross)" 
          value={stats.contractRevenue.toLocaleString() + 'đ'} 
          icon={FileText} color="blue" 
          compareValue={summaryData.isCompare ? summaryData.dataB?.contractRevenue : undefined}
          subtitle="Tổng giá trị hợp đồng đã ký"
        />
        <KPICard 
          title="Thực thu (Dòng tiền)" 
          value={stats.income.toLocaleString() + 'đ'} 
          icon={Wallet} color="emerald" 
          compareValue={summaryData.isCompare ? summaryData.dataB?.income : undefined}
          subtitle="Tiền khách đã trả thực tế"
        />
        <KPICard 
          title="Tiền chưa thu (Nợ)" 
          value={stats.remainingAmount.toLocaleString() + 'đ'} 
          icon={AlertCircle} color="red" 
          compareValue={summaryData.isCompare ? summaryData.dataB?.remainingAmount : undefined}
          reverseGrowth
          subtitle="Công nợ khách hàng tồn đọng"
        />
        <KPICard 
          title="Lợi nhuận ròng" 
          value={(stats.income - stats.expense).toLocaleString() + 'đ'} 
          icon={TrendingUp} color="amber" 
          compareValue={summaryData.isCompare ? (summaryData.dataB!.income - summaryData.dataB!.expense) : undefined}
          subtitle="Tiền về trừ chi phí vận hành"
        />
      </div>

      {/* Main Analysis Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Đối soát & So sánh Tăng trưởng</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">So sánh trực quan các kỳ kinh doanh</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded-full"></div> <span className="text-[10px] font-black text-slate-400">KỲ A</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded-full"></div> <span className="text-[10px] font-black text-slate-400">KỲ B</span></div>
            </div>
          </div>
          
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {summaryData.isCompare ? (
                <BarChart data={compareChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }}
                    formatter={(val: number) => val.toLocaleString() + 'đ'}
                  />
                  <Bar name="Kỳ hiện tại (A)" dataKey="PerA" fill="#3B82F6" radius={[12, 12, 0, 0]} barSize={45} />
                  <Bar name="Kỳ đối chứng (B)" dataKey="PerB" fill="#E2E8F0" radius={[12, 12, 0, 0]} barSize={45} />
                </BarChart>
              ) : (
                <AreaChart data={stats.breakdown}>
                   <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 'bold'}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Area name="Doanh số" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area name="Thực thu" type="monotone" dataKey="actualPaid" stroke="#10B981" strokeWidth={4} fill="transparent" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10"><History size={120} /></div>
           <div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Đánh giá Hiệu quả</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Khả năng thu hồi vốn & Dòng tiền</p>
           </div>
           
           <div className="space-y-12 relative z-10">
              <div className="space-y-4 text-center">
                 <div className="text-6xl font-black text-blue-400 tracking-tighter">
                    {Math.round((stats.income / (stats.contractRevenue || 1)) * 100)}%
                 </div>
                 <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tỷ lệ tiền mặt về túi</div>
              </div>
              
              <div className="space-y-6">
                 <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hợp đồng mới</span>
                    <span className="text-2xl font-black text-white">{stats.count} <span className="text-xs font-normal text-slate-500">HĐ</span></span>
                 </div>
                 <div className="flex justify-between items-end border-t border-white/5 pt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AOV (Trung bình)</span>
                    <span className="text-xl font-black text-emerald-400">{(stats.count > 0 ? Math.round(stats.contractRevenue / stats.count) : 0).toLocaleString()}đ</span>
                 </div>
              </div>
           </div>

           <button 
            onClick={() => setShowRevenueDetail(true)}
            className="w-full py-5 bg-white text-slate-900 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-400 hover:text-white transition-all shadow-xl shadow-white/5 mt-8"
           >
             Mở rộng báo cáo chi tiết
           </button>
        </div>
      </div>

      {/* Table: Advanced Service & Product Ranking */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white shrink-0">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Xếp hạng Dịch vụ & Dòng tiền</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân tích hiệu suất theo từng phân loại</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle Mode */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setRankingMode('type')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${rankingMode === 'type' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                <List size={14} /> Theo Loại
              </button>
              <button 
                onClick={() => setRankingMode('product')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${rankingMode === 'product' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                <Package size={14} /> Theo Sản phẩm
              </button>
            </div>

            {/* Local Period Filter */}
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
               <Calendar size={14} className="text-slate-400" />
               <select 
                 className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-600 cursor-pointer"
                 value={rankingPeriod}
                 onChange={e => setRankingPeriod(e.target.value)}
               >
                 <option value="global">Theo bộ lọc chính</option>
                 <option value="this_month">Tháng này</option>
                 <option value="this_year">Năm nay</option>
               </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 border-b border-slate-100">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
                    Mảng dịch vụ / Sản phẩm {sortConfig.key === 'name' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                  </button>
                </th>
                <th className="px-6 py-5 border-b border-slate-100 text-center">
                  <button onClick={() => handleSort('count')} className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                    SL {sortConfig.key === 'count' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                  </button>
                </th>
                <th className="px-6 py-5 border-b border-slate-100 text-right">
                  <button onClick={() => handleSort('revenue')} className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                    Doanh số (Gross) {sortConfig.key === 'revenue' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                  </button>
                </th>
                <th className="px-6 py-5 border-b border-slate-100 text-right">
                  <button onClick={() => handleSort('actualPaid')} className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                    Thực thu (Net) {sortConfig.key === 'actualPaid' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                  </button>
                </th>
                <th className="px-6 py-5 border-b border-slate-100 text-right">
                  <button onClick={() => handleSort('remaining')} className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                    Còn nợ {sortConfig.key === 'remaining' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                  </button>
                </th>
                <th className="px-8 py-5 border-b border-slate-100 text-right">
                   <button onClick={() => handleSort('health')} className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-full hover:text-blue-600 transition-colors">
                    Sức khỏe nợ {sortConfig.key === 'health' && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedRankingData.map((item: any, idx) => (
                <tr key={item.name} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs" style={{backgroundColor: `${COLORS[idx % COLORS.length]}15`, color: COLORS[idx % COLORS.length]}}>
                        {item.name.charAt(0)}
                      </div>
                      <div className="font-black text-slate-800 text-sm line-clamp-1 max-w-[200px]">{item.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-slate-600">{item.count}</td>
                  <td className="px-6 py-5 text-right font-bold text-slate-900">{item.revenue.toLocaleString()}đ</td>
                  <td className="px-6 py-5 text-right font-black text-emerald-600">{item.actualPaid.toLocaleString()}đ</td>
                  <td className="px-6 py-5 text-right font-bold text-red-500">{item.remaining.toLocaleString()}đ</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex flex-col items-end">
                      <div className="text-xs font-black text-slate-900">{item.health}%</div>
                      <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-50">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${item.health > 80 ? 'bg-emerald-500' : item.health > 40 ? 'bg-blue-500' : 'bg-red-500'}`} 
                          style={{width: `${Math.min(100, item.health)}%`}}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedRankingData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-300">
                       <History size={48} className="opacity-20" />
                       <p className="font-medium">Chưa có dữ liệu xếp hạng trong kỳ này</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer / Summary */}
        <div className="bg-slate-50 p-6 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100">
           <div>Hiển thị {sortedRankingData.length} phân mục</div>
           <div className="flex gap-6">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Thu hồi tốt (&gt;80%)</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Cần đôn đốc (&lt;40%)</span>
           </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, color, compareValue, reverseGrowth, subtitle }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  const hasCompare = compareValue !== undefined;
  const currentVal = parseInt(value.replace(/\D/g,'')) || 0;
  const growth = hasCompare ? (compareValue === 0 ? 100 : Math.round(((currentVal - compareValue) / compareValue) * 100)) : 0;
  const isPositive = growth >= 0;
  const isGood = reverseGrowth ? !isPositive : isPositive;

  return (
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all group hover:shadow-2xl hover:scale-[1.02] relative overflow-hidden">
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className={`p-4 rounded-2xl ${colorMap[color]} group-hover:scale-110 transition-transform shadow-sm`}>
          <Icon size={24} />
        </div>
        {hasCompare && (
          <div className={`flex items-center gap-1 text-[9px] font-black px-3 py-1.5 rounded-full ${isGood ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {isPositive ? <ArrowUpCircle size={12}/> : <ArrowDownCircle size={12}/>}
            {Math.abs(growth)}% {isPositive ? 'Tăng' : 'Giảm'}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</h4>
        <div className="text-2xl font-black mt-2 text-slate-900 tracking-tight">{value}</div>
        <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">
          {hasCompare ? `Kỳ đối chứng: ${compareValue.toLocaleString()}đ` : subtitle}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
