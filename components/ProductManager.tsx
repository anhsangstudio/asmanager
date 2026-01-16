
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, Plus, X, Trash2, Info, DollarSign, 
  ShieldCheck, AlignLeft, Loader2, CheckCircle2, Percent, AlertTriangle
} from 'lucide-react';
import { Service, ServiceType } from '../types';
import { syncData, checkServiceCodeExists, getNextServiceCode } from '../apiService';

interface Props {
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
}

const ProductManager: React.FC<Props> = ({ services, setServices, departments, setDepartments }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // @google/genai fix: Added ma_dv_original to tracking state to identify edit mode and avoid TypeScript error
  const [editingService, setEditingService] = useState<(Partial<Service> & { ma_dv_original?: string }) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const initialServiceState: Partial<Service> = {
    ma_dv: '',
    ten_dv: '',
    nhom_dv: ServiceType.WEDDING_PHOTO,
    chi_tiet_dv: '',
    don_gia: 0,
    don_vi_tinh: 'Gói',
    nhan: '-',
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
    chi_phi_khau_hao: 0
  };

  const profitAnalysis = useMemo(() => {
    if (!editingService) return { hoa_hong_tien: 0, tong_chi_phi: 0, loi_nhuan_gop: 0 };
    const don_gia = Number(editingService.don_gia) || 0;
    const hoa_hong_pct = Number(editingService.hoa_hong_pct) || 0;
    const hoa_hong_tien = Math.round(don_gia * (hoa_hong_pct / 100));
    const chiphi_codinh = 
      (Number(editingService.chi_phi_cong_chup) || 0) +
      (Number(editingService.chi_phi_makeup) || 0) +
      (Number(editingService.chi_phi_nv_ho_tro) || 0) +
      (Number(editingService.chi_phi_thu_vay) || 0) +
      (Number(editingService.chi_phi_photoshop) || 0) +
      (Number(editingService.chi_phi_in_an) || 0) +
      (Number(editingService.chi_phi_ship) || 0) +
      (Number(editingService.chi_phi_an_trua) || 0) +
      (Number(editingService.chi_phi_lam_toc) || 0) +
      (Number(editingService.chi_phi_bao_bi) || 0) +
      (Number(editingService.chi_phi_giat_phoi) || 0) +
      (Number(editingService.chi_phi_khau_hao) || 0);
    const tong_chi_phi = hoa_hong_tien + chiphi_codinh;
    const loi_nhuan_gop = don_gia - tong_chi_phi;
    return { hoa_hong_tien, tong_chi_phi, loi_nhuan_gop };
  }, [editingService]);

  // Chuẩn hóa mã dịch vụ khi người dùng nhập
  const normalizeCode = (val: string) => {
    return val.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  };

  const handleCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanCode = normalizeCode(rawVal);
    
    setEditingService(prev => prev ? { ...prev, ma_dv: cleanCode } : null);
    
    if (cleanCode.length > 2) {
      setIsValidating(true);
      const exists = await checkServiceCodeExists(cleanCode);
      if (exists) {
        setCodeError("Mã dịch vụ này đã tồn tại trên hệ thống");
      } else {
        setCodeError(null);
      }
      setIsValidating(false);
    } else {
      setCodeError(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingService(initialServiceState);
    setCodeError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    // @google/genai fix: Added ma_dv_original to distinguish between CREATE and UPDATE actions
    setEditingService({ ...service, ma_dv_original: service.ma_dv });
    setCodeError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingService?.ten_dv || !editingService?.don_gia) {
      alert("Vui lòng điền đầy đủ Tên dịch vụ và Đơn giá");
      return;
    }

    if (codeError) {
      alert("Mã dịch vụ bị trùng, vui lòng kiểm tra lại");
      return;
    }

    setIsSaving(true);
    try {
      let finalData = { ...editingService };
      
      // Nếu mã dịch vụ trống, tự động sinh mã từ DB
      if (!finalData.ma_dv) {
        const autoCode = await getNextServiceCode();
        finalData.ma_dv = autoCode;
      }

      // Kiểm tra trùng lần cuối trước khi insert (double-check)
      if (!editingService.ma_dv_original) { // Chỉ check nếu là tạo mới
         const stillExists = await checkServiceCodeExists(finalData.ma_dv as string);
         if (stillExists && !editingService.ma_dv) {
            // Re-generate if auto-code collided
            finalData.ma_dv = await getNextServiceCode();
         } else if (stillExists) {
            setCodeError("Mã dịch vụ đã tồn tại");
            setIsSaving(false);
            return;
         }
      }

      const action = editingService.ma_dv_original || services.some(s => s.ma_dv === finalData.ma_dv) ? 'UPDATE' : 'CREATE';
      
      // Payload thực tế gửi lên Supabase
      const payload = {
        ma_dv: finalData.ma_dv,
        ten_dv: finalData.ten_dv,
        nhom_dv: finalData.nhom_dv,
        don_vi_tinh: finalData.don_vi_tinh,
        nhan: finalData.nhan,
        chi_tiet_dv: finalData.chi_tiet_dv,
        don_gia: finalData.don_gia,
        hoa_hong_pct: finalData.hoa_hong_pct,
        chi_phi_cong_chup: finalData.chi_phi_cong_chup,
        chi_phi_makeup: finalData.chi_phi_makeup,
        chi_phi_nv_ho_tro: finalData.chi_phi_nv_ho_tro,
        chi_phi_thu_vay: finalData.chi_phi_thu_vay,
        chi_phi_photoshop: finalData.chi_phi_photoshop,
        chi_phi_in_an: finalData.chi_phi_in_an,
        chi_phi_ship: finalData.chi_phi_ship,
        chi_phi_an_trua: finalData.chi_phi_an_trua,
        chi_phi_lam_toc: finalData.chi_phi_lam_toc,
        chi_phi_bao_bi: finalData.chi_phi_bao_bi,
        chi_phi_giat_phoi: finalData.chi_phi_giat_phoi,
        chi_phi_khau_hao: finalData.chi_phi_khau_hao
      };

      const result = await syncData('services', action, payload);
      
      if (result.success && result.data) {
        const savedProduct = {
          ...result.data,
          id: result.data.ma_dv, // Mapping cho các module khác
          code: result.data.ma_dv,
          name: result.data.ten_dv,
          price: result.data.don_gia,
          type: result.data.nhom_dv,
          description: result.data.chi_tiet_dv,
          unit: result.data.don_vi_tinh,
          label: result.data.nhan
        };
        
        if (action === 'UPDATE') {
          setServices(prev => prev.map(s => s.ma_dv === savedProduct.ma_dv ? savedProduct : s));
        } else {
          setServices(prev => [savedProduct, ...prev]);
        }
        setIsModalOpen(false);
        setEditingService(null);
      }
    } catch (e: any) {
      alert(`Lỗi đồng bộ: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ma_dv: string) => {
    if (window.confirm("Bạn có chắc muốn xóa dịch vụ này không?")) {
      try {
        const result = await syncData('services', 'DELETE', { ma_dv });
        if (result.success) {
          setServices(prev => prev.filter(s => s.ma_dv !== ma_dv));
        }
      } catch (e: any) {
        alert(`Không thể xóa: ${e.message}`);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Danh mục Dịch vụ</h2>
          <p className="text-slate-500 font-medium">Quản lý dịch vụ Studio qua Supabase Cloud</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
        >
          <Plus size={22} /> Thêm dịch vụ mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {services.map(s => {
          const chiphi_codinh = 
            (s.chi_phi_cong_chup || 0) + (s.chi_phi_makeup || 0) + (s.chi_phi_nv_ho_tro || 0) + 
            (s.chi_phi_thu_vay || 0) + (s.chi_phi_photoshop || 0) + (s.chi_phi_in_an || 0) + 
            (s.chi_phi_ship || 0) + (s.chi_phi_an_trua || 0) + (s.chi_phi_lam_toc || 0) + 
            (s.chi_phi_bao_bi || 0) + (s.chi_phi_giat_phoi || 0) + (s.chi_phi_khau_hao || 0);
          const hoa_hong_tien = Math.round(s.don_gia * ((s.hoa_hong_pct || 0) / 100));
          const totalCost = chiphi_codinh + hoa_hong_tien;
          const profit = s.don_gia - totalCost;
          const margin = s.don_gia > 0 ? Math.round((profit / s.don_gia) * 100) : 0;
          
          return (
            <div key={s.ma_dv} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group flex flex-col justify-between overflow-hidden relative">
              <div className="absolute -top-2 -right-8 bg-blue-50 text-blue-600 px-10 py-4 rotate-45 text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all">
                {s.nhan === '-' ? 'ACTIVE' : s.nhan}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    <Package size={24} />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(s.ma_dv); }} className="p-2 text-slate-300 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                </div>
                
                <div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{s.ten_dv}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{s.ma_dv}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{s.nhom_dv}</span>
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap">
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${margin > 30 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    Biên LN: {margin}%
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 space-y-4">
                <div className="flex justify-between items-end">
                   <div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Giá bán niêm yết</div>
                      <div className="text-2xl font-black text-slate-900">
                        {s.don_gia.toLocaleString()}<span className="text-xs ml-1 text-slate-400">đ</span>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => handleOpenEdit(s)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  Chỉnh sửa chi tiết
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && editingService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 flex flex-col max-h-[95vh]">
            
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-blue-500/20">
                  <Package size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{editingService.ma_dv_original ? 'Cập nhật Dịch vụ' : 'Thiết lập Dịch vụ mới'}</h3>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Mã dịch vụ là khóa chính duy nhất</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-300 transition-all">
                <X size={28} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-10 scrollbar-hide">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-600">
                  <Info size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">1. Thông tin cơ bản</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Mã dịch vụ (ma_dv) *</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="VD: DV-000001"
                        disabled={!!editingService.ma_dv_original || services.some(s => s.ma_dv === editingService.ma_dv && editingService.ma_dv !== '')}
                        className={`w-full p-4 border rounded-2xl outline-none font-black transition-all ${codeError ? 'bg-red-50 border-red-300 text-red-600' : 'bg-slate-50 border-slate-200 text-blue-600 focus:ring-2 focus:ring-blue-500'}`}
                        value={editingService.ma_dv} 
                        onChange={handleCodeChange}
                      />
                      {isValidating && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                    </div>
                    {codeError ? (
                       <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{codeError}</p>
                    ) : (
                       <p className="text-[9px] text-slate-400 italic ml-1">Bỏ trống để hệ thống tự sinh mã. Không thể sửa sau khi lưu.</p>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Tên dịch vụ hiển thị *</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-lg" value={editingService.ten_dv} onChange={e => setEditingService({...editingService, ten_dv: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Nhóm dịch vụ</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none cursor-pointer" value={editingService.nhom_dv} onChange={e => setEditingService({...editingService, nhom_dv: e.target.value as ServiceType})}>
                      {Object.values(ServiceType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                   <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Đơn vị tính</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={editingService.don_vi_tinh} onChange={e => setEditingService({...editingService, don_vi_tinh: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Nhãn (Label)</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={editingService.nhan} onChange={e => setEditingService({...editingService, nhan: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-1.5">
                    <AlignLeft size={12} /> Chi tiết dịch vụ
                  </label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px] text-sm"
                    value={editingService.chi_tiet_dv}
                    onChange={e => setEditingService({...editingService, chi_tiet_dv: e.target.value})}
                  />
                </div>
              </div>

              {/* Section 2: Cấu trúc chi phí */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-purple-600 border-b border-slate-100 pb-4">
                  <ShieldCheck size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">2. Cấu trúc chi phí chi tiết (VNĐ)</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div className="space-y-1 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest block truncate">Hoa hồng (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        className="w-full bg-transparent border-b border-blue-200 outline-none font-black text-blue-700 text-sm py-1 pr-4"
                        value={editingService.hoa_hong_pct || 0}
                        onChange={e => setEditingService({...editingService, hoa_hong_pct: Number(e.target.value)})}
                      />
                      <Percent size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-blue-400" />
                    </div>
                  </div>

                  {[
                    { key: 'chi_phi_cong_chup', label: 'công chụp' },
                    { key: 'chi_phi_makeup', label: 'makeup' },
                    { key: 'chi_phi_nv_ho_tro', label: 'NV hỗ trợ' },
                    { key: 'chi_phi_thu_vay', label: 'Thử váy' },
                    { key: 'chi_phi_photoshop', label: 'Photoshop' },
                    { key: 'chi_phi_in_an', label: 'in ấn' },
                    { key: 'chi_phi_ship', label: 'Ship hàng' },
                    { key: 'chi_phi_an_trua', label: 'ăn trưa' },
                    { key: 'chi_phi_lam_toc', label: 'làm tóc' },
                    { key: 'chi_phi_bao_bi', label: 'bao bì' },
                    { key: 'chi_phi_giat_phoi', label: 'giặt phơi điện nước' },
                    { key: 'chi_phi_khau_hao', label: 'khấu hao váy vest' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate" title={field.label}>{field.label}</label>
                      <input 
                        type="number" 
                        className="w-full bg-transparent border-b border-slate-200 outline-none font-black text-slate-700 text-sm py-1"
                        value={(editingService[field.key as keyof Service] as number) || 0}
                        onChange={e => setEditingService({...editingService, [field.key]: Number(e.target.value)})}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Đơn giá */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                <div className="space-y-6">
                   <div className="flex items-center gap-2 text-emerald-600">
                    <DollarSign size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">3. Đơn giá niêm yết *</span>
                  </div>
                  <div className="flex items-center bg-slate-900 border border-slate-900 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-900/20">
                    <div className="p-6 bg-white/10 text-white"><DollarSign size={24} /></div>
                    <input 
                      type="number" 
                      className="flex-1 p-6 bg-transparent text-white outline-none font-black text-3xl"
                      value={editingService.don_gia}
                      onChange={e => setEditingService({...editingService, don_gia: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân tích biên lợi nhuận (Real-time)</span>
                  </div>
                  <div className={`p-8 rounded-[2.5rem] border space-y-4 shadow-sm transition-colors ${profitAnalysis.loi_nhuan_gop < 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500">Tiền hoa hồng ({editingService.hoa_hong_pct || 0}%):</span>
                      <span className="text-sm font-bold text-slate-900">{profitAnalysis.hoa_hong_tien.toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500">Tổng chi phí dự tính:</span>
                      <span className="text-lg font-black text-slate-900">{profitAnalysis.tong_chi_phi.toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-500">Lợi nhuận gộp:</span>
                        {profitAnalysis.loi_nhuan_gop < 0 && (
                          <span className="text-[10px] text-red-600 font-black flex items-center gap-1 mt-1 animate-pulse">
                            <AlertTriangle size={10} /> CẢNH BÁO LỖ
                          </span>
                        )}
                      </div>
                      <span className={`text-2xl font-black ${profitAnalysis.loi_nhuan_gop < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {profitAnalysis.loi_nhuan_gop > 0 ? '+' : ''}{profitAnalysis.loi_nhuan_gop.toLocaleString()}đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-50 flex items-center justify-end gap-6 bg-white sticky bottom-0 z-10">
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900">Hủy bỏ</button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !!codeError || isValidating}
                className="px-14 py-4 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-[1.25rem] shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:bg-slate-400"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {editingService.ma_dv_original ? 'Cập nhật Dịch vụ' : 'Lưu Dịch vụ mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
