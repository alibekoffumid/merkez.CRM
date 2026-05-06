import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeCameraProps {
  onScan: (barcode: string) => void;
  isActive: boolean;
}

const BarcodeCamera: React.FC<BarcodeCameraProps> = ({ onScan, isActive }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) return;

    const scanner = new Html5Qrcode('scanner-viewport');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.0,
        disableFlip: false,
      },
      (decodedText: string) => {
        const now = Date.now();
        // Prevent duplicate scans within 2 seconds
        if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 2000) return;
        lastScanRef.current = decodedText;
        lastScanTimeRef.current = now;
        // Vibrate on scan
        if (navigator.vibrate) navigator.vibrate(100);
        onScan(decodedText);
      },
      () => {} // ignore scan failures
    ).catch((err: Error) => {
      console.error('Camera start failed:', err);
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isActive, onScan]);

  const toggleTorch = async () => {
    try {
      const track = scannerRef.current?.getRunningTrackCameraCapabilities();
      if (track?.torchFeature()?.isSupported()) {
        await track.torchFeature().apply(!torchOn);
        setTorchOn(!torchOn);
      }
    } catch {
      // Torch not supported
    }
  };

  return (
    <div className="relative w-full flex-1 flex flex-col items-center justify-center">
      <div id="scanner-viewport" className="w-full h-full rounded-3xl overflow-hidden bg-black" />
      
      {/* Torch button */}
      <button
        onClick={toggleTorch}
        className={`absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl ${
          torchOn ? 'bg-yellow-400 text-gray-900' : 'bg-white/20 backdrop-blur-sm text-white'
        }`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </button>

      {/* Scan guide overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-72 h-40 border-2 border-white/40 rounded-2xl relative">
          <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-3 border-l-3 border-white rounded-tl-xl" />
          <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-3 border-r-3 border-white rounded-tr-xl" />
          <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-3 border-l-3 border-white rounded-bl-xl" />
          <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-3 border-r-3 border-white rounded-br-xl" />
          {/* Scan line animation */}
          <div className="absolute top-0 left-2 right-2 h-0.5 bg-merkez-blue animate-pulse rounded-full" style={{ animation: 'scanLine 2s ease-in-out infinite' }} />
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; opacity: 0.5; }
          50% { top: 85%; opacity: 1; }
        }
        #scanner-viewport video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
      `}</style>
    </div>
  );
};

export default BarcodeCamera;
