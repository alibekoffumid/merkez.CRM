import { useEffect, useState, useRef, useCallback } from 'react';

export const useAirMouse = (serverUrl) => {
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [isPinching, setIsPinching] = useState(false);
  const [scrollDelta, setScrollDelta] = useState(0);
  const [scrollTick, setScrollTick] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const lastPositionRef = useRef({ x: 0.5, y: 0.5 });
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }
    if (isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    console.log(`Connecting to WebSocket at ${serverUrl}`);
    const ws = new WebSocket(serverUrl);

    ws.onopen = () => {
      console.log("AirMouse WebSocket connected");
      setIsConnected(true);
      isConnectingRef.current = false;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const messageType = String(data.type || '').toUpperCase();

      if (messageType === 'MOVE') {
        setX(data.x);
        setY(data.y);
        lastPositionRef.current = { x: data.x, y: data.y };
      } else if (messageType === 'SCROLL') {
        if (typeof data.deltaY === 'number') {
          setScrollDelta(data.deltaY);
          setScrollTick((tick) => tick + 1);
        }
      } else if (messageType === 'PINCH' || messageType === 'PINCH_START') {
        setIsPinching(true);
      } else if (messageType === 'PINCH_END') {
        setIsPinching(false);
      }
    };

    ws.onerror = (error) => {
      console.error("AirMouse WebSocket error:", error);
      isConnectingRef.current = false;
    };

    ws.onclose = () => {
      console.log("AirMouse WebSocket disconnected");
      setIsConnected(false);
      isConnectingRef.current = false;
      // Attempt to reconnect after a delay
      setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initial connection attempt
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { x, y, isPinching, isConnected, scrollDelta, scrollTick, connect, disconnect };
};