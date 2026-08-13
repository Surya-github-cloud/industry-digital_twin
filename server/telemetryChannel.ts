// ── Telemetry Spine: TelemetryChannel (Phase 1) ──
//
// A dedicated WebSocket hub for Digital Twin telemetry, completely independent
// from the Gemini Live WebSocket. Clients connect to:
//   /ws/twin/:userId/:projectId
//
// The channel keeps the latest frame from the TwinEngine, broadcasts every new
// frame to the matching project's subscribers, and immediately replays the
// latest state to late joiners. Payloads are small latest-wins JSON envelopes —
// a dropped frame costs nothing because the next one overwrites it.

import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { TwinEngine } from './twinEngine';
import type { TelemetryFrame, TwinDeviceStatus } from './telemetryTypes';

interface ClientCtx {
  ws: WebSocket;
  userId: string;
  projectId: string;
  alive: boolean;
}

const HEARTBEAT_MS = 30_000;

export class TelemetryChannel {
  private wss = new WebSocketServer({ noServer: true });
  private clients = new Map<WebSocket, ClientCtx>();
  private engines = new Map<string, TwinEngine>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.wss.on('connection', (ws, req) => this.onConnection(ws, req));
  }

  /** True when this upgrade request belongs to the twin telemetry channel. */
  shouldHandle(pathname: string): boolean {
    return pathname.startsWith('/ws/twin/');
  }

  /** Route an upgrade into this channel (called from the server's upgrade handler). */
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const pathname = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`).pathname;
    console.log('[TWIN WS] HANDLE UPGRADE', { path: pathname });
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }

  /** Register a TwinEngine so its frames/status stream to matching clients. */
  registerEngine(engine: TwinEngine): void {
    this.engines.set(engine.projectId, engine);
    engine.on('frame', (frame: TelemetryFrame) => this.broadcast(engine.projectId, frame));
    engine.on('status', (status: TwinDeviceStatus) => this.broadcastStatus(engine.projectId, status));
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      for (const [ws, ctx] of this.clients) {
        if (!ctx.alive) {
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }
        ctx.alive = false;
        ws.ping();
      }
    }, HEARTBEAT_MS);
  }

  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const ws of this.clients.keys()) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
    this.clients.clear();
    this.wss.close();
  }

  private onConnection(ws: WebSocket, req: IncomingMessage): void {
    const pathname = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`).pathname;
    const parts = pathname.split('/').filter(Boolean); // ['ws','twin',userId,projectId]
    const userId = parts[2] ?? '';
    const projectId = parts[3] ?? '';

    const ctx: ClientCtx = { ws, userId, projectId, alive: true };
    this.clients.set(ws, ctx);
    console.log(`[TWIN WS] CLIENT CONNECTED user=${userId} project=${projectId}`);

    ws.on('pong', () => {
      const c = this.clients.get(ws);
      if (c) c.alive = true;
    });
    ws.on('close', () => {
      this.clients.delete(ws);
      console.log('[TWIN WS] CLIENT DISCONNECTED');
    });
    ws.on('error', (err) => {
      console.warn('[TWIN WS] CLIENT ERROR', err);
    });
    ws.on('message', (raw) => {
      // Client → server control messages (kept minimal for Phase 1).
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
        }
      } catch {
        /* ignore non-JSON */
      }
    });

    // Replay latest state immediately so a late joiner isn't left blank.
    const engine = this.engines.get(projectId);
    if (engine) {
      const frame = engine.latestFrame;
      if (frame) ws.send(JSON.stringify({ type: 'telemetry', frame }));
      const status = engine.snapshot.deviceStatus;
      if (status) ws.send(JSON.stringify({ type: 'status', status }));
      ws.send(
        JSON.stringify({ type: 'hello', deviceId: engine.deviceId, projectId, mode: engine.mode, t: Date.now() }),
      );
    } else {
      ws.send(JSON.stringify({ type: 'hello', deviceId: null, projectId, mode: null, t: Date.now() }));
    }
  }

  private broadcast(projectId: string, frame: TelemetryFrame): void {
    console.log(`[TWIN WS] TELEMETRY BROADCAST servoX=${frame.servoX} servoY=${frame.servoY}`);
    const payload = JSON.stringify({ type: 'telemetry', frame });
    for (const [ws, ctx] of this.clients) {
      if (ctx.projectId === projectId && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  private broadcastStatus(projectId: string, status: TwinDeviceStatus): void {
    const payload = JSON.stringify({ type: 'status', status });
    for (const [ws, ctx] of this.clients) {
      if (ctx.projectId === projectId && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

