import { useEffect, useRef } from 'react';

export const useClapDetector = (enabled, onClap) => {
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    let active = true;
    const CLAP_THRESHOLD = 65; // диапазон 0 - 127
    const BACKGROUND_SILENCE_LIMIT = 20;
    const COOLDOWN_MS = 600; // задержка между хлопками

    let lastClapTime = 0;
    const recentMaxVolumes = [];

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Авто-возобновление AudioContext при кликах (политика автозапуска в браузерах)
        const handleInteraction = () => {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(err => console.warn('Ошибка автозапуска AudioContext:', err));
          }
        };
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);

        const detect = () => {
          if (!active) return;

          analyser.getByteTimeDomainData(dataArray);

          let maxVal = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = Math.abs(dataArray[i] - 128);
            if (val > maxVal) {
              maxVal = val;
            }
          }

          const now = Date.now();
          const recentMaxVolumeAvg = recentMaxVolumes.length > 0
            ? recentMaxVolumes.reduce((a, b) => a + b, 0) / recentMaxVolumes.length
            : 0;

          if (maxVal > CLAP_THRESHOLD) {
            if (now - lastClapTime > COOLDOWN_MS) {
              if (recentMaxVolumeAvg < BACKGROUND_SILENCE_LIMIT) {
                lastClapTime = now;
                if (onClap) onClap();
              }
            }
          }

          recentMaxVolumes.push(maxVal);
          if (recentMaxVolumes.length > 15) {
            recentMaxVolumes.shift();
          }

          animationFrameRef.current = requestAnimationFrame(detect);
        };

        detect();

        return () => {
          window.removeEventListener('click', handleInteraction);
          window.removeEventListener('touchstart', handleInteraction);
        };
      } catch (err) {
        console.warn('Доступ к микрофону отклонен или недоступен для обнаружения хлопков:', err);
      }
    };

    initAudio();

    return () => {
      active = false;
      cleanup();
    };

    function cleanup() {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        audioContextRef.current = null;
      }
    }
  }, [enabled, onClap]);
};
