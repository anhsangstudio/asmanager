
import React, { useState } from 'react';
import { User, Plus, Edit3, Trash2, CheckCircle2, Loader2, Calendar, Shield, Lock, Key } from 'lucide-react';
import { Staff, Schedule, STAFF_ROLES, ModulePermission } from '../types';
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
  notes: '',
  permissions: {} // Initialize permissions
};

// Cấu trúc mặc định để generate UI phân quyền
const MODULES_CONFIG = [
  { id: 'contracts', label: 'Hợp đồng', subs: ['list', 'create'] },
  { id: 'finance', label: 'Tài chính', subs: ['income', 'expense'] },
  { id: 'schedules', label: 'Lịch làm việc', subs: ['main'] },
  { id: 'products', label: 'Dịch vụ', subs: ['list'] },
  { id: 'staff', label: 'Nhân sự', subs: ['list'] },
  { id: 'settings', label: 'Cấu hình', subs: ['info'] },
];

const StaffManager: React.FC<Props> = ({ staff, setStaff, schedules, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Staff>>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [modalTab, setModalTab] = useState<'info' | 'permissions'>('info');

  // --- STRICT PERMISSION LOGIC ---
  // Chỉ Admin (username='admin') hoặc Giám đốc mới có quyền thay đổi dữ liệu
  const isSuperUser = currentUser?.username === 'admin' || currentUser?.role === 'Giám đốc';
  
  // Quyền xem: SuperUser hoặc có quyền view trong cấu hình
  const canView = isSuperUser || currentUser?.permissions?.['staff']?.['list']?.view;
  
  // Quyền tác động: CHỈ DÀNH CHO SUPERUSER (Theo yêu cầu mới)
  const canAdd = isSuperUser;
  const canEdit = isSuperUser;
  const canDelete = isSuperUser;
  const canAssignPermissions = isSuperUser;

  const handleOpenAdd = () => {
    if (!canAdd) return;
    setEditingStaffId(null);
    setForm({
      ...initialForm,
      code: `NV${(staff.length + 1).toString().padStart(3, '0')}`,
      startDate: new Date().toISOString().split('T')[0],
      permissions: {}
    });
    setModalTab('info');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Staff) => {
    // Nếu không có quyền sửa, không làm gì cả (ẩn nút rồi nhưng chặn thêm ở đây)
    if (!canEdit) return; 

    setEditingStaffId(s.id);
    setForm({ ...s }); // Copy toàn bộ data bao gồm permissions
    setModalTab('info');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!canAdd && !editingStaffId) return;
    if (!canEdit && editingStaffId) return;

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
    if (!canDelete) return;
    if (window.confirm("Xác nhận xóa nhân viên này?")) {
      await syncData('staff', 'DELETE', { id });
      setStaff(prev => prev.filter(s => s.id !== id));
    }
  };

  // Helper để update permission state
  const togglePermission = (moduleId: string, subId: string, type: keyof ModulePermission) => {
    setForm(prev => {
      const currentPerms = prev.permissions || {};
      const modulePerms = currentPerms[moduleId] || {};
      const subPerms = modulePerms[subId] || { view: false, add: false, edit: false, delete: false, ownOnly: false };

      return {
        ...prev,
        permissions: {
          ...currentPerms,
          [moduleId]: {
            ...modulePerms,
            [subId]: {
              ...subPerms,
              [type]: !subPerms[type]
            }
          }
        }
      };
    });
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Lock size={48} className="mb-4 text-slate-300" />
        <p className="font-bold uppercase tracking-widest">Bạn không có quyền truy cập module này</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Đội ngũ Nhân sự</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {canEdit ? 'Quản lý toàn quyền (Admin/Giám đốc)' : 'Danh sách nhân sự (Chế độ xem)'}
          </p>
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
              {/* Chỉ hiển thị nút sửa/xóa nếu có quyền */}
              {(canEdit || canDelete) && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {canEdit && <button onClick={() => handleOpenEdit(s)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={16}/></button>}
                  {canDelete && <button onClick={() => handleDelete(s.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>}
                </div>
              )}

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
                 <div className="flex justify-between"><span>Số điện thoại:</span> <span className="font-bold">{s.phone}</span></div>
                 <div className="flex justify-between"><span>Email:</span> <span className="font-bold">{s.email}</span></div>
                 {/* Chỉ Admin/Giám đốc mới thấy lương */}
                 {isSuperUser && <div className="flex justify-between"><span>Lương cứng:</span> <span className="font-bold">{s.baseSalary.toLocaleString()}đ</span></div>}
                 <div className="flex justify-between"><span>Trạng thái:</span> <span className={s.status === 'Active' ? 'text-emerald-600 font-bold' : 'text-red-500'}>{s.status}</span></div>
              </div>
            </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl p-10 shadow-2xl space-y-8 my-auto animate-in zoom-in-95 flex flex-col max-h-[90vh]">
             
             <div className="flex justify-between items-start">
               <div>
                  <h2 className="text-2xl font-black uppercase text-slate-900">{editingStaffId ? 'Cập nhật Nhân sự' : 'Thêm Nhân sự Mới'}</h2>
                  <p className="text-xs text-slate-400 mt-1">Chỉ Admin và Giám đốc có quyền chỉnh sửa thông tin này.</p>
               </div>
               {/* Tab Switcher */}
               <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => setModalTab('info')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${modalTab === 'info' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Thông tin</button>
                 {canAssignPermissions && <button onClick={() => setModalTab('permissions')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2 ${modalTab === 'permissions' ? 'bg-white shadow text-purple-600' : 'text-slate-400'}`}><Shield size={12}/> Phân quyền</button>}
               </div>
             </div>

             <div className="overflow-y-auto scrollbar-hide pr-2 flex-1">
               {modalTab === 'info' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <h3 className="font-bold border-b pb-2 flex items-center gap-2"><User size={16}/> Thông tin cá nhân</h3>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase">Mã NV</label>
                           <input className="w-full p-3 border rounded-xl font-bold" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase">Họ tên</label>
                           <input className="w-full p-3 border rounded-xl font-bold" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
                         </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Số điện thoại</label>
                         <input className="w-full p-3 border rounded-xl" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                         <input className="w-full p-3 border rounded-xl" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Chức vụ</label>
                         <select className="w-full p-3 border rounded-xl font-bold" value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
                            {STAFF_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                         </select>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <h3 className="font-bold border-b pb-2 flex items-center gap-2"><Key size={16}/> Tài khoản & Lương</h3>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Username</label>
                            <input className="w-full p-3 border rounded-xl font-bold text-slate-600" value={form.username} onChange={e=>setForm({...form, username:e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                            <input type="password" className="w-full p-3 border rounded-xl font-bold text-slate-600" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Lương cứng</label>
                            <input type="number" className="w-full p-3 border rounded-xl font-bold text-emerald-600" value={form.baseSalary} onChange={e=>setForm({...form, baseSalary:Number(e.target.value)})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Ngày vào làm</label>
                            <input type="date" className="w-full p-3 border rounded-xl" value={form.startDate} onChange={e=>setForm({...form, startDate:e.target.value})} />
                         </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái làm việc</label>
                         <select className="w-full p-3 border rounded-xl font-bold" value={form.status} onChange={e=>setForm({...form, status:e.target.value as any})}>
                            <option value="Active">Đang làm việc</option>
                            <option value="Inactive">Đã nghỉ việc</option>
                         </select>
                      </div>
                   </div>
                 </div>
               )}

               {modalTab === 'permissions' && canAssignPermissions && (
                 <div className="space-y-6">
                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-start gap-3">
                       <Shield className="text-purple-600 mt-1" size={20} />
                       <div>
                          <h3 className="font-bold text-purple-900 text-sm">Cấp quyền truy cập Module</h3>
                          <p className="text-xs text-purple-700 mt-1">Chọn các hành động mà nhân viên này được phép thực hiện trên từng phân hệ. Mặc định là không có quyền.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {MODULES_CONFIG.map(mod => (
                          <div key={mod.id} className="border border-slate-200 rounded-2xl p-4 space-y-3">
                             <div className="font-black uppercase text-xs text-slate-500 tracking-widest border-b pb-2">{mod.label}</div>
                             {mod.subs.map(sub => {
                                const p = form.permissions?.[mod.id]?.[sub] || { view: false, add: false, edit: false, delete: false };
                                return (
                                   <div key={sub} className="flex flex-col gap-2">
                                      <div className="text-sm font-bold text-slate-800 capitalize">{sub === 'list' || sub === 'main' ? 'Quyền truy cập chung' : sub}</div>
                                      <div className="flex flex-wrap gap-2">
                                         {['view', 'add', 'edit', 'delete'].map(action => (
                                            <label key={action} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase cursor-pointer transition-all border ${
                                               p[action as keyof ModulePermission] 
                                               ? 'bg-blue-600 text-white border-blue-600' 
                                               : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-blue-300'
                                            }`}>
                                               <input 
                                                  type="checkbox" 
                                                  className="hidden" 
                                                  checked={!!p[action as keyof ModulePermission]} 
                                                  onChange={() => togglePermission(mod.id, sub, action as keyof ModulePermission)} 
                                               />
                                               {action === 'view' ? 'Xem' : action === 'add' ? 'Thêm' : action === 'edit' ? 'Sửa' : 'Xóa'}
                                            </label>
                                         ))}
                                      </div>
                                   </div>
                                );
                             })}
                          </div>
                       ))}
                    </div>
                 </div>
               )}
             </div>

            <div className="pt-6 flex gap-4 border-t border-slate-50">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">Hủy bỏ</button>
               <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-300"
               >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} 
                  {isSaving ? 'Đang đồng bộ...' : 'Lưu thông tin nhân sự'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;
