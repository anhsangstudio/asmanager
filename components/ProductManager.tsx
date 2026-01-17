import React, { useState } from 'react';
import { Package, Plus, Edit3, Trash2, CheckCircle2, Loader2, DollarSign } from 'lucide-react';
import { Service, ServiceType, Staff } from '../types';
import { syncData } from '../apiService';

interface Props {
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  currentUser?: Staff | null;
}

const initialServiceState: Service = {
  ma_dv: '',
  ten_dv: '',
  nhom_dv: ServiceType.RETAIL_SERVICE,
  chi_tiet_dv: '',
  don_gia: 0,
  don_vi_tinh: 'Lần',
  nhan: '',
  // Default costs
  hoa_hong_pct: 0,
  chi_phi_cong_chup: 0,
  chi_phi_makeup: 0,
  chi_phi_nv_ho_tro: 0,
  chi_phi_thu_vay: 0,
  chi_phi_photoshop: 0,
  chi_phi_in_an: 0,
  chi_phi_ship: 0,
  chi_phi_an_trua: 0,
  chi_phi_lam_toc: 0,
  chi_phi_bao_bi: 0,
  chi_phi_giat_phoi: 0,
  chi_phi_khau_hao: 0,
};

const ProductManager: React.FC<Props> = ({ services, setServices, departments, setDepartments, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service & { ma_dv_original?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const isAdmin = currentUser?.username === 'admin' || currentUser?.role === 'Giám đốc';
  const perms = currentUser?.permissions?.['products']?.['list'] || { view: false, add: false, edit: false, delete: false };
  const canAdd = isAdmin || perms.add;
  const canEdit = isAdmin || perms.edit;
  const canDelete = isAdmin || perms.delete;

  const handleOpenAdd = () => {
    if (!canAdd) return;
    setEditingService(initialServiceState);
    setCodeError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService({ ...service, ma_dv_original: service.ma_dv });
    setCodeError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingService) return;
    const isUpdate = !!editingService.ma_dv_original;
    if (isUpdate && !canEdit) {
        alert("Không có quyền chỉnh sửa.");
        return;
    }
    if (!isUpdate && !canAdd) {
        alert("Không có quyền thêm mới.");
        return;
    }

    setIsSaving(true);
    try {
      const action = isUpdate ? 'UPDATE' : 'CREATE';
      const result = await syncData('services', action, editingService);

      if (result.success) {
        if (action === 'CREATE') {
          setServices(prev => [...prev, result.data]);
        } else {
          setServices(prev => prev.map(s => s.ma_dv === editingService.ma_dv_original ? result.data : s));
        }
        setIsModalOpen(false);
      } else {
        alert("Lỗi khi lưu dịch vụ.");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi hệ thống.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ma_dv: string) => {
    if (!canDelete) {
        alert("Không có quyền xóa.");
        return;
    }
    if (window.confirm("Xóa dịch vụ này?")) {
      await syncData('services', 'DELETE', { ma_dv });
      setServices(prev => prev.filter(s => s.ma_dv !== ma_dv));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Danh mục Dịch vụ</h2>
          <p className="text-slate-500 font-medium">Quản lý dịch vụ Studio qua Supabase Cloud</p>
        </div>
        {canAdd && (
            <button 
            onClick={handleOpenAdd}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
            <Plus size={22} /> Thêm dịch vụ mới
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {services.map(s => (
          <div key={s.ma_dv} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group flex flex-col justify-between overflow-hidden relative">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <Package size={24} />
                </div>
                {canDelete && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(s.ma_dv); }} className="p-2 text-slate-300 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                )}
              </div>
              
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{s.ma_dv}</span>
                <h3 className="text-lg font-black text-slate-900 leading-tight mt-1 line-clamp-2 min-h-[3rem]">{s.ten_dv}</h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 h-8">{s.chi_tiet_dv || 'Chưa có mô tả chi tiết'}</p>
              </div>

              <div className="flex items-end gap-1">
                 <span className="text-2xl font-black text-blue-600">{s.don_gia.toLocaleString()}</span>
                 <span className="text-xs font-bold text-slate-400 mb-1.5">đ / {s.don_vi_tinh}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 space-y-4">
              <div className="flex justify-between items-center text-xs">
                 <span className="font-bold text-slate-400">Nhóm:</span>
                 <span className="font-bold text-slate-700">{s.nhom_dv}</span>
              </div>
              <button 
                onClick={() => handleOpenEdit(s)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
              >
                {canEdit ? 'Chỉnh sửa chi tiết' : 'Xem chi tiết'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 flex flex-col max-h-[95vh]">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white z-10">
               <h2 className="text-2xl font-black uppercase text-slate-900">{editingService.ma_dv_original ? 'Cập nhật Dịch vụ' : 'Thêm Dịch vụ Mới'}</h2>
               {editingService.ma_dv_original && !canEdit && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Read Only</span>}
            </div>

            <div className="p-8 overflow-y-auto space-y-10 scrollbar-hide relative">
              {/* Disable inputs if view only */}
              {editingService.ma_dv_original && !canEdit && <div className="absolute inset-0 z-10 bg-white/10 cursor-not-allowed"></div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <h3 className="font-black text-slate-900 uppercase text-sm border-b border-slate-100 pb-2">Thông tin cơ bản</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Mã Dịch vụ</label>
                          <input className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border border-slate-200" value={editingService.ma_dv} onChange={e=>setEditingService({...editingService, ma_dv: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Nhóm</label>
                          <select className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border border-slate-200" value={editingService.nhom_dv} onChange={e=>setEditingService({...editingService, nhom_dv: e.target.value})}>
                             {Object.values(ServiceType).map(t=><option key={t} value={t}>{t}</option>)}
                          </select>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase">Tên dịch vụ</label>
                       <input className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border border-slate-200" value={editingService.ten_dv} onChange={e=>setEditingService({...editingService, ten_dv: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Đơn giá bán</label>
                          <input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border border-slate-200 text-blue-600" value={editingService.don_gia} onChange={e=>setEditingService({...editingService, don_gia: Number(e.target.value)})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Đơn vị tính</label>
                          <input className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border border-slate-200" value={editingService.don_vi_tinh} onChange={e=>setEditingService({...editingService, don_vi_tinh: e.target.value})} />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase">Mô tả chi tiết</label>
                       <textarea className="w-full p-3 bg-slate-50 rounded-xl font-medium outline-none border border-slate-200 h-32" value={editingService.chi_tiet_dv} onChange={e=>setEditingService({...editingService, chi_tiet_dv: e.target.value})} />
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h3 className="font-black text-slate-900 uppercase text-sm border-b border-slate-100 pb-2 flex justify-between">
                       <span>Cấu trúc chi phí (Costing)</span>
                       <span className="text-emerald-600">Lãi ước tính: {(editingService.don_gia - (editingService.chi_phi_cong_chup || 0) - (editingService.chi_phi_makeup || 0) - (editingService.chi_phi_photoshop || 0) - (editingService.chi_phi_in_an || 0)).toLocaleString()}đ</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Công chụp</label>
                          <input type="number" className="w-full p-2 bg-slate-50 rounded-lg text-sm font-bold" value={editingService.chi_phi_cong_chup} onChange={e=>setEditingService({...editingService, chi_phi_cong_chup: Number(e.target.value)})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Makeup</label>
                          <input type="number" className="w-full p-2 bg-slate-50 rounded-lg text-sm font-bold" value={editingService.chi_phi_makeup} onChange={e=>setEditingService({...editingService, chi_phi_makeup: Number(e.target.value)})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Photoshop / Editor</label>
                          <input type="number" className="w-full p-2 bg-slate-50 rounded-lg text-sm font-bold" value={editingService.chi_phi_photoshop} onChange={e=>setEditingService({...editingService, chi_phi_photoshop: Number(e.target.value)})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">In ấn (Lab)</label>
                          <input type="number" className="w-full p-2 bg-slate-50 rounded-lg text-sm font-bold" value={editingService.chi_phi_in_an} onChange={e=>setEditingService({...editingService, chi_phi_in_an: Number(e.target.value)})} />
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-50 flex items-center justify-end gap-6 bg-white sticky bottom-0 z-10">
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900">Hủy bỏ</button>
              
              {( (editingService.ma_dv_original && canEdit) || (!editingService.ma_dv_original && canAdd) ) && (
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-14 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-[1.25rem] shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-400"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {editingService.ma_dv_original ? 'Cập nhật Dịch vụ' : 'Lưu Dịch vụ mới'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;