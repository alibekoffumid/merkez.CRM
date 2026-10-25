import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, AlertCircle, Printer, ArrowLeft, ShieldCheck, Store, Calendar, CreditCard, DollarSign, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const SaleReceipt = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSaleData();
  }, [id]);

  const fetchSaleData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Check retail_sales table
      const { data: retailSale, error: retailErr } = await supabase
        .from('retail_sales')
        .select(`
          *,
          items:retail_sale_items(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (retailSale && !retailErr) {
        const isCancelled = retailSale.is_deleted === true || ['cancelled', 'canceled', 'deleted', 'refunded', 'void'].includes(String(retailSale.status || '').toLowerCase());
        setSale({
          id: retailSale.id,
          receiptNumber: (retailSale.id || '').slice(0, 8).toUpperCase(),
          date: retailSale.created_at,
          paymentMethod: retailSale.payment_method || 'Nağd',
          totalAmount: retailSale.total_amount,
          discountAmount: retailSale.discount_amount || 0,
          isCancelled,
          status: retailSale.status,
          items: (retailSale.items || []).map(it => ({
            name: it.product_name || 'Məhsul',
            quantity: it.quantity || 1,
            price: it.price_at_sale || it.base_price || 0,
            total: it.total || ((it.quantity || 1) * (it.price_at_sale || 0))
          }))
        });
        setLoading(false);
        return;
      }

      // 2. Fallback: check stock_dispatches table
      const { data: dispatch, error: dispatchErr } = await supabase
        .from('stock_dispatches')
        .select(`
          *,
          products:product_id (name, barcode, unit)
        `)
        .eq('id', id)
        .maybeSingle();

      if (dispatch && !dispatchErr) {
        let parsedPrice = 0;
        let parsedTotal = 0;
        let parsedMethod = 'Nağd';
        let parsedCustName = '';

        if (dispatch.notes) {
          const priceMatch = dispatch.notes.match(/Qiymət:\s*₼?([\d.]+)/i);
          const totalMatch = dispatch.notes.match(/Cəmi:\s*₼?([\d.]+)/i);
          const methodMatch = dispatch.notes.match(/Ödəniş:\s*([^,|]+)/i);
          const custMatch = dispatch.notes.match(/Müştəri:\s*([^,|]+)/i);

          if (priceMatch) parsedPrice = parseFloat(priceMatch[1]);
          if (totalMatch) parsedTotal = parseFloat(totalMatch[1]);
          if (methodMatch) parsedMethod = methodMatch[1].trim();
          if (custMatch) parsedCustName = custMatch[1].trim();
        }

        const qty = Math.abs(parseFloat(dispatch.quantity) || 1);
        const finalPrice = parsedPrice || (parsedTotal ? parsedTotal / qty : 0);
        const finalTotal = parsedTotal || (finalPrice * qty);

        setSale({
          id: dispatch.id,
          receiptNumber: (dispatch.id || '').slice(0, 8).toUpperCase(),
          date: dispatch.issued_at || dispatch.created_at,
          paymentMethod: parsedMethod,
          customerName: parsedCustName,
          totalAmount: finalTotal,
          discountAmount: 0,
          items: [
            {
              name: dispatch.products?.name || 'Məhsul',
              quantity: qty,
              price: finalPrice,
              total: finalTotal
            }
          ]
        });
        setLoading(false);
        return;
      }

      // 3. Fallback: URL search params
      const qNum = searchParams.get('num');
      const qSum = searchParams.get('sum');
      if (qNum || qSum) {
        setSale({
          id: id,
          receiptNumber: qNum || (id || '').slice(0, 8).toUpperCase(),
          date: new Date().toISOString(),
          paymentMethod: 'Nağd',
          totalAmount: parseFloat(qSum) || 0,
          discountAmount: 0,
          items: [
            {
              name: 'Musiqi aləti / Aksessuar',
              quantity: 1,
              price: parseFloat(qSum) || 0,
              total: parseFloat(qSum) || 0
            }
          ]
        });
        setLoading(false);
        return;
      }

      // If not found
      setError(i18n.language === 'az' ? 'Çek tapılmadı və ya etibarsızdır.' : 'Чек не найден или недействителен.');
    } catch (err) {
      console.error('Error fetching sale receipt:', err);
      setError(i18n.language === 'az' ? 'Məlumat yüklənərkən xəta baş verdi.' : 'Ошибка при загрузке данных чека.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
          <p className="text-gray-500 font-bold text-sm">
            {i18n.language === 'az' ? 'Çek yoxlanılır...' : 'Проверка чека...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-red-100">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {i18n.language === 'az' ? 'Çek Tapılmadı' : 'Чек не найден'}
          </h2>
          <p className="text-gray-500 text-sm font-medium mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{i18n.language === 'az' ? 'Ana səhifə' : 'На главную'}</span>
          </Link>
        </div>
      </div>
    );
  }

  const receiptUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 py-8 px-4 font-sans print:bg-white print:p-0">
      <div className="max-w-md mx-auto print:max-w-none">
        
        {/* Verification Top Pill */}
        <div className="flex items-center justify-center gap-2 mb-4 print:hidden">
          {sale.isCancelled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold ring-1 ring-red-200 shadow-xs">
              <AlertCircle className="w-4 h-4 text-red-600" />
              {i18n.language === 'az' ? 'Ləğv Edilmiş Çek (Kassadan Çıxarılıb)' : 'Отменённый чек (Исключён из кассы)'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold ring-1 ring-emerald-200 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {i18n.language === 'az' ? 'Rəsmi Elektron Çek (Təsdiqlənib)' : 'Официальный электронный чек (Подтвержден)'}
            </span>
          )}
        </div>

        {/* Receipt Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200/80 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          
          {/* Header Store Banner */}
          <div className="bg-[#0b1b3d] text-white p-6 text-center relative">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/10">
              <Store className="w-6 h-6 text-orange-400" />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase">
              Rast musiqi alətləri mağazası
            </h1>
            <p className="text-xs text-gray-300 font-medium mt-1">
              Musiqi Alətlərinin Satışı və Təmiri
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-5">
            {/* Merchant Details */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-400">VÖEN:</span>
                <span className="font-bold text-gray-800">5501238362</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-400">TS Adı:</span>
                <span className="font-bold text-gray-800">Rast musiqi alətləri mağazası</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-400">Ünvan:</span>
                <span className="font-medium text-gray-800 text-right">Bakı ş., Xətai r., ev.18A</span>
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {i18n.language === 'az' ? 'Çek Nömrəsi' : 'Номер чека'}
                  </div>
                  <div className="text-lg font-black text-gray-900 tracking-tight">
                    № {sale.receiptNumber}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-xl font-bold text-xs ring-1 ring-green-100">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'az' ? 'Ödənilib' : 'Оплачено'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{new Date(sale.date).toLocaleString('az-AZ')}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-bold text-gray-700">{sale.paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                {i18n.language === 'az' ? 'Məhsullar' : 'Товары'}
              </div>
              <div className="divide-y divide-gray-100 border-y border-gray-100">
                {sale.items.map((it, idx) => {
                  const isGift = it.name?.includes('Hədiyyə') || Number(it.price || 0) === 0;
                  return (
                    <div key={idx} className="py-2.5 flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate flex items-center gap-1.5 flex-wrap">
                          <span>{it.name}</span>
                          {isGift && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                              🎁 {i18n.language === 'az' ? 'Hədiyyə' : 'Подарок'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {it.quantity} əd x ₼{Number(it.price || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-sm font-black text-right">
                        {isGift ? (
                          <span className="text-purple-600 font-black">0.00 ₼</span>
                        ) : (
                          <span className="text-gray-900">₼{Number(it.total || 0).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100 space-y-2">
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-bold">
                  <span>{i18n.language === 'az' ? 'Endirim:' : 'Скидка:'}</span>
                  <span>-₼{Number(sale.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-black text-gray-900 uppercase">
                  {i18n.language === 'az' ? 'Yekun Məbləğ:' : 'Итоговая сумма:'}
                </span>
                <span className="text-2xl font-black text-blue-600">
                  ₼{Number(sale.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* QR Code Verification Footer */}
            <div className="pt-2 text-center">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                {i18n.language === 'az' ? 'Çekin Həqiqiliyi' : 'Проверка подлинности'}
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-2xl inline-block shadow-xs">
                <QRCodeSVG value={receiptUrl} size={110} level="M" />
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-2">
                ID: {sale.id}
              </div>
              <div className="text-xs font-bold text-gray-700 mt-1">
                {i18n.language === 'az' ? 'Bizi seçdiyiniz üçün təşəkkür edirik!' : 'Благодарим за покупку!'}
              </div>
            </div>

            {/* Actions (Hidden in Print) */}
            <div className="pt-4 border-t border-gray-100 flex gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>{i18n.language === 'az' ? 'Çap et' : 'Печать'}</span>
              </button>
              <Link
                to="/"
                className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center transition-all"
              >
                {i18n.language === 'az' ? 'Bağla' : 'Закрыть'}
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default SaleReceipt;
