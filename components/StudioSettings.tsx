
import React, { useRef } from 'react';
import { StudioInfo } from '../types';
import { Building2, Globe, Mail, Phone, User, FileJson, Layout, Upload, Image as ImageIcon, X, FileText } from 'lucide-react';

interface Props {
  studioInfo: StudioInfo;
  setStudioInfo: React.Dispatch<React.SetStateAction<StudioInfo>>;
}

const StudioSettings: React.FC<Props> = ({ studioInfo, setStudioInfo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStudioInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudioInfo(prev => ({ ...prev, logoImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setStudioInfo(prev => ({ ...prev, logoImage: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Thông tin Studio</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Thông tin này sẽ xuất hiện trên Hợp đồng và Hóa đơn</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Upload Section */}
          <div className="md:col-span-2 space-y-3">
             <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <ImageIcon size={12} /> Hình ảnh Logo thương hiệu
            </label>
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              <div className="relative group">
                <div className="w-24 h-24 bg-white rounded-2xl border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                  {studioInfo.logoImage ? (
                    <img src={studioInfo.logoImage} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-2xl font-black text-blue-600">{studioInfo.logoText}</span>
                  )}
                </div>
                {studioInfo.logoImage && (
                  <button 
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tải lên ảnh PNG/JPG không nền (dưới 2MB)</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden" 
                  onChange={handleLogoUpload} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-700 hover:bg-slate-100 transition-all shadow-sm"
                >
                  <Upload size={14} /> Chọn ảnh mới
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Building2 size={12} /> Tên Studio
            </label>
            <input 
              name="name" 
              value={studioInfo.name} 
              onChange={handleChange} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Layout size={12} /> Chữ Logo thay thế (Text)
            </label>
            <input 
              name="logoText" 
              value={studioInfo.logoText} 
              onChange={handleChange} 
              maxLength={4}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-blue-600"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
               Địa chỉ trụ sở
            </label>
            <input 
              name="address" 
              value={studioInfo.address} 
              onChange={handleChange} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Phone size={12} /> Số điện thoại
            </label>
            <input name="phone" value={studioInfo.phone} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              Zalo hỗ trợ
            </label>
            <input name="zalo" value={studioInfo.zalo} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Globe size={12} /> Website
            </label>
            <input name="website" value={studioInfo.website} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <Mail size={12} /> Email
            </label>
            <input name="email" value={studioInfo.email} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest flex items-center gap-2">
              <User size={12} /> Giám đốc / Đại diện
            </label>
            <input name="directorName" value={studioInfo.directorName} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" />
          </div>

          {/* New Section: Contract Terms */}
          <div className="md:col-span-2 space-y-4 pt-6 mt-6 border-t border-slate-100">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
               </div>
               <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Điều Khoản Hợp Đồng Gốc</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cấu hình Mục V trên bản in hợp đồng</p>
               </div>
             </div>
             <textarea 
               name="contractTerms" 
               value={studioInfo.contractTerms} 
               onChange={handleChange} 
               className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-purple-500 text-sm font-serif leading-relaxed min-h-[400px]"
               placeholder="Nhập nội dung điều khoản chung của Studio..."
             />
          </div>

          <div className="md:col-span-2 space-y-2 p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
            <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest flex items-center gap-2">
              <FileJson size={14} /> Link Google Docs Mẫu Hợp Đồng
            </label>
            <p className="text-[10px] text-blue-400 mb-2 italic">* Liên kết mẫu hợp đồng của bạn để hệ thống có thể kết nối dữ liệu (tương lai).</p>
            <input 
              name="googleDocsTemplateUrl" 
              placeholder="https://docs.google.com/document/d/..." 
              value={studioInfo.googleDocsTemplateUrl} 
              onChange={handleChange} 
              className="w-full p-4 bg-white border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioSettings;
