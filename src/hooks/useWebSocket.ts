"use client";

import { useEffect, useRef, useState } from "react";

interface UseWebSocketOptions {
  tallerId?: string | number | null;
  incidenteId?: string | number | null;
  onEvent?: (event: string, data: any) => void;
}

export function useWebSocket({ tallerId, incidenteId, onEvent }: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onEventRef = useRef(onEvent);
  
  // Keep the ref updated with the latest callback
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!tallerId && !incidenteId) return;

    let shouldReconnect = true;
    const reconnectDelay = 5000;

    const wsUrl = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? "wss://backend-si2-taller-385056433848.us-central1.run.app"
      : (process.env.NEXT_PUBLIC_WS_URL || "wss://backend-si2-taller-385056433848.us-central1.run.app");
    const tenantId = typeof window !== "undefined" 
      ? (localStorage.getItem("tenant_id") || localStorage.getItem("active_tenant_id") || "auxilio-norte") 
      : "auxilio-norte";

    let urlPath = "";
    if (tallerId) {
      urlPath = `/ws/taller/${tallerId}`;
    } else if (incidenteId) {
      urlPath = `/ws/incidente/${incidenteId}`;
    }

    const connect = () => {
      if (!shouldReconnect) return;

      console.log(`[useWebSocket] Attempting connection to ${urlPath}`);
      const socket = new WebSocket(`${wsUrl}${urlPath}?tenant_id=${tenantId}`);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        console.log(`[useWebSocket] connected to ${urlPath}`);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event && onEventRef.current) {
            onEventRef.current(data.event, data);
          }
        } catch (err) {
          console.warn("[useWebSocket] Error parsing message", err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        console.log(`[useWebSocket] disconnected from ${urlPath}`);
        if (shouldReconnect) {
          console.log(`[useWebSocket] Reconnecting in ${reconnectDelay / 1000}s...`);
          reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
        }
      };

      socket.onerror = () => {
        console.warn(`[useWebSocket] connection failed or closed on path: ${urlPath}`);
      };
    };

    connect();

    return () => {
      console.log("[useWebSocket] Cleanup trigger for urlPath:", urlPath);
      shouldReconnect = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, [tallerId, incidenteId]);

  const sendEvent = (event: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, ...payload }));
    } else {
      console.warn("[useWebSocket] WebSocket is not connected. Message skipped.");
    }
  };

  return { isConnected, sendEvent };
}
