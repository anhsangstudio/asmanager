import React, { useState } from 'react';
import { User, Plus, Edit3, Trash2, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { Staff, Schedule, STAFF_ROLES } from '../types';
import { syncData } from '../apiService';

interface Props {
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  schedules: Schedule[];
  currentUser?: Staff | null;
}

const initialForm: Partial<Staff> = {
  code: '',
  name: '',
  role: 'Nhiếp ảnh gia',
  phone: '',
  email: '',
  baseSalary: 0,
  status: 'Active',
  username: '',
  password: '',
  startDate: '',
  notes: ''
};

const StaffManager: React.FC<Props> = ({ staff, setStaff, schedules, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Staff>>(initialForm);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.username === 'admin' || currentUser?.role === 'Giám đốc';
  const perms = currentUser?.permissions?.['staff']?.['list'] || { view: false, add: false, edit: false, delete: false };
  const canAdd = isAdmin || perms.add;
  const canEdit = isAdmin || perms.edit;
  const canDelete = isAdmin || perms.delete;

  const handleOpenAdd = () => {
    if (!canAdd) return;
    setEditingStaffId(null);
    setForm({
      ...initialForm,
      code: `NV${(staff.length + 1).toString().padStart(3, '0')}`,
      startDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Staff) => {
    setEditingStaffId(s.id);
    setForm({ ...s });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (editingStaffId && !canEdit) {
        alert("Không có quyền sửa.");
        return;
    }
    if (!editingStaffId && !canAdd) {
        alert("Không có quyền thêm.");
        return;
    }

    setIsSaving(true);
    try {
      const payload = { ...form, id: form.id || `staff-${Date.now()}` } as Staff;
      const action = editingStaffId ? 'UPDATE' : 'CREATE';
      const result = await syncData('staff', action, payload);

      if (result.success) {
         if (action === 'CREATE') {
            setStaff(prev => [...prev, result.data]);
         } else {
            setStaff(prev => prev.map(s => s.id === result.data.id ? result.data : s));
         }
         setIsModalOpen(false);
      }
    } catch (e) {
       console.error(e);
       alert("Lỗi khi lưu nhân viên");
    } finally {
       setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
        alert("Không có quyền xóa.");
        return;
    }
    if (window.confirm("Xác nhận xóa nhân viên này?")) {
      await syncData('staff', 'DELETE', { id });
      setStaff(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Đội ngũ Nhân sự</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Quản lý nhân sự và đồng bộ Cloud thời gian thực</p>
        </div>
        {canAdd && (
            <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95"
            >
            <Plus size={18} /> Thêm nhân viên
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:border-blue-300 transition-all group relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenEdit(s)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={16}/></button>
                {canDelete && <button onClick={() => handleDelete(s.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>}
              </div>

              <div className="flex items-center gap-4 mb-4">
                 <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-400">
                    {s.name.charAt(0)}
                 </div>
                 <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.code}</div>
                    <h3 className="font-bold text-slate-900">{s.name}</h3>
                    <div className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg inline-block mt-1">{s.role}</div>
                 </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 border-t border-slate-50 pt-4">
                 <div className="flex justify-between"><span>Lương cứng:</span> <span className="font-bold">{s.baseSalary.toLocaleString()}đ</span></div>
                 <div className="flex justify-between"><span>Ngày vào:</span> <span>{s.startDate}</span></div>
                 <div className="flex justify-between"><span>Trạng thái:</span> <span className={s.status === 'Active' ? 'text-emerald-600 font-bold' : 'text-red-500'}>{s.status}</span></div>
              </div>
            </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl p-10 shadow-2xl space-y-8 my-auto animate-in zoom-in-95">
             <h2 className="text-2xl font-black uppercase text-slate-900">{editingStaffId ? 'Cập nhật Nhân sự' : 'Thêm Nhân sự Mới'}</h2>

             <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 ${(editingStaffId && !canEdit) ? 'pointer-events-none opacity-80' : ''}`}>
               <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2">Thông tin cá nhân</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <input placeholder="Mã NV" className="p-3 border rounded-xl" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} />
                     <input placeholder="Họ tên" className="p-3 border rounded-xl" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
                  </div>
                  <input placeholder="Số điện thoại" className="w-full p-3 border rounded-xl" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
                  <input placeholder="Email" className="w-full p-3 border rounded-xl" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
                  <select className="w-full p-3 border rounded-xl" value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
                     {STAFF_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
               </div>
               
               <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2">Cấu hình hệ thống</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <input placeholder="Username" className="p-3 border rounded-xl" value={form.username} onChange={e=>setForm({...form, username:e.target.value})} />
                     <input placeholder="Password" type="password" className="p-3 border rounded-xl" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs text-slate-500">Lương cứng</label>
                        <input type="number" className="w-full p-3 border rounded-xl font-bold" value={form.baseSalary} onChange={e=>setForm({...form, baseSalary:Number(e.target.value)})} />
                     </div>
                     <div>
                        <label className="text-xs text-slate-500">Ngày vào làm</label>
                        <input type="date" className="w-full p-3 border rounded-xl" value={form.startDate} onChange={e=>setForm({...form, startDate:e.target.value})} />
                     </div>
                  </div>
                  <select className="w-full p-3 border rounded-xl" value={form.status} onChange={e=>setForm({...form, status:e.target.value as any})}>
                     <option value="Active">Đang làm việc</option>
                     <option value="Inactive">Đã nghỉ việc</option>
                  </select>
               </div>
             </div>

            <div className="pt-6 flex gap-4 border-t border-slate-50">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">Hủy bỏ</button>
               {((!editingStaffId && canAdd) || (editingStaffId && canEdit)) && (
                   <button 
                      onClick={handleSave} 
                      disabled={isSaving}
                      className="flex-[2] py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-300"
                   >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} 
                      {isSaving ? 'Đang đồng bộ Cloud...' : 'Lưu thông tin nhân sự'}
                   </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;