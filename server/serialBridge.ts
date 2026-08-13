// ── Telemetry Spine: SerialBridge (Phase 1) ──
//
// Wraps the Node.js `serialport` package to read the Arduino's JSON telemetry
// over USB serial. Accumulates bytes into a line buffer (Arduino uses
// Serial.println → '\n'-terminated lines), parses each line safely, and emits
// the parsed sensor values. Fully resilient: if the port is missing or busy the
// bridge reports 'disconnected'/'error' and retries on a timer — the Express
// server never crashes because hardware is absent.
//
// Port + baud come from environment variables (ARDUINO_SERIAL_PORT /
// ARDUINO_SERIAL_BAUD) — nothing is hardcoded.

import { EventEmitter } from 'node:events';
import { SerialPort } from 'serialport';
import { parseTelemetryLine } from './telemetryParser';
import type { DeviceStatus, SensorTelemetry, TwinDeviceStatus } from './telemetryTypes';

export interface SerialBridgeOptions {
  deviceId: string;
  /** Serial device path, e.g. 'COM10' on Windows. From ARDUINO_SERIAL_PORT. */
  port: string;
  /** Baud rate, e.g. 9600. From ARDUINO_SERIAL_BAUD. */
  baudRate: number;
  /** Delay (ms) before re-attempting after a disconnect/failed open. */
  reconnectDelayMs?: number;
}

export class SerialBridge extends EventEmitter {
  private port: SerialPort | null = null;
  private lineBuffer = '';
  private status: DeviceStatus = 'disconnected';
  private lastFrameAt: string | null = null;
  private lastError: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private intentionalClose = false;
  private connecting = false;

  constructor(private readonly options: SerialBridgeOptions) {
    super();
  }

  private setLastError(err: Error | string | null): void {
    this.lastError = err ? String(err) : null;
  }

  /** Current link status for the TwinEngine / diagnostics. */
  get statusInfo(): TwinDeviceStatus {
    return {
      deviceId: this.options.deviceId,
      status: this.status,
      port: this.options.port,
      baudRate: this.options.baudRate,
      lastFrameAt: this.lastFrameAt,
      error: this.lastError ?? undefined,
    };
  }

  start(): void {
    this.intentionalClose = false;
    this.open();
  }

  stop(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.port) {
      try {
        this.port.close(() => undefined);
      } catch {
        /* already closed */
      }
    }
    this.port = null;
    this.setStatus('disconnected');
  }

  private open(): void {
    if (this.connecting || this.intentionalClose) return;
    this.connecting = true;
    this.setStatus('connecting');
    console.log(`[TelemetryDebug] SerialBridge.open() — ATTEMPTING to open ${this.options.port} @ ${this.options.baudRate} baud`);

    const port = new SerialPort({
      path: this.options.port,
      baudRate: this.options.baudRate,
      autoOpen: false,
    });
    this.port = port;

    port.on('data', (chunk: Buffer) => this.onData(chunk));

    port.on('error', (err) => {
      console.warn(`[TelemetryDebug] SerialPort "${this.options.port}" ERROR event: ${err.message}`);
      this.emit('error', err);
      // If we weren't already connected (open failed / transient), retry later.
      if (this.status !== 'connected') {
        this.setStatus('error');
        this.scheduleReconnect();
      }
    });

    port.on('close', () => {
      console.log(`[TelemetryDebug] SerialPort "${this.options.port}" CLOSE event (intentional=${this.intentionalClose})`);
      this.connecting = false;
      if (this.intentionalClose) return;
      this.setStatus('disconnected');
      this.scheduleReconnect();
    });

    port.open((err) => {
      this.connecting = false;
      if (err) {
        console.error(`[TelemetryDebug] SerialPort "${this.options.port}" OPEN FAILED: ${err.message}`);
        this.setStatus('error');
        this.emit('error', new Error(`[SerialBridge] Failed to open ${this.options.port}: ${err.message}`));
        this.scheduleReconnect();
        return;
      }
      console.log(`[TelemetryDebug] SerialPort "${this.options.port}" OPENED successfully @ ${this.options.baudRate} baud`);
      this.setStatus('connected');
    });
  }

  private onData(chunk: Buffer): void {
    const rawChunk = chunk.toString('utf8');
    console.log(`[RAW CHUNK] ${rawChunk}`);
    this.lineBuffer += rawChunk;

    let newlineIndex = this.lineBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = this.lineBuffer.slice(0, newlineIndex);
      this.lineBuffer = this.lineBuffer.slice(newlineIndex + 1);
      this.handleLine(line);
      newlineIndex = this.lineBuffer.indexOf('\n');
    }

    // Runaway-buffer guard: if the device emits garbage with no newline.
    if (this.lineBuffer.length > 8192) this.lineBuffer = '';
  }

  private handleLine(line: string): void {
    console.log(`[RAW LINE] ${JSON.stringify(line)}`);

    const sensors = parseTelemetryLine(line);

    if (!sensors) {
      console.warn(`[TelemetryDebug] [PARSER DROP] ${line}`);
      // Parsing failures are noisy serial artifacts, not a broken bridge.
      // Do not emit a bridge error event here so the physical telemetry
      // connection is not incorrectly downgraded to simulation mode.
      return;
    }

    console.log('[TelemetryDebug] [PARSER OK]', sensors);
    this.lastFrameAt = new Date().toISOString();
    this.emit('sensors', sensors);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.intentionalClose) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, this.options.reconnectDelayMs ?? 5000);
  }

  private setStatus(next: DeviceStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.emit('status', this.statusInfo);
  }
}

