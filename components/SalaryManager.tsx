
import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Unlock, Lock, ChevronRight, FileText } from 'lucide-react';
import { Staff, SalaryPeriod, SalarySlip, SalaryItem } from '../types';
import { fetchSalaryData, syncData } from '../apiService';

interface Props {
  staff: Staff[];
  currentUser: Staff;
}

const SalaryManager: React.FC<Props> = ({ staff, currentUser }) => {
  const [periods, setPeriods] = useState<SalaryPeriod[]>([]);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<SalaryPeriod | null>(null);
  const [viewMode, setViewMode] = useState<'periods' | 'slips' | 'detail'>('periods');
  const [selectedSlip, setSelectedSlip] = useState<SalarySlip | null>(null);
  
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState<Partial<SalaryPeriod>>({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), status: 'Open' });

  const isAdmin = currentUser.username === 'admin' || currentUser.role === 'Giám đốc';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    // Nếu không phải admin, chỉ fetch lương của chính mình (Logic đã có trong apiService nhưng cần filter id)
    const staffIdFilter = isAdmin ? undefined : currentUser.id;
    const data = await fetchSalaryData(staffIdFilter);
    setPeriods(data.periods);
    setSlips(data.slips);
    if (data.periods.length > 0 && !selectedPeriod) setSelectedPeriod(data.periods[0]);
  };

  const handleCreatePeriod = async () => {
    if (!newPeriod.month || !newPeriod.year) return;
    const start = new Date(newPeriod.year, newPeriod.month - 1, 1);
    const end = new Date(newPeriod.year, newPeriod.month, 0);
    const payload = { ...newPeriod, id: `period-${newPeriod.month}-${newPeriod.year}`, name: `Tháng ${newPeriod.month}/${newPeriod.year}`, startDate: start.toISOString(), endDate: end.toISOString() } as SalaryPeriod;
    await syncData('salary_periods', 'CREATE', payload);
    setIsPeriodModalOpen(false);
    loadData();
  };

  const handleGenerateSlips = async () => {
    if (!selectedPeriod || !window.confirm("Tạo phiếu lương cho tất cả nhân viên?")) return;
    for (const s of staff.filter(s => s.status === 'Active')) {
       if (!slips.find(sl => sl.periodId === selectedPeriod.id && sl.staffId === s.id)) {
          const sId = `slip-${selectedPeriod.id}-${s.id}`;
          await syncData('salary_slips', 'CREATE', { id: sId, periodId: selectedPeriod.id, staffId: s.id, totalIncome: s.baseSalary, totalDeduction: 0, netSalary: s.baseSalary, status: 'Draft' });
          await syncData('salary_items', 'CREATE', { id: `ib-${sId}`, slipId: sId, type: 'HARD', name: 'Lương cứng', amount: s.baseSalary, isDeduction: false });
       }
    }
    loadData();
  };

  const filteredSlips = slips.filter(s => selectedPeriod ? s.periodId === selectedPeriod.id : true);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div><h2 className="text-xl font-black text-slate-900 uppercase">Lương & Thưởng</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAdmin ? 'Quản lý kỳ lương' : 'Phiếu lương cá nhân'}</p></div>
        {isAdmin && <button onClick={() => setIsPeriodModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg"><Calendar size={16}/> Kỳ lương mới</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase px-2">Kỳ lương</h3>
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
               {periods.map(p => (
                  <button key={p.id} onClick={() => { setSelectedPeriod(p); setViewMode('slips'); setSelectedSlip(null); }} className={`w-full text-left p-5 border-b border-slate-50 hover:bg-slate-50 ${selectedPeriod?.id === p.id ? 'bg-blue-50' : ''}`}>
                     <div className="flex justify-between font-bold text-sm text-slate-800"><span>{p.name}</span> {p.status === 'Open' ? <Unlock size={14} className="text-emerald-500"/> : <Lock size={14}/>}</div>
                  </button>
               ))}
            </div>
         </div>

         <div className="lg:col-span-3 space-y-6">
            {viewMode === 'slips' && selectedPeriod && (
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Danh sách phiếu ({filteredSlips.length})</h3>
                    {isAdmin && selectedPeriod.status === 'Open' && <button onClick={handleGenerateSlips} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">Khởi tạo phiếu lương</button>}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSlips.map(slip => (
                       <div key={slip.id} onClick={() => { setSelectedSlip(slip); setViewMode('detail'); }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-all">
                          <div className="flex justify-between mb-4"><div className="font-black text-slate-900">{slip.staffName}</div><span className="text-[10px] bg-slate-100 px-2 py-1 rounded">{slip.status}</span></div>
                          <div className="flex justify-between items-end border-t pt-4"><div><div className="text-[10px] text-slate-400 uppercase">Thực lĩnh</div><div className="text-2xl font-black text-blue-600">{slip.netSalary.toLocaleString()}đ</div></div><ChevronRight className="text-slate-300"/></div>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {viewMode === 'detail' && selectedSlip && (
               <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95">
                  <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
                     <div><button onClick={() => setViewMode('slips')} className="text-xs font-bold text-slate-400 mb-2">← Quay lại</button><h2 className="text-3xl font-black">{selectedSlip.staffName}</h2><p className="text-sm opacity-70">{selectedPeriod?.name}</p></div>
                     <div className="text-right"><div className="text-xs uppercase opacity-70">Thực lĩnh</div><div className="text-4xl font-black">{selectedSlip.netSalary.toLocaleString()}đ</div></div>
                  </div>
                  <div className="p-8 space-y-6">
                     <div>
                        <h4 className="font-bold text-emerald-600 uppercase text-xs mb-3 border-b pb-2 flex gap-2"><DollarSign size={14}/> Thu nhập</h4>
                        {selectedSlip.items.filter(i=>!i.isDeduction).map(i=>(<div key={i.id} className="flex justify-between p-3 bg-slate-50 rounded-xl mb-2"><span className="font-bold text-slate-700">{i.name} <span className="text-[10px] text-slate-400 ml-2 uppercase">{i.type}</span></span><span className="font-black text-emerald-600">+{i.amount.toLocaleString()}</span></div>))}
                     </div>
                     <div>
                        <h4 className="font-bold text-red-600 uppercase text-xs mb-3 border-b pb-2 flex gap-2"><DollarSign size={14}/> Khấu trừ</h4>
                        {selectedSlip.items.filter(i=>i.isDeduction).map(i=>(<div key={i.id} className="flex justify-between p-3 bg-red-50 rounded-xl mb-2"><span className="font-bold text-slate-700">{i.name}</span><span className="font-black text-red-600">-{i.amount.toLocaleString()}</span></div>))}
                        {selectedSlip.items.filter(i=>i.isDeduction).length === 0 && <p className="text-sm italic text-slate-400">Không có khấu trừ</p>}
                     </div>
                  </div>
               </div>
            )}
         </div>
      </div>

      {isPeriodModalOpen && (
         <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
               <h3 className="font-bold">Tạo kỳ lương</h3>
               <div className="grid grid-cols-2 gap-2"><input type="number" className="p-2 border rounded" value={newPeriod.month} onChange={e=>setNewPeriod({...newPeriod, month:Number(e.target.value)})} /><input type="number" className="p-2 border rounded" value={newPeriod.year} onChange={e=>setNewPeriod({...newPeriod, year:Number(e.target.value)})} /></div>
               <div className="flex gap-2 justify-end"><button onClick={()=>setIsPeriodModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Hủy</button><button onClick={handleCreatePeriod} className="px-4 py-2 bg-blue-600 text-white rounded">Tạo</button></div>
            </div>
         </div>
      )}
    </div>
  );
};
export default SalaryManager;
