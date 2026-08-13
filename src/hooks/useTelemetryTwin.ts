import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TelemetryConnectionStatus, TelemetryFrame } from '../state/TelemetryStore';

const normalizeWsUrl = (url: string) => url.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');

type UseTelemetryTwinOptions = {
  wsUrl: string;
  userId: string;
  projectId: string;
  autoConnect?: boolean;
};

type UseTelemetryTwinReturn = {
  status: TelemetryConnectionStatus;
  latestFrame: TelemetryFrame | null;
  deviceId: string | null;
  projectId: string | null;
  lastStatusMessage: string | null;
  connect: () => void;
  disconnect: () => void;
};

export function useTelemetryTwin({ wsUrl, userId, projectId, autoConnect = false }: UseTelemetryTwinOptions): UseTelemetryTwinReturn {
  const [status, setStatus] = useState<TelemetryConnectionStatus>('disconnected');
  const [latestFrame, setLatestFrame] = useState<TelemetryFrame | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [connectedProjectId, setConnectedProjectId] = useState<string | null>(null);
  const [lastStatusMessage, setLastStatusMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  const url = useMemo(() => {
    const target = normalizeWsUrl(wsUrl);
    return `${target}/ws/twin/${encodeURIComponent(userId)}/${encodeURIComponent(projectId)}`;
  }, [wsUrl, userId, projectId]);

  const cleanupWebSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    reconnectAttemptsRef.current = 0;
    cleanupWebSocket();
    setStatus('disconnected');
  }, [cleanupWebSocket]);

  const connect = useCallback(() => {
    const currentState = wsRef.current?.readyState;
    if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
      return;
    }

    intentionalCloseRef.current = false;
    console.log('[Telemetry UI] Connecting to Digital Twin WebSocket...');
    setStatus('connecting');
    setLastStatusMessage('Connecting to Digital Twin WebSocket...');

    console.log('[Telemetry UI] WebSocket URL:', url);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.error('[Telemetry UI] WebSocket construction failed:', err);
      setStatus('error');
      setLastStatusMessage('WebSocket construct failed.');
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Telemetry UI] Connected to', url);
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
      setLastStatusMessage('Connected / Waiting for telemetry');
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;

      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.type === 'telemetry' && parsed.frame) {
          const frame = parsed.frame as TelemetryFrame;
          console.log(`[Telemetry UI] Telemetry received: servoX=${frame.servoX} servoY=${frame.servoY}`);
          setLatestFrame(frame);
          setLastStatusMessage(`Telemetry received: servoX=${frame.servoX} servoY=${frame.servoY}`);
        } else if (parsed?.type === 'status' && parsed.status) {
          setLastStatusMessage(`Device status: ${parsed.status.status} (${parsed.status.port}:${parsed.status.baudRate})`);
        } else if (parsed?.type === 'hello') {
          setDeviceId(parsed.deviceId || null);
          setConnectedProjectId(parsed.projectId || null);
          setLastStatusMessage(`Connected to telemetry channel for project ${parsed.projectId || '<unknown>'}.`);
        }
      } catch (err) {
        console.warn('[Telemetry UI] Received malformed websocket payload:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('[Telemetry UI] Disconnected', {
        code: event?.code,
        reason: event?.reason,
        wasClean: event?.wasClean,
      });
      wsRef.current = null;
      if (intentionalCloseRef.current) {
        setStatus('disconnected');
        setLastStatusMessage('Disconnected');
        return;
      }

      setStatus('connecting');
      const attempt = reconnectAttemptsRef.current;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      reconnectAttemptsRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
      setLastStatusMessage(`Telemetry websocket reconnecting in ${delay / 1000}s...`);
    };

    ws.onerror = (event) => {
      console.error('[Telemetry UI] WebSocket error:', event);
      setStatus('error');
      setLastStatusMessage('WebSocket error detected.');
    };
  }, [url]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      intentionalCloseRef.current = true;
      cleanupWebSocket();
    };
  }, [autoConnect, connect, disconnect, cleanupWebSocket]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  return {
    status,
    latestFrame,
    deviceId,
    projectId: connectedProjectId,
    lastStatusMessage,
    connect,
    disconnect,
  };
}
