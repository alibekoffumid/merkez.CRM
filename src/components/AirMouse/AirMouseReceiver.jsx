/**
 * AirMouseReceiver — неоновый курсор + симуляция кликов
 * Использует Supabase Realtime. Никакого локального сервера.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAirMouse } from './useAirMouse';

const AirMouseReceiver = ({ sessionCode, enabled = true, device = 'phone' }) => {
  const { screenX, screenY, isPinching, isConnected } = useAirMouse(
    enabled ? sessionCode : null
  );

  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem('merkez_airmouse_minimized') === 'true';
  });

  const cursorRef  = useRef(null);
  const rippleRef  = useRef(null);
  const wasPinch   = useRef(false);

  // Позиция курсора через прямой DOM (быстрее, без ре-рендера)
  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.style.left = `${screenX}px`;
      cursorRef.current.style.top  = `${screenY}px`;
    }
  }, [screenX, screenY]);

  // Разворачиваем виджет по сигналу из iframe (например, при калибровке)
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'airmouse_expand') {
        setIsMinimized(false);
        localStorage.setItem('merkez_airmouse_minimized', 'false');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Симуляция кликов при pinch
  useEffect(() => {
    if (isPinching && !wasPinch.current) {
      wasPinch.current = true;

      const el = document.elementFromPoint(screenX, screenY);
      if (el) {
        const init = { bubbles: true, cancelable: true, clientX: screenX, clientY: screenY, view: window };
        el.dispatchEvent(new MouseEvent('mousedown', init));
        el.dispatchEvent(new MouseEvent('mouseup',   init));
        el.dispatchEvent(new MouseEvent('click',     init));

        if (['INPUT','BUTTON','A','TEXTAREA','SELECT'].includes(el.tagName) || el.getAttribute('tabindex')) {
          el.focus?.();
        }
      }

      // Ripple
      if (rippleRef.current) {
        const r = rippleRef.current;
        r.style.animation = 'none';
        r.offsetHeight; // reflow
        r.style.animation = 'airMouseRipple 0.5s ease-out forwards';
      }
    } else if (!isPinching && wasPinch.current) {
      wasPinch.current = false;
    }
  }, [isPinching, screenX, screenY]);

  if (!enabled || !sessionCode) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes airMouseRipple {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(3); opacity: 0; }
        }
      `}} />

      {/* Курсор — показываем только когда подключено */}
      {isConnected && (
        <div style={{
          position: 'fixed', inset: 0,
          zIndex: 99999,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          <div
            ref={cursorRef}
            style={{
              position: 'absolute',
              width:  isPinching ? 20 : 32,
              height: isPinching ? 20 : 32,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              border: `2px solid ${isPinching ? 'rgba(34,197,94,0.9)' : 'rgba(99,102,241,0.8)'}`,
              background: isPinching
                ? 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
              boxShadow: isPinching
                ? '0 0 30px rgba(34,197,94,0.7), 0 0 80px rgba(34,197,94,0.3)'
                : '0 0 20px rgba(99,102,241,0.5), 0 0 60px rgba(99,102,241,0.2)',
              transition: 'width 0.12s, height 0.12s, border-color 0.12s, box-shadow 0.12s',
              willChange: 'left, top',
            }}
          >
            {/* Центральная точка */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: isPinching ? 8 : 5, height: isPinching ? 8 : 5,
              borderRadius: '50%',
              background: isPinching ? 'rgba(34,197,94,1)' : 'rgba(99,102,241,0.9)',
              transform: 'translate(-50%, -50%)',
              transition: 'all 0.12s',
            }} />

            {/* Ripple */}
            <div ref={rippleRef} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 40, height: 40,
              borderRadius: '50%',
              border: '2px solid rgba(34,197,94,0.6)',
              transform: 'translate(-50%,-50%) scale(0)',
              opacity: 0,
            }} />
          </div>
        </div>
      )}
      
      {/* Если выбрана камера ПК, встраиваем контроллер как iframe, чтобы браузер не морозил вкладку */}
      {device === 'pc' && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: isMinimized ? '56px' : '220px',
            height: isMinimized ? '56px' : '165px',
            borderRadius: isMinimized ? '50%' : '16px',
            border: '2px solid rgba(99,102,241,0.5)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: 99998,
            background: '#000',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            isolation: 'isolate',
            transform: 'translate3d(0,0,0)',
          }}
        >
          <iframe
            src={`/air-mouse.html?session=${sessionCode}&mode=iframe&v=5`}
            allow="camera; microphone"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              pointerEvents: isMinimized ? 'none' : 'auto',
            }}
          />

          {isMinimized ? (
            <div
              onClick={() => {
                setIsMinimized(false);
                localStorage.setItem('merkez_airmouse_minimized', 'false');
              }}
              title="Развернуть камеру Air Mouse"
              style={{
                position: 'absolute',
                inset: 0,
                cursor: 'pointer',
                background: 'rgba(99,102,241,0)',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0)'}
            >
              <div style={{
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}>
                📷
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsMinimized(true);
                localStorage.setItem('merkez_airmouse_minimized', 'true');
              }}
              title="Свернуть"
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'background 0.2s, transform 0.1s',
                zIndex: 10,
                outline: 'none',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              −
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default AirMouseReceiver;