/**
 * ============================================================
 *  useAirMouse — React-хук для приёма жестов Air Mouse
 * ============================================================
 *
 *  Подключается к WebSocket серверу Air Mouse и возвращает:
 *    - x, y         — координаты курсора (0..1)
 *    - screenX, screenY — координаты в пикселях экрана
 *    - isPinching   — зажат ли pinch-жест
 *    - isConnected  — подключён ли к серверу
 *    - connect()    — подключиться
 *    - disconnect() — отключиться
 *
 *  Использование:
 *    const { screenX, screenY, isPinching, isConnected } = useAirMouse('ws://localhost:8765');
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useAirMouse(serverUrl = 'ws://localhost:8765', autoConnect = true) {
  // ── Состояние ─────────────────────────────────────────────
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [isPinching, setIsPinching] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Ref для WebSocket (чтобы не пересоздавать на каждый рендер)
  const wsRef = useRef(null);

  // Ref для requestAnimationFrame-сглаживания
  const targetPos = useRef({ x: 0.5, y: 0.5 });
  const currentPos = useRef({ x: 0.5, y: 0.5 });
  const rafId = useRef(null);

  // ── Анимационный цикл для плавного перемещения ────────────
  const animate = useCallback(() => {
    const lerp = 0.15; // Коэффициент интерполяции (0..1, выше = быстрее)

    currentPos.current.x += (targetPos.current.x - currentPos.current.x) * lerp;
    currentPos.current.y += (targetPos.current.y - currentPos.current.y) * lerp;

    setPosition({
      x: currentPos.current.x,
      y: currentPos.current.y,
    });

    rafId.current = requestAnimationFrame(animate);
  }, []);

  // ── Подключение к серверу ─────────────────────────────────
  const connect = useCallback(() => {
    // Если уже подключены, ничего не делаем
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('🖐️ Air Mouse: подключён к', serverUrl);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'MOVE':
              // Обновляем целевую позицию (анимация интерполирует)
              targetPos.current.x = data.x;
              targetPos.current.y = data.y;
              break;

            case 'PINCH_START':
              setIsPinching(true);
              // Обновляем позицию из pinch-события тоже
              if (data.x !== undefined) {
                targetPos.current.x = data.x;
                targetPos.current.y = data.y;
              }
              break;

            case 'PINCH_END':
              setIsPinching(false);
              if (data.x !== undefined) {
                targetPos.current.x = data.x;
                targetPos.current.y = data.y;
              }
              break;

            case 'WELCOME':
              console.log('🖐️ Air Mouse:', data.message);
              break;

            default:
              break;
          }
        } catch (err) {
          // Игнорируем невалидный JSON
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('🖐️ Air Mouse: отключён');

        // Автопереподключение через 3 секунды
        setTimeout(() => {
          if (wsRef.current === ws) {
            console.log('🖐️ Air Mouse: переподключение...');
            connect();
          }
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error('🖐️ Air Mouse: ошибка WebSocket', err);
      };
    } catch (err) {
      console.error('🖐️ Air Mouse: не удалось подключиться:', err.message);
    }
  }, [serverUrl]);

  // ── Отключение ────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // ── Жизненный цикл ───────────────────────────────────────
  useEffect(() => {
    // Запускаем анимационный цикл
    rafId.current = requestAnimationFrame(animate);

    // Автоподключение
    if (autoConnect) {
      connect();
    }

    return () => {
      // Очистка при размонтировании
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [animate, autoConnect, connect]);

  // ── Возвращаем данные ─────────────────────────────────────
  return {
    // Нормализованные координаты (0..1)
    x: position.x,
    y: position.y,

    // Координаты в пикселях экрана
    screenX: position.x * (typeof window !== 'undefined' ? window.innerWidth : 1920),
    screenY: position.y * (typeof window !== 'undefined' ? window.innerHeight : 1080),

    // Состояние жестов
    isPinching,

    // Состояние подключения
    isConnected,

    // Управление
    connect,
    disconnect,
  };
}

export default useAirMouse;
