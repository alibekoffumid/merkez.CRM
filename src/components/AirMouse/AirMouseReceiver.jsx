import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAirMouse } from './useAirMouse';

const CURSOR_SIZE = 34;

const AirMouseReceiver = ({ serverUrl = 'ws://localhost:8765', showStatusBadge = true, enabled = true }) => {
  const { x, y, isPinching, isConnected, scrollDelta, scrollTick, connect, disconnect } = useAirMouse(serverUrl);
  const cursorRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const currentTargetRef = useRef(null);
  const lastPointerPositionRef = useRef({ x: 0.5, y: 0.5 });
  const [currentTargetInfo, setCurrentTargetInfo] = useState('none');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const lastClickTimeRef = useRef(0);

  const getScrollContainer = useCallback(() => {
    if (scrollContainerRef.current) return scrollContainerRef.current;

    const candidates = [
      document.querySelector('.h-full.overflow-y-auto'),
      document.querySelector('.overflow-y-auto'),
      document.querySelector('main .overflow-y-auto'),
      document.scrollingElement,
      document.documentElement,
      document.body,
    ];

    const found = candidates.find((el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(el);
      return el.scrollHeight > el.clientHeight && /auto|scroll/.test(style.overflowY);
    });

    scrollContainerRef.current = found || document.scrollingElement || document.documentElement;
    return scrollContainerRef.current;
  }, []);

  const dispatchEventToTarget = useCallback((target, type, clientX, clientY, button = 0) => {
    if (!target) return;

    const eventInit = {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    };

    if (typeof PointerEvent === 'function' && /^(mousedown|mousemove|mouseup|click|pointerover|pointerout|pointerenter|pointerleave)$/.test(type)) {
      const pointerEvent = new PointerEvent(type.replace(/^mouse/, 'pointer'), eventInit);
      target.dispatchEvent(pointerEvent);
    }

    const mouseEvent = new MouseEvent(type, eventInit);
    target.dispatchEvent(mouseEvent);

    if (/^(mouseover|mouseout|mouseenter|mouseleave)$/.test(type)) {
      const domEvent = new Event(type, { bubbles: true, cancelable: true });
      target.dispatchEvent(domEvent);
    }
  }, []);

  const updatePointerTarget = useCallback((clientX, clientY) => {
    const target = document.elementFromPoint(clientX, clientY);
    const prevTarget = currentTargetRef.current;

    if (prevTarget !== target) {
      if (prevTarget) {
        dispatchEventToTarget(prevTarget, 'mouseout', clientX, clientY);
        dispatchEventToTarget(prevTarget, 'pointerout', clientX, clientY);
        dispatchEventToTarget(prevTarget, 'mouseleave', clientX, clientY);
      }
      if (target) {
        dispatchEventToTarget(target, 'mouseover', clientX, clientY);
        dispatchEventToTarget(target, 'pointerover', clientX, clientY);
        dispatchEventToTarget(target, 'mouseenter', clientX, clientY);
      }
      currentTargetRef.current = target;
      setCurrentTargetInfo(target ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}${target.className ? `.${String(target.className).replace(/\s+/g, '.')}` : ''}` : 'none');
    }

    return target;
  }, [dispatchEventToTarget]);

  const emulateMouseEvent = useCallback((type, clientX, clientY, button = 0) => {
    const target = updatePointerTarget(clientX, clientY);
    dispatchEventToTarget(target, type, clientX, clientY, button);
  }, [dispatchEventToTarget, updatePointerTarget]);

  const triggerClick = useCallback((clientX, clientY) => {
    const target = updatePointerTarget(clientX, clientY);
    if (!target) return;
    if (typeof target.focus === 'function') target.focus();
    if (typeof target.click === 'function') {
      target.click();
    } else {
      dispatchEventToTarget(target, 'click', clientX, clientY, 0);
    }
  }, [dispatchEventToTarget, updatePointerTarget]);

  const handlePinch = useCallback(() => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 200) { // Debounce clicks
      return;
    }

    const clientX = x * window.innerWidth;
    const clientY = y * window.innerHeight;

    if (!isMouseDown) {
      emulateMouseEvent('mousedown', clientX, clientY, 0);
      setIsMouseDown(true);
    }
    lastClickTimeRef.current = now;
  }, [x, y, isMouseDown, emulateMouseEvent]);

  const handlePinchRelease = useCallback(() => {
    if (isMouseDown) {
      const clientX = x * window.innerWidth;
      const clientY = y * window.innerHeight;

      emulateMouseEvent('mouseup', clientX, clientY, 0);
      triggerClick(clientX, clientY);
      setIsMouseDown(false);
    }
  }, [x, y, isMouseDown, emulateMouseEvent, triggerClick]);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }
    connect();
    return () => disconnect();
  }, [enabled, connect, disconnect]);

  useEffect(() => {
    if (!enabled) return;

    const clientX = x * window.innerWidth;
    const clientY = y * window.innerHeight;
    const prev = lastPointerPositionRef.current;
    const deltaX = clientX - prev.x;
    const deltaY = clientY - prev.y;

    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate3d(${clientX - CURSOR_SIZE / 2}px, ${clientY - CURSOR_SIZE / 2}px, 0)`;
    }

    if (deltaX !== 0 || deltaY !== 0) {
      emulateMouseEvent('mousemove', clientX, clientY, 0);
    }

    lastPointerPositionRef.current = { x: clientX, y: clientY };

    if (isPinching) {
      handlePinch();
    } else {
      handlePinchRelease();
    }
  }, [x, y, isPinching, enabled, handlePinch, handlePinchRelease, emulateMouseEvent]);

  useEffect(() => {
    if (!enabled || scrollTick === 0) return;
    if (!scrollDelta) return;

    const scrollTarget = getScrollContainer();
    const amount = scrollDelta * 700;

    if (scrollTarget === document.scrollingElement || scrollTarget === document.documentElement || scrollTarget === document.body) {
      window.scrollBy({ top: amount, left: 0, behavior: 'auto' });
      return;
    }

    if (typeof scrollTarget.scrollBy === 'function') {
      scrollTarget.scrollBy({ top: amount, left: 0, behavior: 'auto' });
    } else if ('scrollTop' in scrollTarget) {
      scrollTarget.scrollTop += amount;
    }
  }, [scrollDelta, scrollTick, enabled, getScrollContainer]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={cursorRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: CURSOR_SIZE,
          height: CURSOR_SIZE,
          borderRadius: '50%',
          backgroundColor: isPinching ? 'rgba(239, 68, 68, 0.75)' : 'rgba(59, 130, 246, 0.75)',
          border: '2px solid rgba(255,255,255,0.95)',
          boxShadow: isPinching ? '0 0 0 14px rgba(239, 68, 68, 0.25)' : '0 0 0 16px rgba(59, 130, 246, 0.30)',
          zIndex: 999999,
          pointerEvents: 'none',
          willChange: 'transform',
          opacity: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: CURSOR_SIZE * 0.4,
            height: CURSOR_SIZE * 0.4,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.95)',
            boxShadow: '0 0 0 4px rgba(255,255,255,0.2)',
          }}
        />
      </div>
      {showStatusBadge && (
        <div
          style={{
            position: 'fixed',
            bottom: 10,
            left: 10,
            padding: '5px 10px',
            borderRadius: '5px',
            backgroundColor: isConnected ? 'green' : 'red',
            color: 'white',
            fontSize: '12px',
            zIndex: 100000,
          }}
        >
          {isConnected ? 'AirMouse: Connected' : 'AirMouse: Disconnected'}
        </div>
      )}
    </>
  );
};

export default AirMouseReceiver;