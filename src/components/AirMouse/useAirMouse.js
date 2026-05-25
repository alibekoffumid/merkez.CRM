/**
 * useAirMouse — Supabase Realtime version
 * ============================================================
 * Подписывается на Supabase Realtime broadcast-канал
 * `air-mouse-{sessionCode}` и транслирует жесты на CRM-курсор.
 *
 * Никакого локального сервера не нужно — всё через Supabase.
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export function useAirMouse(sessionCode) {
  // ── Состояние ─────────────────────────────────────────────
  const [isPinching, setIsPinching]   = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Интерполированные координаты (через RAF)
  const targetPos  = useRef({ x: 0.5, y: 0.5 });
  const currentPos = useRef({ x: 0.5, y: 0.5 });
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const rafId = useRef(null);

  const channelRef = useRef(null);
  const wasPinching = useRef(false);

  // ── Анимационный цикл (lerp) ──────────────────────────────
  const animate = useCallback(() => {
    const LERP = 0.18;
    currentPos.current.x += (targetPos.current.x - currentPos.current.x) * LERP;
    currentPos.current.y += (targetPos.current.y - currentPos.current.y) * LERP;

    setPosition({ x: currentPos.current.x, y: currentPos.current.y });
    rafId.current = requestAnimationFrame(animate);
  }, []);

  // ── Подключение к Supabase Realtime ──────────────────────
  useEffect(() => {
    if (!sessionCode) return;

    const channelName = `air-mouse-${sessionCode}`;

    // Запускаем RAF
    rafId.current = requestAnimationFrame(animate);

    // Подписываемся на broadcast канал
    const ch = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    ch.on('broadcast', { event: 'gesture' }, ({ payload }) => {
      if (!payload) return;

      switch (payload.type) {
        case 'MOVE':
          targetPos.current.x = payload.x;
          targetPos.current.y = payload.y;
          break;

        case 'PINCH_START':
          if (payload.x !== undefined) {
            targetPos.current.x = payload.x;
            targetPos.current.y = payload.y;
          }
          if (!wasPinching.current) {
            wasPinching.current = true;
            setIsPinching(true);
          }
          break;

        case 'PINCH_END':
          if (payload.x !== undefined) {
            targetPos.current.x = payload.x;
            targetPos.current.y = payload.y;
          }
          if (wasPinching.current) {
            wasPinching.current = false;
            setIsPinching(false);
          }
          break;

        default:
          break;
      }
    }).subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = ch;

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      supabase.removeChannel(ch);
    };
  }, [sessionCode, animate]);

  // ── Публичный API ─────────────────────────────────────────
  return {
    x: position.x,
    y: position.y,
    screenX: position.x * (typeof window !== 'undefined' ? window.innerWidth  : 1920),
    screenY: position.y * (typeof window !== 'undefined' ? window.innerHeight : 1080),
    isPinching,
    isConnected,
  };
}

export default useAirMouse;