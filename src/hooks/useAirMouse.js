import { useEffect, useRef, useState } from 'react';

export function useAirMouse(wsUrl = 'ws://192.168.100.9:8765') {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState('IDLE');

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('✅ Air Mouse WebSocket подключен');
          setIsConnected(true);
          setStatus('CONNECTED');
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'MOVE') {
              setMousePos({ x: data.x, y: data.y });
              setStatus('MOVING');
            } else if (data.type === 'CLICK') {
              setStatus('CLICKED');
              setTimeout(() => setStatus('CONNECTED'), 200);
            } else if (data.type === 'WELCOME') {
              console.log('📨', data.message);
            }
          } catch (err) {
            console.error('❌ JSON parse error:', err);
          }
        };

        ws.current.onerror = (error) => {
          console.error('🔴 WebSocket error:', error);
          setIsConnected(false);
          setStatus('ERROR');
        };

        ws.current.onclose = () => {
          console.log('❌ Air Mouse WebSocket отключен');
          setIsConnected(false);
          setStatus('DISCONNECTED');
          // Переподключение через 3 сек
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error('❌ WebSocket connection error:', error);
        setIsConnected(false);
        setStatus('ERROR');
      }
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [wsUrl]);

  return {
    isConnected,
    mousePos,
    status,
    ws: ws.current
  };
}
