export type TelemetryConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type TelemetryFrame = {
  deviceId: string;
  projectId: string;
  timestamp: string;
  mode: 'simulation' | 'digital_twin' | 'ai_commanded' | 'vision';
  servoX: number;
  servoY: number;
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
};

export interface TelemetryStoreState {
  status: TelemetryConnectionStatus;
  latestFrame: TelemetryFrame | null;
  deviceId: string | null;
  projectId: string | null;
  lastStatusMessage: string | null;
}

export const INITIAL_TELEMETRY_STATE: TelemetryStoreState = {
  status: 'disconnected',
  latestFrame: null,
  deviceId: null,
  projectId: null,
  lastStatusMessage: null,
};

export function isTelemetryFrame(value: unknown): value is TelemetryFrame {
  return (
    typeof value === 'object' &&
    value !== null &&
    'deviceId' in value &&
    'projectId' in value &&
    'timestamp' in value &&
    'servoX' in value &&
    'servoY' in value &&
    'topLeft' in value &&
    'topRight' in value &&
    'bottomLeft' in value &&
    'bottomRight' in value
  );
}
