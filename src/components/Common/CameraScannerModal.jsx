import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, Volume2, AlertCircle } from 'lucide-react';
import ModalPortal from './ModalPortal';

const CameraScannerModal = ({ isOpen, onClose, onScan, title = 'Kamera ilə Skan Et' }) => {
  const [errorMsg, setErrorMsg] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back camera) or 'user'
  const [isScanning, setIsScanning] = useState(false);
  const html5QrcodeRef = useRef(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setIsScanning(true);

    let timer = null;
    timer = setTimeout(() => {
      const scannerId = 'reader-video-container';
      const element = document.getElementById(scannerId);
      if (!element) return;

      try {
        const html5Qrcode = new Html5Qrcode(scannerId);
        html5QrcodeRef.current = html5Qrcode;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333333
        };

        html5Qrcode.start(
          { facingMode: facingMode },
          config,
          (decodedText) => {
            playBeep();
            onScan(decodedText);
            stopScanner();
            onClose();
          },
          (errorMessage) => {}
        ).catch(err => {
          console.error('Camera start error:', err);
          setErrorMsg('Kameraya giriş icazəsi verilmədi və ya kamera tapılmadı.');
          setIsScanning(false);
        });
      } catch (e) {
        console.error('Html5Qrcode init error:', e);
      }
    }, 150);

    return () => {
      if (timer) clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, facingMode]);

  const stopScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().then(() => {
        html5QrcodeRef.current.clear();
      }).catch(err => {
        console.error('Error stopping scanner:', err);
      });
    }
  };

  const toggleCamera = () => {
    stopScanner();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex flex-col items-center justify-between p-4 animate-in fade-in">
        {/* Header */}
        <div className="w-full max-w-md flex justify-between items-center text-white py-2 px-4 z-20">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-merkez-blue" />
            <span className="font-bold text-base">{title}</span>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center relative overflow-hidden my-4 rounded-3xl border-2 border-white/20 bg-black/40">
          {errorMsg ? (
            <div className="flex flex-col items-center text-center p-6 text-red-400 gap-3">
              <AlertCircle className="w-12 h-12" />
              <p className="text-sm font-medium">{errorMsg}</p>
              <button 
                onClick={() => setFacingMode(prev => prev)}
                className="mt-2 px-4 py-2 bg-white/10 rounded-xl text-white text-xs font-bold hover:bg-white/20"
              >
                Yenidən cəhd et
              </button>
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center">
              <div id="reader-video-container" className="w-full h-full object-cover rounded-3xl overflow-hidden" />
              
              {/* Scanning Target Box & Laser */}
              <div className="absolute w-72 h-44 border-2 border-merkez-blue rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.5)] pointer-events-none flex items-center justify-center overflow-hidden">
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
                
                {/* Corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-merkez-blue rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-merkez-blue rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-merkez-blue rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-merkez-blue rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="w-full max-w-md flex justify-center items-center gap-6 py-4 z-20">
          <button
            onClick={toggleCamera}
            className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all border border-white/10"
          >
            <RefreshCw className="w-4 h-4" />
            {facingMode === 'environment' ? 'Ön kamera' : 'Arxa kamera'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CameraScannerModal;
