
import React from 'react';
import { Contract, Customer, Staff, Transaction, Service, TransactionType, StudioInfo } from '../types';

interface Props {
  contract: Contract;
  customer: Customer | undefined;
  staff: Staff | undefined;
  transactions: Transaction[];
  services: Service[];
  studioInfo: StudioInfo;
}

const ContractPrint: React.FC<Props> = ({ contract, customer, staff, transactions, services, studioInfo }) => {
  const formatCurrency = (amount: number) => amount.toLocaleString() + 'đ';
  
  const formatDateHeader = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
  };

  const getPaymentHistory = () => {
    return transactions
      .filter(t => t.contractId === contract.id && t.type === TransactionType.INCOME)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const payments = getPaymentHistory();

  return (
    <div className="bg-white text-black font-['Times_New_Roman',_Times,_serif] leading-tight text-[13px] p-0">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
        <div className="flex gap-4">
          <div className="w-24 h-24 bg-black text-white flex items-center justify-center text-4xl font-bold rounded-lg overflow-hidden shrink-0">
            {studioInfo.logoImage ? (
              <img src={studioInfo.logoImage} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              studioInfo.logoText
            )}
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold uppercase tracking-tight">{studioInfo.name}</h1>
            <p className="text-[12px] italic">{studioInfo.address}</p>
            <p className="text-[12px]">Điện thoại: <b>{studioInfo.phone}</b> - Zalo: <b>{studioInfo.zalo}</b></p>
            <p className="text-[11px]">Website: {studioInfo.website} - Email: {studioInfo.email}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">Mẫu số: 01/HĐ-AS</h2>
          <p className="text-[12px]">Số: <span className="text-red-600 font-bold">{contract.contractCode}</span></p>
        </div>
      </div>

      {/* Main Title */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold uppercase mb-2">HỢP ĐỒNG DỊCH VỤ</h2>
        <p className="italic text-[15px]">Hợp đồng được lập {formatDateHeader(contract.date)}</p>
      </div>

      {/* Section I: Parties Info */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-10">
          {/* BÊN A */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-bold uppercase text-[14px] mb-4">
              <span className="w-1.5 h-5 bg-black inline-block"></span> I. THÔNG TIN KHÁCH HÀNG (BÊN A)
            </h3>
            <div className="space-y-2.5 px-2">
              <div className="flex items-baseline">
                <span className="w-24 shrink-0">Họ và tên:</span>
                <span className="flex-1 border-b border-dotted border-gray-400 font-bold uppercase tracking-wide">{customer?.name}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-24 shrink-0">Số điện thoại:</span>
                <span className="flex-1 border-b border-dotted border-gray-400">{customer?.phone}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-24 shrink-0">Địa chỉ:</span>
                <span className="flex-1 border-b border-dotted border-gray-400">{customer?.address}</span>
              </div>
            </div>
          </div>

          {/* BÊN B */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-bold uppercase text-[14px] mb-4">
              <span className="w-1.5 h-5 bg-black inline-block"></span> ĐẠI DIỆN STUDIO (BÊN B)
            </h3>
            <div className="space-y-2.5 px-2">
              <div className="flex items-baseline">
                <span className="w-28 shrink-0">Tên nhân viên:</span>
                <span className="flex-1 border-b border-dotted border-gray-400 font-bold uppercase tracking-wide">{staff?.name || studioInfo.directorName}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-28 shrink-0">Số điện thoại:</span>
                <span className="flex-1 border-b border-dotted border-gray-400">{staff?.phone || studioInfo.phone}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-28 shrink-0">Chức vụ:</span>
                <span className="flex-1 border-b border-dotted border-gray-400 italic">{staff?.role || 'Đại diện'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section II: Schedule */}
      <div className="mb-6">
        <h3 className="flex items-center gap-2 font-bold uppercase text-[14px] mb-3">
          <span className="w-1.5 h-5 bg-black inline-block"></span> II. LỊCH TRÌNH THỰC HIỆN
        </h3>
        <table className="w-full border-collapse border border-black text-center text-[12px]">
          <thead>
            <tr className="bg-gray-50 font-bold border-b border-black">
              <td className="border-r border-black p-1.5 w-[50px]">STT</td>
              <td className="border-r border-black p-1.5 w-[150px]">Ngày thực hiện</td>
              <td className="border-r border-black p-1.5">Nội dung công việc</td>
              <td className="p-1.5 w-[200px]">Ghi chú</td>
            </tr>
          </thead>
          <tbody>
            {contract.schedules.length > 0 ? contract.schedules.map((sch, idx) => (
              <tr key={sch.id} className="border-b border-black last:border-0">
                <td className="border-r border-black p-1.5">{idx + 1}</td>
                <td className="border-r border-black p-1.5 font-bold">{sch.date.split('-').reverse().join('/')}</td>
                <td className="border-r border-black p-1.5 uppercase text-[11px]">{sch.type}</td>
                <td className="p-1.5 text-left px-3">{sch.notes}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="p-4 italic border border-black">Chưa xác định lịch cụ thể</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Section III: Contract Content */}
      <div className="mb-6">
        <h3 className="flex items-center gap-2 font-bold uppercase text-[14px] mb-3">
          <span className="w-1.5 h-5 bg-black inline-block"></span> III. NỘI DUNG DỊCH VỤ & GIÁ TRỊ HỢP ĐỒNG
        </h3>
        <table className="w-full border-collapse border border-black text-[12px]">
          <thead>
            <tr className="bg-gray-50 font-bold border-b border-black text-center">
              <th className="border-r border-black p-1.5 w-[35px]">STT</th>
              <th className="border-r border-black p-1.5 w-[160px]">Tên dịch vụ/sản phẩm</th>
              <th className="border-r border-black p-1.5 min-w-[120px]">Chi tiết</th>
              <th className="border-r border-black p-1.5 w-[35px]">SL</th>
              <th className="border-r border-black p-1.5 w-[90px]">Đơn giá</th>
              <th className="border-r border-black p-1.5 w-[85px]">Giảm giá</th>
              <th className="border-r border-black p-1.5 w-[110px]">Thành tiền</th>
              <th className="p-1.5 w-[90px]">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {contract.items.map((item, idx) => {
              const svc = services.find(s => s.id === item.serviceId);
              return (
                <tr key={item.id} className="border-b border-black text-center">
                  <td className="border-r border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border-r border-black p-1.5 text-left px-2 font-bold uppercase text-[11px] leading-tight">{item.serviceName}</td>
                  <td className="border-r border-black p-1.5 text-left px-2 text-[10px] italic leading-tight text-justify">
                    {svc?.description || item.serviceDescription || '-'}
                  </td>
                  <td className="border-r border-black p-1.5 text-center">{item.quantity}</td>
                  <td className="border-r border-black p-1.5 text-right px-1.5">{formatCurrency(item.unitPrice)}</td>
                  <td className="border-r border-black p-1.5 text-right px-1.5 text-red-600">{item.discount > 0 ? formatCurrency(item.discount) : '0'}</td>
                  <td className="border-r border-black p-1.5 text-right px-1.5 font-bold">{formatCurrency(item.subtotal)}</td>
                  <td className="p-1.5 text-left px-1.5 text-[10px]">{item.notes}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-black">
              <td colSpan={6} rowSpan={3} className="border-r border-black"></td>
              <td className="border-r border-black p-1.5 text-right font-bold bg-gray-50 uppercase text-[10px]">Tổng giá trị HĐ:</td>
              <td className="p-1.5 text-right px-2 font-bold text-[14px] bg-gray-50">{formatCurrency(contract.totalAmount)}</td>
            </tr>
            <tr>
              <td className="border-r border-black p-1.5 text-right font-bold text-blue-700 text-[10px] uppercase">Số tiền đã đóng:</td>
              <td className="p-1.5 text-right px-2 font-bold text-blue-700 border-b border-black">{formatCurrency(contract.paidAmount)}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border-r border-black p-1.5 text-right font-bold text-red-600 text-[10px] uppercase">Còn lại phải thu:</td>
              <td className="p-1.5 text-right px-2 font-bold text-red-600 border-b border-black">{formatCurrency(contract.totalAmount - contract.paidAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section IV: Payment Details */}
      <div className="mb-6">
        <h3 className="flex items-center gap-2 font-bold uppercase text-[14px] mb-3">
          <span className="w-1.5 h-5 bg-black inline-block"></span> IV. CHI TIẾT CÁC LẦN THANH TOÁN
        </h3>
        <table className="w-full border-collapse border border-black text-center text-[12px]">
          <thead>
            <tr className="bg-gray-50 border-b border-black font-bold">
              <td className="p-1.5 w-[50px]">Lần</td>
              <td className="p-1.5 w-[120px]">Ngày</td>
              <td className="p-1.5 text-left px-4">Ghi chú thanh toán</td>
              <td className="p-1.5 text-right px-4 w-[130px]">Số tiền</td>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, idx) => (
              <tr key={p.id} className="border-b border-black last:border-0">
                <td className="p-1.5">{idx + 1}</td>
                <td className="p-1.5 italic">{p.date.split('-').reverse().join('/')}</td>
                <td className="p-1.5 text-left px-4 uppercase font-bold text-[11px]">{p.description} {p.vendor ? `(${p.vendor})` : ''}</td>
                <td className="p-1.5 text-right px-4 font-bold">{formatCurrency(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section V: General Terms */}
      <div className="mb-6 page-break-inside-avoid">
        <h3 className="flex items-center gap-2 font-bold uppercase text-[14px] mb-3">
          <span className="w-1.5 h-5 bg-black inline-block"></span> V. ĐIỀU KHOẢN HỢP ĐỒNG DỊCH VỤ
        </h3>
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg italic text-[11px] leading-relaxed text-justify whitespace-pre-line">
          {studioInfo.contractTerms}
        </div>
      </div>

      {/* Section VI: Specific Terms (Custom Terms) */}
      {contract.terms && (
        <div className="mb-10 page-break-inside-avoid">
          <h3 className="flex items-center gap-2 font-bold uppercase text-[14px] mb-3">
            <span className="w-1.5 h-5 bg-black inline-block"></span> VI. ĐIỀU KHOẢN RIÊNG DÀNH CHO HỢP ĐỒNG NÀY
          </h3>
          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg italic text-[11px] font-medium leading-relaxed text-justify whitespace-pre-line">
            {contract.terms}
          </div>
        </div>
      )}

      {/* Signatures Section */}
      <div className="grid grid-cols-2 gap-20 text-center items-start mt-12 page-break-inside-avoid">
        <div className="flex flex-col items-center">
          <p className="font-bold uppercase text-[13px] mb-24">ĐẠI DIỆN KHÁCH HÀNG (BÊN A)</p>
          <div className="w-48 border-t border-dotted border-black pt-3">
            <p className="font-bold uppercase text-[14px]">{customer?.name}</p>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="font-bold uppercase text-[13px] mb-24">ĐẠI DIỆN STUDIO (BÊN B)</p>
          <div className="w-48 border-t border-dotted border-black pt-3">
            <p className="font-bold uppercase text-[14px]">{staff?.name || studioInfo.directorName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractPrint;
