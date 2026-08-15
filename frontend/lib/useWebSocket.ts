"use client";

import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export interface DataRefreshedMessage {
  type: "DATA_REFRESHED";
  event_count: number;
  mode: string;
  timestamp: string;
}

/**
 * Connects to the backend WebSocket and calls onMessage for each broadcast.
 * Auto-reconnects with backoff on disconnect. Returns live connection state
 * for the header's LIVE indicator.
 */
export function useLiveFeed(onMessage: (msg: DataRefreshedMessage) => void) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let closedByEffect = false;
    let attempt = 0;

    function connect() {
      try {
        socket = new WebSocket(WS_URL);
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callbackRef.current(data);
        } catch {
          // ignore malformed frames
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!closedByEffect) scheduleReconnect();
      };
      socket.onerror = () => {
        socket?.close();
      };
    }

    function scheduleReconnect() {
      attempt += 1;
      const delay = Math.min(30000, 1000 * 2 ** attempt);
      retryTimeout = setTimeout(connect, delay);
    }

    connect();

    return () => {
      closedByEffect = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      socket?.close();
    };
  }, []);

  return { connected };
}
