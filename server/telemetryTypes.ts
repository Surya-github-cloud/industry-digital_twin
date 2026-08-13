// ── Telemetry Spine: shared types & validation ranges (Phase 1) ──
//
// The canonical types for the Digital Twin telemetry spine. The physical Arduino
// emits one JSON line per loop; the parser extracts the sensor values, and the
// TwinEngine stamps them with context (deviceId, projectId, timestamp, mode) to
// produce the full TelemetryFrame — the canonical Twin state.

/** Operating mode of the Twin. Phase 1 drives 'digital_twin' from the serial
 *  bridge. Future modes plug into the same TwinEngine ingest surface. */
export type TwinMode = 'simulation' | 'digital_twin' | 'ai_commanded' | 'vision';

/** Raw sensor values extracted from the Arduino JSON line. */
export interface SensorTelemetry {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
  servoX: number;
  servoY: number;
}

/** The full canonical frame broadcast to Twin clients. */
export interface TelemetryFrame extends SensorTelemetry {
  deviceId: string;
  projectId: string;
  /** ISO-8601 timestamp of when the frame was received by the engine. */
  timestamp: string;
  mode: TwinMode;
}

export type DeviceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TwinDeviceStatus {
  deviceId: string;
  status: DeviceStatus;
  port: string;
  baudRate: number;
  lastFrameAt: string | null;
  error?: string;
}

/** Physical validation ranges. A value outside its range means a corrupt line. */
export const TELEMETRY_RANGES: Record<keyof SensorTelemetry, readonly [number, number]> = {
  topLeft: [0, 1023],
  topRight: [0, 1023],
  bottomLeft: [0, 1023],
  bottomRight: [0, 1023],
  servoX: [0, 180],
  servoY: [0, 180],
};

