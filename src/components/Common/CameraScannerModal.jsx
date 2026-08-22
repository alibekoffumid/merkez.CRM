import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, Zap } from 'lucide-react';
import ModalPortal from './ModalPortal';

const CameraScannerModal = ({ isOpen, onClose, onScan, title = 'Kamera ilə Skan Et' }) => {
  const [errorMsg, setErrorMsg] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
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

  const stopStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().catch(() => {}).finally(() => {
        try { html5QrcodeRef.current.clear(); } catch(e){}
      });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    setErrorMsg(null);
    let isCancelled = false;

    const startCamera = async () => {
      stopStream();

      // Method 1: Try Native WebRTC MediaStream
      try {
        const constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        setIsPermissionGranted(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play().catch(() => {});
        }

        // Check if native BarcodeDetector API is supported (Android Chrome / Modern Browsers)
        if ('BarcodeDetector' in window) {
          try {
            const detector = new window.BarcodeDetector({
              formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'itf']
            });

            const scanFrame = async () => {
              if (isCancelled || !videoRef.current) return;
              try {
                if (videoRef.current.readyState >= 2) {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    if (code) {
                      playBeep();
                      onScan(code);
                      stopStream();
                      onClose();
                      return;
                    }
                  }
                }
              } catch (e) {}
              if (!isCancelled) {
                animFrameRef.current = requestAnimationFrame(scanFrame);
              }
            };
            scanFrame();
            return;
          } catch (e) {
            console.log('BarcodeDetector fallback to html5Qrcode');
          }
        }

        // Fallback: Use Html5Qrcode on the scanner container
        const scannerId = 'reader-fallback-container';
        setTimeout(() => {
          if (isCancelled) return;
          try {
            const html5Qrcode = new Html5Qrcode(scannerId);
            html5QrcodeRef.current = html5Qrcode;
            html5Qrcode.start(
              { facingMode: facingMode },
              { fps: 10, qrbox: { width: 260, height: 160 } },
              (decodedText) => {
                playBeep();
                onScan(decodedText);
                stopStream();
                onClose();
              },
              () => {}
            ).catch(err => {
              console.error('Html5Qrcode start error:', err);
            });
          } catch (e) {}
        }, 300);

      } catch (err) {
        console.error('getUserMedia error:', err);
        // Secondary fallback to Html5Qrcode directly
        try {
          const scannerId = 'reader-fallback-container';
          const html5Qrcode = new Html5Qrcode(scannerId);
          html5QrcodeRef.current = html5Qrcode;
          await html5Qrcode.start(
            { facingMode: facingMode },
            { fps: 10, qrbox: { width: 260, height: 160 } },
            (decodedText) => {
              playBeep();
              onScan(decodedText);
              stopStream();
              onClose();
            },
            () => {}
          );
        } catch (fallbackErr) {
          console.error('All camera methods failed:', fallbackErr);
          setErrorMsg('Kameraya giriş daxil olmadı. Zəhmət olmasa brauzerdə kamera icazəsini yoxlayın.');
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [isOpen, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[10000] flex flex-col items-center justify-between p-4 animate-in fade-in">
        {/* Header */}
        <div className="w-full max-w-md flex justify-between items-center text-white py-2 px-4 z-20">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-merkez-blue" />
            <span className="font-bold text-base">{title}</span>
          </div>
          <button 
            onClick={() => { stopStream(); onClose(); }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center relative overflow-hidden my-4 rounded-3xl border-2 border-white/20 bg-gray-950">
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
            <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
              {/* Native Video Stream */}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />

              {/* Fallback container if native video stream doesn't attach */}
              <div id="reader-fallback-container" className="absolute inset-0 w-full h-full pointer-events-none opacity-0" />
              
              {/* Target Box & Laser Animation */}
              <div className="absolute w-72 h-44 border-2 border-merkez-blue rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.6)] pointer-events-none flex items-center justify-center overflow-hidden z-10">
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
                
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-merkez-blue rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-merkez-blue rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-merkez-blue rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-merkez-blue rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="w-full max-w-md flex justify-center items-center gap-4 py-3 z-20">
          <button
            onClick={toggleCamera}
            className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all border border-white/10"
          >
            <RefreshCw className="w-4 h-4" />
            {facingMode === 'environment' ? 'Arxa kamera' : 'Ön kamera'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CameraScannerModal;
