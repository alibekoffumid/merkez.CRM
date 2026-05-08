import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../core/UserContext';
import { Download, ExternalLink, QrCode, Smartphone, Globe, Share2 } from 'lucide-react';

const QRMenu = () => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const qrRef = useRef(null);

  if (!profile) return null;

  const businessId = profile.tenant_id || profile.id;
  const menuUrl = `${window.location.origin}/m/${businessId}`;

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${profile.business_name || 'Restoran'}_QR_Menyu.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Card: QR Presentation */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-gray-100 p-8 md:p-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-8 text-blue-600">
            <QrCode className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Rəqəmsal QR Menyu</h2>
          <p className="text-gray-500 mb-10 max-w-sm font-medium">
            Müştəriləriniz masadakı QR kodu skan edərək anında menyunuza baxa bilərlər. Heç bir tətbiq yükləməyə ehtiyac yoxdur.
          </p>

          <div className="bg-gray-50 p-10 rounded-[3.5rem] border border-gray-100 mb-10 relative group">
            <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 rounded-[3.5rem] transition-opacity duration-500"></div>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 transition-transform duration-500 group-hover:scale-105">
              <QRCodeSVG 
                id="qr-code-svg"
                value={menuUrl}
                size={220}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/logo.png",
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button 
              onClick={downloadQR}
              className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              QR kodu yüklə
            </button>
            <button 
              onClick={() => window.open(menuUrl, '_blank')}
              className="flex-1 bg-gray-50 text-gray-900 py-4 px-6 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-200 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Menyuya bax
            </button>
          </div>
        </div>

        {/* Right Card: Features & Link */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <Globe className="w-6 h-6 text-blue-600" />
              Menyu Linki
            </h3>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between group">
               <span className="text-sm font-bold text-gray-500 truncate mr-4">{menuUrl}</span>
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(menuUrl);
                   alert('Link kopyalandı!');
                 }}
                 className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
               >
                 <Share2 className="w-4 h-4" />
               </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[2.5rem] shadow-xl p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-10 transition-transform duration-700 group-hover:scale-150 group-hover:rotate-12">
               <Smartphone className="w-40 h-40" />
            </div>
            
            <h3 className="text-xl font-black mb-6 relative z-10">Niyə QR Menyu?</h3>
            <ul className="space-y-4 relative z-10">
              {[
                { title: 'Təmassız Təcrübə', desc: 'Müştərilər üçün daha təhlükəsiz və gigiyenik.' },
                { title: 'Anında Yenilənmə', desc: 'Qiymətləri və yeməkləri dəyişdikdə menyu avtomatik yenilənir.' },
                { title: 'Xərcə Qənaət', desc: 'Kağız menyuların çap xərclərini azaldır.' },
                { title: 'Professional Görünüş', desc: 'Restoranınızın müasir və rəqəmsal imicini gücləndirir.' }
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{item.title}</p>
                    <p className="text-xs text-white/70 font-medium">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 flex items-center gap-6">
             <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shrink-0">
                <Globe className="w-8 h-8" />
             </div>
             <div>
                <h4 className="text-lg font-black text-gray-900">Çoxdilli Dəstək</h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">Menyunuza baxan müştərilər dili özləri seçə bilərlər (AZ, RU, EN).</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRMenu;
