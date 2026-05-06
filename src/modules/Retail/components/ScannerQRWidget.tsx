import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Download, X, ExternalLink, SmartphoneNfc } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScannerQRWidgetProps {
  onClose?: () => void;
}

const ScannerQRWidget: React.FC<ScannerQRWidgetProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Direct link to the scanner page
  const scannerUrl = `${window.location.origin}/scanner`;
  // Placeholder for the APK download link in Supabase Storage
  const apkUrl = "https://merkez.crm.supabase.co/storage/v1/object/public/apps/merkez-scanner.apk";

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden w-full max-w-sm animate-in zoom-in-95 duration-200">
      <div className="p-6 bg-merkez-blue flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg leading-none">Mərkəz Scanner</h3>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Mobile Companion</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-8 flex flex-col items-center gap-6">
        <div className="relative group">
          <div className="absolute -inset-4 bg-merkez-blue/5 rounded-[2.5rem] blur-xl group-hover:bg-merkez-blue/10 transition-all" />
          <div className="relative bg-white p-4 rounded-[2rem] shadow-xl border border-gray-50">
            <QRCodeSVG value={scannerUrl} size={180} level="H" includeMargin={true} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="bg-white p-2 rounded-2xl shadow-lg border border-gray-100">
                  <SmartphoneNfc className="w-6 h-6 text-merkez-blue" />
               </div>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm font-black text-gray-900">Сканируйте для подключения</p>
          <p className="text-xs text-gray-400 font-medium leading-relaxed px-4">
            Наведите камеру телефона на QR-код, чтобы мгновенно превратить ваш смартфон в беспроводной сканер штрих-кодов.
          </p>
        </div>

        <div className="w-full h-[1px] bg-gray-50" />

        <div className="w-full flex flex-col gap-2">
          <a 
            href={apkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 bg-gray-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-950/20"
          >
            <Download className="w-4 h-4" />
            Скачать APK (Android)
          </a>
          <button 
            onClick={() => window.open(scannerUrl, '_blank')}
            className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-merkez-blue/30 hover:text-merkez-blue transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Открыть Web-версию
          </button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Version 1.0.0 (Capacitor Build)
        </p>
      </div>
    </div>
  );
};

export default ScannerQRWidget;
