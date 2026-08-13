// ── Telemetry Spine: TwinEngine (Phase 1) ──
//
// The canonical source of Digital Twin state. It sits between the SerialBridge
// (and, in future phases, the simulator / AI command bus / computer vision) and
// the TelemetryChannel. Any source pushes sensor updates through ingest(); the
// engine stamps the canonical envelope (deviceId, projectId, timestamp, mode)
// and emits 'frame' for the channel to broadcast.
//
// This is the single seam future Modes plug into — the transport and the UI do
// not need to know which source is driving the Twin.

import { EventEmitter } from 'node:events';
import { SerialBridge } from './serialBridge';
import type { SensorTelemetry, TelemetryFrame, TwinDeviceStatus, TwinMode } from './telemetryTypes';

export interface TwinEngineOptions {
  deviceId: string;
  projectId: string;
  mode?: TwinMode;
}

export interface TwinStateSnapshot {
  mode: TwinMode;
  deviceId: string;
  projectId: string;
  latestFrame: TelemetryFrame | null;
  lastFrameAt: string | null;
  frameCount: number;
  deviceStatus: TwinDeviceStatus | null;
}

export type TwinFrameSource = 'serial' | 'simulation' | 'ai' | 'vision';

export class TwinEngine extends EventEmitter {
  private currentMode: TwinMode;
  private sensors: SensorTelemetry | null = null;
  private frameCount = 0;
  private deviceStatus: TwinDeviceStatus | null = null;

  constructor(private readonly options: TwinEngineOptions) {
    super();
    this.currentMode = options.mode ?? 'digital_twin';
  }

  get projectId(): string {
    return this.options.projectId;
  }

  get deviceId(): string {
    return this.options.deviceId;
  }

  get mode(): TwinMode {
    return this.currentMode;
  }

  /** The most recent canonical frame (null until the first update arrives). */
  get latestFrame(): TelemetryFrame | null {
    return this.sensors ? this.composeFrame(this.sensors) : null;
  }

  get snapshot(): TwinStateSnapshot {
    return {
      mode: this.currentMode,
      deviceId: this.options.deviceId,
      projectId: this.options.projectId,
      latestFrame: this.latestFrame,
      lastFrameAt: this.latestFrame?.timestamp ?? null,
      frameCount: this.frameCount,
      deviceStatus: this.deviceStatus,
    };
  }

  setMode(mode: TwinMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.emit('mode', mode);
  }

  /** Wire a SerialBridge to the engine (Phase 1: the physical Arduino). */
  attachBridge(bridge: SerialBridge): void {
    bridge.on('sensors', (sensors) => this.ingest(sensors, 'serial'));
    bridge.on('status', (status) => {
      this.deviceStatus = status;
      this.emit('status', status);
    });
  }

  /**
   * Push a sensor update from ANY source (serial now; simulation / AI / vision
   * later). The engine stamps the canonical envelope and emits the frame.
   */
  ingest(sensors: SensorTelemetry, source: TwinFrameSource = 'serial'): TelemetryFrame {
    console.log(`[TelemetryDebug] [TWIN ENGINE] source=${source} servoX=${sensors.servoX} servoY=${sensors.servoY}`);
    this.sensors = { ...sensors };
    const frame = this.composeFrame(this.sensors, source);
    this.frameCount += 1;
    this.emit('frame', frame);
    console.log('[TelemetryDebug] [EMITTED TO TWIN ENGINE]');
    return frame;
  }

  private composeFrame(sensors: SensorTelemetry, _source?: TwinFrameSource): TelemetryFrame {
    return {
      ...sensors,
      deviceId: this.options.deviceId,
      projectId: this.options.projectId,
      timestamp: new Date().toISOString(),
      mode: this.currentMode,
    };
  }
}

