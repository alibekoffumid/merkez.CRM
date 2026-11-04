import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Printer, KeyRound, ShieldCheck, Calendar, User, Phone, FileText } from 'lucide-react';
import ModalPortal from '../../components/Common/ModalPortal';

const RentalAgreementPrint = ({
  isOpen,
  onClose,
  rental,
  warehouseName = 'Əsas Anbar / Mağaza',
}) => {
  const { t, i18n } = useTranslation();
  const printAreaRef = useRef(null);

  if (!isOpen || !rental) return null;

  const handlePrint = () => {
    window.print();
  };

  const deposit = Number(rental.deposit_amount || 0);
  const rentalFee = Number(rental.rental_fee || 0);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-6">
          
          {/* Action Bar (Not printed) */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900">
                  {i18n.language === 'az' ? 'İcarə və Girov Müqaviləsi' : 'Договор аренды и залога'}
                </h3>
                <p className="text-[11px] text-gray-400 font-mono">№ {rental.rental_code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="btn-gradient-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all text-white"
              >
                <Printer className="w-4 h-4" />
                <span>{i18n.language === 'az' ? 'ÇAP ET' : 'ПЕЧАТЬ'}</span>
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors border border-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Document Area */}
          <div ref={printAreaRef} className="p-8 sm:p-12 text-gray-900 font-sans space-y-6 print:p-0 print:m-0 text-sm">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-gray-900 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-black text-sm">
                    M
                  </div>
                  <h1 className="text-xl font-black tracking-tight text-gray-900">MERKEZ CRM</h1>
                </div>
                <p className="text-xs text-gray-600 mt-1 font-semibold">{warehouseName}</p>
                <p className="text-[11px] text-gray-500">Məhsul və Avadanlıqların İcarə Xidməti</p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-900 rounded font-mono font-black text-xs">
                  № {rental.rental_code || `ICR-${rental.id?.slice(0, 8)}`}
                </span>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  {new Date(rental.created_at || rental.start_date).toLocaleDateString('az-AZ')}
                </p>
              </div>
            </div>

            <div className="text-center py-2">
              <h2 className="text-base font-black uppercase tracking-wider text-gray-900">
                AVADANLIQ / ALƏT İCARƏ VƏ GİROV MÜQAVİLƏSİ
              </h2>
            </div>

            {/* Customer & Product Details Table */}
            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <h4 className="text-xs font-black uppercase text-gray-500 mb-2 border-b pb-1">
                  MÜŞTƏRİ (İCARƏDAR)
                </h4>
                <div className="space-y-1.5 text-xs">
                  <p><span className="text-gray-500 font-semibold">Ad, Soyad:</span> <strong className="font-bold">{rental.client_name}</strong></p>
                  <p><span className="text-gray-500 font-semibold">Əlaqə:</span> <strong className="font-mono">{rental.client_phone}</strong></p>
                  <p><span className="text-gray-500 font-semibold">Ş/V Seriya və №:</span> <strong className="font-mono">{rental.client_id_serial || '—'}</strong></p>
                  <p><span className="text-gray-500 font-semibold">FİN Kod:</span> <strong className="font-mono">{rental.client_fin || '—'}</strong></p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase text-gray-500 mb-2 border-b pb-1">
                  İCARƏYƏ VERİLƏN ALƏT / MƏHSUL
                </h4>
                <div className="space-y-1.5 text-xs">
                  <p><span className="text-gray-500 font-semibold">Adı:</span> <strong className="font-bold">{rental.product_name}</strong></p>
                  <p><span className="text-gray-500 font-semibold">Barkod / Seriya:</span> <strong className="font-mono">{rental.product_barcode || '—'}</strong></p>
                  <p><span className="text-gray-500 font-semibold">Miqdar:</span> <strong>{rental.quantity || 1} ədəd</strong></p>
                  <p><span className="text-gray-500 font-semibold">Cari vəziyyət:</span> <span>{rental.instrument_condition_notes || 'Saz vəziyyətdə'}</span></p>
                </div>
              </div>
            </div>

            {/* Financial Terms */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Başlanğıc Tarixi</th>
                    <th className="py-2.5 px-3 text-left">Qaytarılma Müddəti</th>
                    <th className="py-2.5 px-right text-right">İcarə Haqqı</th>
                    <th className="py-2.5 px-right text-right">Girov (Depozit) Məbləği</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 px-3 font-semibold">{rental.start_date ? new Date(rental.start_date).toLocaleDateString('az-AZ') : '—'}</td>
                    <td className="py-3 px-3 font-bold text-red-600">{rental.due_date ? new Date(rental.due_date).toLocaleDateString('az-AZ') : '—'}</td>
                    <td className="py-3 px-3 text-right font-bold">₼{rentalFee.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-black text-indigo-700 text-sm">₼{deposit.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-[11px] leading-relaxed text-gray-600 space-y-1">
              <p className="font-bold text-gray-800">Şərtlər və Qaydalar:</p>
              <p>1. İcarədar avadanlığı saz və işlək vəziyyətdə təhvil aldığını, üzərindəki qüsurların aktda qeyd edildiyini təsdiq edir.</p>
              <p>2. Avadanlığın tam dəyəri məbləğində (<strong className="text-gray-900">₼{deposit.toFixed(2)}</strong>) girov saxlanılır. Avadanlıq qeyd olunan müddətdə saz halda qaytarıldıqda girov məbləği tam geri ödənilir.</p>
              <p>3. Avadanlıq zədələndikdə, sındıqda və ya itirildikdə təmir və ya bərpa xərcləri girov məbləğindən tutulur.</p>
              <p>4. Müddət gecikdirildikdə hər gecikən gün üçün əlavə icarə haqqı hesablanır.</p>
            </div>

            {/* Signature Block */}
            <div className="pt-8 grid grid-cols-2 gap-12 text-xs">
              <div>
                <p className="font-bold text-gray-800 mb-8">Təhvil verdi (Mağaza nümayəndəsi):</p>
                <div className="border-b border-gray-400 pb-1 flex justify-between">
                  <span className="text-gray-400">İmza: _______________</span>
                  <span className="text-gray-400">Tarix: ___/___/202_</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-gray-800 mb-8">Təhvil aldı (İcarədar müştəri):</p>
                <div className="border-b border-gray-400 pb-1 flex justify-between">
                  <span className="text-gray-400">İmza: _______________</span>
                  <span className="text-gray-400">Tarix: ___/___/202_</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default RentalAgreementPrint;

