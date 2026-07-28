import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Wrench, Calendar, CheckCircle2, MapPin, Phone, Instagram, Search } from 'lucide-react';
import { format } from 'date-fns';

const RepairReceipt = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    const fetchRepair = async () => {
      try {
        setLoading(true);
        // Note: warehouse_repairs needs a public read policy for this to work
        const { data, error } = await supabase
          .from('warehouse_repairs')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setRepair(data);
      } catch (err) {
        console.error('Error fetching repair receipt:', err);
        setError('Çek tapılmadı və ya xəta baş verdi.'); // Receipt not found or error
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRepair();
  }, [id]);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'RECEIVED_FROM_CUSTOMER':
        return { 
          label: i18n.language === 'az' ? 'Qəbul Edildi' : 'Принято',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Search className="w-5 h-5 text-yellow-600" />
        };
      case 'SENT_TO_WORKSHOP':
      case 'BEING_REPAIRED':
        return { 
          label: i18n.language === 'az' ? 'Təmirdədir' : 'В ремонте',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Wrench className="w-5 h-5 text-blue-600" />
        };
      case 'READY':
      case 'RECEIVED_FROM_WORKSHOP':
        return { 
          label: i18n.language === 'az' ? 'Hazırdır' : 'Готово',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle2 className="w-5 h-5 text-green-600" />
        };
      case 'DELIVERED_TO_CUSTOMER':
        return { 
          label: i18n.language === 'az' ? 'Təhvil Verildi' : 'Выдано',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <CheckCircle2 className="w-5 h-5 text-gray-600" />
        };
      case 'CANCELLED':
        return { 
          label: i18n.language === 'az' ? 'Ləğv Edildi' : 'Отменено',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <AlertCircle className="w-5 h-5 text-red-600" />
        };
      default:
        return { 
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
          <p className="text-gray-500 font-medium">Yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error || !repair) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Çek Tapılmadı</h2>
          <p className="text-gray-500 font-medium mb-6">{error}</p>
          <Link to="/" className="inline-block bg-amber-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors">
            Ana Səhifəyə Qayıt
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(repair.status);
  const totalCost = parseFloat(repair.estimated_cost || 0);

  // Extract customer info
  const clientNameMatch = repair.issue_description?.match(/Müştəri:\s*(.+)/);
  const clientPhoneMatch = repair.issue_description?.match(/Telefon:\s*(.+)/);
  const cName = clientNameMatch ? clientNameMatch[1].trim() : null;
  const cPhone = clientPhoneMatch ? clientPhoneMatch[1].trim() : null;

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      {/* Brand Header */}
      <div className="bg-gray-900 text-white pt-8 pb-16 px-4 text-center rounded-b-[40px] shadow-lg flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl py-2.5 px-6 mb-3 inline-block shadow-md">
          <img src="/logo.png" alt="RAST Music Shop" className="h-8 object-contain" />
        </div>
        <p className="text-gray-300 font-medium text-sm tracking-wide">Təmir və Bərpa Servisi</p>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-10 space-y-6">
        
        {/* Main Info Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Kvitansiya / Çek</p>
              <h2 className="text-2xl font-black text-gray-900">{repair.repair_code}</h2>
            </div>
            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border ${statusInfo.color}`}>
              {statusInfo.icon}
              <span className="font-bold text-sm">{statusInfo.label}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Alət / Məhsul</p>
                <p className="font-bold text-gray-900 text-lg">{repair.item_name}</p>
              </div>
            </div>

            {(cName || cPhone) && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="font-black text-gray-600 text-lg">{cName ? cName.charAt(0).toUpperCase() : 'M'}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Müştəri</p>
                  {cName && <p className="font-bold text-gray-900">{cName}</p>}
                  {cPhone && <p className="text-sm text-gray-500">{cPhone}</p>}
                </div>
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Tarix</p>
                <p className="font-bold text-gray-900">
                  {format(new Date(repair.created_at), 'dd.MM.yyyy')}
                </p>
                <p className="text-sm text-gray-500">
                  {format(new Date(repair.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 border-dashed">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Problemin Təsviri</p>
            <p className="text-gray-800 font-medium whitespace-pre-wrap bg-gray-50 p-4 rounded-xl">
              {repair.issue_description
                ? repair.issue_description
                    .replace(/Müştəri:\s*(.+)/, '')
                    .replace(/Telefon:\s*(.+)/, '')
                    .replace(/Problem:\s*/, '')
                    .trim()
                : 'Göstərilməyib'}
            </p>
          </div>

          {totalCost > 0 && (
            <div className="mt-6 bg-amber-50 rounded-2xl p-4 flex justify-between items-center border border-amber-100">
              <span className="font-bold text-amber-900 uppercase text-xs tracking-wider">Təxmini Qiymət</span>
              <span className="font-black text-2xl text-amber-600">{totalCost.toFixed(2)} ₼</span>
            </div>
          )}
        </div>

        {/* Photo Gallery Card (Only shows if there are photos) */}
        {(repair.photo_before || repair.photo_after) && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-amber-400 rounded-full"></span>
              Foto Hesabat
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {repair.photo_before && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-gray-500 text-center uppercase tracking-wider">Təmirdən Öncə</p>
                  <div 
                    className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 cursor-pointer relative group"
                    onClick={() => setLightboxImage(repair.photo_before)}
                  >
                    <img 
                      src={repair.photo_before} 
                      alt="Before Repair" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Search className="text-white opacity-0 group-hover:opacity-100 w-6 h-6 drop-shadow-md" />
                    </div>
                  </div>
                </div>
              )}
              
              {repair.photo_after ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-green-600 text-center uppercase tracking-wider">Təmirdən Sonra</p>
                  <div 
                    className="aspect-square rounded-2xl overflow-hidden border-2 border-green-100 cursor-pointer relative group"
                    onClick={() => setLightboxImage(repair.photo_after)}
                  >
                    <img 
                      src={repair.photo_after} 
                      alt="After Repair" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Search className="text-white opacity-0 group-hover:opacity-100 w-6 h-6 drop-shadow-md" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-wider">Təmirdən Sonra</p>
                  <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400">
                    <p className="text-xs font-medium text-center px-4">Təmir bitdikdən sonra əlavə ediləcək</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center space-y-4 mt-8">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <MapPin className="w-4 h-4" />
            <span>Yasamal Baku Mall, 1-ci mərtəbə</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-gray-500">
            <a href="tel:+994500000000" className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
              <Phone className="w-4 h-4" />
              <span className="font-medium text-sm">Bizimlə əlaqə</span>
            </a>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <a href="https://instagram.com/rastmusicshop" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-amber-600 transition-colors">
              <Instagram className="w-4 h-4" />
              <span className="font-medium text-sm">@rastmusicshop</span>
            </a>
          </div>
        </div>

      </div>

      {/* Lightbox for full screen image viewing */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center">
            <button 
              className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-all"
              onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            >
              Bağla (X)
            </button>
            <img 
              src={lightboxImage} 
              alt="Enlarged view" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairReceipt;
