
import React, { useState, useEffect } from 'react';
import { Book, Plus, Edit3, Trash2, Gavel, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { Rule, RuleViolation, Staff, SalaryPeriod, SalarySlip, SalaryItem } from '../types';
import { syncData, fetchRulesData, fetchSalaryData } from '../apiService';

interface Props {
  staff: Staff[];
  currentUser: Staff;
}

const RuleManager: React.FC<Props> = ({ staff, currentUser }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [salaryPeriods, setSalaryPeriods] = useState<SalaryPeriod[]>([]);
  const [loading, setLoading] = useState(false);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'violations'>('rules');

  const [editingRule, setEditingRule] = useState<Partial<Rule> | null>(null);
  const [newViolation, setNewViolation] = useState<Partial<RuleViolation>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0
  });

  const isAdmin = currentUser.username === 'admin' || currentUser.role === 'Giám đốc';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const rulesData = await fetchRulesData();
    const salaryData = await fetchSalaryData(); // Lấy kỳ lương để tự động trừ tiền
    setRules(rulesData.rules);
    setViolations(rulesData.violations);
    setSalaryPeriods(salaryData.periods);
    setLoading(false);
  };

  const handleSaveRule = async () => {
    if (!editingRule?.title || !editingRule?.code) return;
    const payload = { ...editingRule, id: editingRule.id || `rule-${Date.now()}` } as Rule;
    await syncData('rules', editingRule.id ? 'UPDATE' : 'CREATE', payload);
    setIsRuleModalOpen(false);
    loadData();
  };

  const handleDeleteRule = async (id: string) => {
    if (window.confirm("Xóa nội quy này?")) {
      await syncData('rules', 'DELETE', { id });
      loadData();
    }
  };

  const handleOpenViolation = (rule?: Rule) => {
    setNewViolation({
      date: new Date().toISOString().split('T')[0],
      ruleId: rule?.id || '',
      amount: rule?.penaltyAmount || 0,
      notes: ''
    });
    setIsViolationModalOpen(true);
  };

  const handleSaveViolation = async () => {
    if (!newViolation.staffId || !newViolation.ruleId) {
      alert("Chọn nhân viên và lỗi vi phạm.");
      return;
    }
    setLoading(true);
    try {
      const vId = `viol-${Date.now()}`;
      // 1. Lưu vi phạm
      await syncData('rule_violations', 'CREATE', { ...newViolation, id: vId, createdBy: currentUser.id });

      // 2. Tự động trừ lương (Logic quan trọng)
      const vDate = new Date(newViolation.date!);
      const period = salaryPeriods.find(p => p.month === vDate.getMonth() + 1 && p.year === vDate.getFullYear() && p.status === 'Open');
      
      if (period) {
        // Tìm phiếu lương nhân viên trong kỳ này, nếu chưa có thì tạo mới (Draft)
        let slipData = await fetchSalaryData(newViolation.staffId);
        let slip = slipData.slips.find(s => s.periodId === period.id);
        
        if (!slip) {
           const staffInfo = staff.find(s => s.id === newViolation.staffId);
           const slipId = `slip-${period.id}-${newViolation.staffId}`;
           slip = {
             id: slipId, periodId: period.id, staffId: newViolation.staffId!,
             totalIncome: staffInfo?.baseSalary || 0, totalDeduction: 0, netSalary: 0,
             status: 'Draft', notes: '', items: []
           };
           // Tạo Salary Slip + Item lương cứng
           await syncData('salary_slips', 'CREATE', slip);
           await syncData('salary_items', 'CREATE', {
              id: `item-hard-${slipId}`, slipId: slipId, type: 'HARD', name: 'Lương cứng', 
              amount: staffInfo?.baseSalary || 0, isDeduction: false
           });
        }

        // Tạo Item Phạt
        await syncData('salary_items', 'CREATE', {
           id: `item-pen-${vId}`, slipId: slip.id, type: 'PENALTY',
           name: `Phạt: ${rules.find(r => r.id === newViolation.ruleId)?.title}`,
           amount: newViolation.amount || 0, isDeduction: true, referenceId: vId
        });
        
        // Cập nhật lại tổng phiếu lương (Giả lập logic BE)
        const newDeduction = (slip.totalDeduction || 0) + (newViolation.amount || 0);
        await syncData('salary_slips', 'UPDATE', { 
           id: slip.id, 
           totalDeduction: newDeduction,
           netSalary: (slip.totalIncome || 0) - newDeduction
        });
      } else {
        alert("Lưu ý: Không tìm thấy kỳ lương MỞ cho tháng này. Khoản phạt đã lưu nhưng chưa trừ lương.");
      }

      setIsViolationModalOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Lỗi khi lưu vi phạm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Nội quy & Kỷ luật</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hệ thống ghi nhận và tự động trừ lương</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setActiveTab('rules')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${activeTab === 'rules' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Quy định</button>
           {isAdmin && <button onClick={() => setActiveTab('violations')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${activeTab === 'violations' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Sổ Phạt</button>}
        </div>
      </div>

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-between">
             <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/><input type="text" placeholder="Tìm..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none"/></div>
             {isAdmin && <button onClick={() => {setEditingRule({id:'', isActive:true, penaltyAmount:0}); setIsRuleModalOpen(true)}} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg"><Plus size={16}/> Thêm</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map(rule => (
              <div key={rule.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:border-blue-300 transition-all">
                 <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><span className="text-blue-600">{rule.code}</span> {rule.title}</h3>
                    {isAdmin && <div className="flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={() => {setEditingRule(rule); setIsRuleModalOpen(true)}} className="p-2 text-blue-500"><Edit3 size={16}/></button><button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-red-500"><Trash2 size={16}/></button></div>}
                 </div>
                 <p className="text-sm text-slate-600 mb-4">{rule.content}</p>
                 <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                    <div className="text-xs font-black text-red-500 uppercase">Phạt: {rule.penaltyAmount.toLocaleString()}đ</div>
                    {isAdmin && <button onClick={() => handleOpenViolation(rule)} className="flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Gavel size={12}/> Phạt</button>}
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                 <tr><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Ngày</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Nhân viên</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Lỗi</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Phạt</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {violations.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50">
                       <td className="px-6 py-4 text-sm font-bold text-slate-600">{v.date}</td>
                       <td className="px-6 py-4 font-bold text-slate-900">{v.staffName}</td>
                       <td className="px-6 py-4 text-sm">{v.ruleTitle} <div className="text-xs text-slate-400">{v.notes}</div></td>
                       <td className="px-6 py-4 text-right font-black text-red-500">-{v.amount.toLocaleString()}đ</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* Modal Add Rule */}
      {isRuleModalOpen && editingRule && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="font-bold text-lg">Cấu hình Nội quy</h3>
              <input className="w-full p-2 border rounded" placeholder="Mã (NQ-01)" value={editingRule.code} onChange={e=>setEditingRule({...editingRule, code:e.target.value})} />
              <input className="w-full p-2 border rounded" placeholder="Tiêu đề" value={editingRule.title} onChange={e=>setEditingRule({...editingRule, title:e.target.value})} />
              <textarea className="w-full p-2 border rounded" placeholder="Nội dung" value={editingRule.content} onChange={e=>setEditingRule({...editingRule, content:e.target.value})} />
              <input type="number" className="w-full p-2 border rounded" placeholder="Mức phạt" value={editingRule.penaltyAmount} onChange={e=>setEditingRule({...editingRule, penaltyAmount:Number(e.target.value)})} />
              <div className="flex gap-2 justify-end">
                 <button onClick={()=>setIsRuleModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Hủy</button>
                 <button onClick={handleSaveRule} className="px-4 py-2 bg-blue-600 text-white rounded">Lưu</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Violation */}
      {isViolationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-2 text-red-600 font-bold"><AlertTriangle/> Ghi nhận Vi phạm</div>
              <select className="w-full p-2 border rounded" value={newViolation.staffId} onChange={e=>setNewViolation({...newViolation, staffId:e.target.value})}>
                 <option value="">-- Chọn nhân viên --</option>
                 {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="w-full p-2 border rounded" value={newViolation.ruleId} onChange={e=>{
                 const r = rules.find(ru=>ru.id===e.target.value);
                 setNewViolation({...newViolation, ruleId:e.target.value, amount:r?.penaltyAmount});
              }}>
                 <option value="">-- Chọn lỗi --</option>
                 {rules.map(r=><option key={r.id} value={r.id}>{r.code} - {r.title}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                 <input type="date" className="p-2 border rounded" value={newViolation.date} onChange={e=>setNewViolation({...newViolation, date:e.target.value})} />
                 <input type="number" className="p-2 border rounded text-red-600 font-bold" value={newViolation.amount} onChange={e=>setNewViolation({...newViolation, amount:Number(e.target.value)})} />
              </div>
              <input className="w-full p-2 border rounded" placeholder="Ghi chú thêm" value={newViolation.notes} onChange={e=>setNewViolation({...newViolation, notes:e.target.value})} />
              <div className="flex gap-2 justify-end pt-2">
                 <button onClick={()=>setIsViolationModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Hủy</button>
                 <button onClick={handleSaveViolation} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin"/>} Phạt & Trừ lương</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
export default RuleManager;
