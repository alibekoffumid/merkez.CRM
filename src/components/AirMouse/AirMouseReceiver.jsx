/**
 * ============================================================
 *  AirMouseReceiver — Неоновый курсор + симуляция кликов
 * ============================================================
 *
 *  Компонент рендерит кастомный курсор поверх всего интерфейса
 *  и симулирует клики/mousedown/mouseup в координатах курсора
 *  при получении pinch-жестов.
 *
 *  Использование:
 *    import AirMouseReceiver from './components/AirMouse/AirMouseReceiver';
 *
 *    function App() {
 *      return (
 *        <>
 *          <YourCRMContent />
 *          <AirMouseReceiver serverUrl="ws://localhost:8765" />
 *        </>
 *      );
 *    }
 * ============================================================
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAirMouse } from './useAirMouse';

// ── Стили курсора ──────────────────────────────────────────
const styles = {
  // Контейнер-обёртка (невидимый, на весь экран)
  wrapper: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 99999,
    pointerEvents: 'none', // Не перехватываем события мыши
    overflow: 'hidden',
  },

  // Основной курсор
  cursor: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid rgba(99, 102, 241, 0.8)',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
    boxShadow: '0 0 20px rgba(99, 102, 241, 0.5), 0 0 60px rgba(99, 102, 241, 0.2)',
    transform: 'translate(-50%, -50%)',
    transition: 'width 0.15s, height 0.15s, border-color 0.15s, box-shadow 0.15s, background 0.15s',
    willChange: 'left, top',
  },

  // Курсор в состоянии pinch (клик)
  cursorPinching: {
    width: 20,
    height: 20,
    border: '3px solid rgba(34, 197, 94, 0.9)',
    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.5) 0%, transparent 70%)',
    boxShadow: '0 0 30px rgba(34, 197, 94, 0.7), 0 0 80px rgba(34, 197, 94, 0.3)',
  },

  // Внутренняя точка курсора
  cursorDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'rgba(99, 102, 241, 0.9)',
    transform: 'translate(-50%, -50%)',
    transition: 'background 0.15s, width 0.15s, height 0.15s',
  },

  cursorDotPinching: {
    width: 8,
    height: 8,
    background: 'rgba(34, 197, 94, 1)',
  },

  // Кольцо-волна при клике
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '2px solid rgba(34, 197, 94, 0.6)',
    transform: 'translate(-50%, -50%) scale(0)',
    opacity: 1,
  },

  // Статус-бейдж
  statusBadge: {
    position: 'fixed',
    bottom: 16,
    right: 16,
    zIndex: 100000,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 12,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    fontFamily: 'Inter, -apple-system, sans-serif',
    pointerEvents: 'auto',
    cursor: 'pointer',
    transition: 'opacity 0.3s, transform 0.3s',
    userSelect: 'none',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    transition: 'background 0.3s, box-shadow 0.3s',
  },
};

// ── Компонент ──────────────────────────────────────────────

const AirMouseReceiver = ({
  serverUrl = 'ws://localhost:8765',
  showStatusBadge = true,
  enabled = true,
}) => {
  const { screenX, screenY, isPinching, isConnected, connect, disconnect } = useAirMouse(
    serverUrl,
    enabled
  );

  const cursorRef = useRef(null);
  const rippleRef = useRef(null);
  const wasPinching = useRef(false);
  const [visible, setVisible] = useState(true);

  // ── Обновляем позицию курсора через DOM напрямую (производительность) ──
  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.style.left = `${screenX}px`;
      cursorRef.current.style.top = `${screenY}px`;
    }
  }, [screenX, screenY]);

  // ── Симуляция кликов при pinch ────────────────────────────
  useEffect(() => {
    if (isPinching && !wasPinching.current) {
      // ── PINCH START → mousedown + click ──────────────────
      wasPinching.current = true;

      const x = screenX;
      const y = screenY;

      // Находим элемент под курсором
      const element = document.elementFromPoint(x, y);
      if (element) {
        console.log('🖐️ Air Mouse click:', element.tagName, element.className?.slice?.(0, 50));

        // Генерируем события мыши
        const eventInit = {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          view: window,
        };

        element.dispatchEvent(new MouseEvent('mousedown', eventInit));
        element.dispatchEvent(new MouseEvent('mouseup', eventInit));
        element.dispatchEvent(new MouseEvent('click', eventInit));

        // Фокусируем, если это input/button/a
        if (element.focus && (
          element.tagName === 'INPUT' ||
          element.tagName === 'BUTTON' ||
          element.tagName === 'A' ||
          element.tagName === 'TEXTAREA' ||
          element.tagName === 'SELECT' ||
          element.getAttribute('tabindex')
        )) {
          element.focus();
        }
      }

      // Анимация ripple
      triggerRipple();

    } else if (!isPinching && wasPinching.current) {
      // ── PINCH END → mouseup ──────────────────────────────
      wasPinching.current = false;
    }
  }, [isPinching, screenX, screenY]);

  // ── Анимация волны при клике ───────────────────────────────
  function triggerRipple() {
    if (!rippleRef.current) return;

    const el = rippleRef.current;
    // Сбрасываем анимацию
    el.style.animation = 'none';
    // Force reflow
    el.offsetHeight; // eslint-disable-line no-unused-expressions
    el.style.animation = 'airMouseRipple 0.5s ease-out forwards';
  }

  // Не рендерим если выключено
  if (!enabled) return null;

  // Не рендерим курсор если не подключены
  const showCursor = isConnected;

  return (
    <>
      {/* ── CSS-анимации ──────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes airMouseRipple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
          }
        }

        @keyframes airMousePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}} />

      {/* ── Курсор ────────────────────────────────────────── */}
      {showCursor && (
        <div style={styles.wrapper}>
          <div
            ref={cursorRef}
            style={{
              ...styles.cursor,
              ...(isPinching ? styles.cursorPinching : {}),
            }}
          >
            {/* Внутренняя точка */}
            <div
              style={{
                ...styles.cursorDot,
                ...(isPinching ? styles.cursorDotPinching : {}),
              }}
            />

            {/* Ripple при клике */}
            <div ref={rippleRef} style={styles.ripple} />
          </div>
        </div>
      )}

      {/* ── Статус-бейдж ──────────────────────────────────── */}
      {showStatusBadge && (
        <div
          style={{
            ...styles.statusBadge,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
          }}
          onClick={() => {
            if (isConnected) {
              disconnect();
            } else {
              connect();
            }
          }}
          title={isConnected ? 'Нажмите чтобы отключить Air Mouse' : 'Нажмите чтобы подключить Air Mouse'}
        >
          <div
            style={{
              ...styles.statusDot,
              background: isConnected ? '#22c55e' : '#ef4444',
              boxShadow: isConnected
                ? '0 0 8px rgba(34, 197, 94, 0.6)'
                : '0 0 8px rgba(239, 68, 68, 0.6)',
            }}
          />
          <span>
            🖐️ Air Mouse: {isConnected ? 'ON' : 'OFF'}
          </span>
        </div>
      )}
    </>
  );
};

export default AirMouseReceiver;
