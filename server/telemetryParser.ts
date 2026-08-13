// ── Telemetry Spine: safe parser (Phase 1) ──
//
// Parses ONE Arduino JSON line into a SensorTelemetry, or null if the line is
// malformed. Never throws — corrupt / partial / non-telemetry lines are simply
// dropped (the serial bridge feeds whole lines split on '\n').

import type { SensorTelemetry } from './telemetryTypes';
import { TELEMETRY_RANGES } from './telemetryTypes';

const KEYS: Array<keyof SensorTelemetry> = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'servoX', 'servoY'];

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function parseTelemetryLine(line: string): SensorTelemetry | null {
  let trimmed = line.trim();
  if (!trimmed) {
    console.warn('[TelemetryDebug] [PARSER DROP] empty line');
    return null;
  }

  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < jsonStart) {
    console.warn('[TelemetryDebug] [PARSER DROP] invalid JSON boundaries');
    return null;
  }
  if (jsonStart > 0 || jsonEnd < trimmed.length - 1) {
    trimmed = trimmed.slice(jsonStart, jsonEnd + 1).trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    console.warn('[TelemetryDebug] [PARSER DROP] JSON parse error:', trimmed);
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    console.warn('[TelemetryDebug] [PARSER DROP] unexpected payload type');
    return null;
  }
  const obj = parsed as Record<string, unknown>;

  const out: Partial<SensorTelemetry> = {};
  for (const key of KEYS) {
    let value = obj[key];
    if (typeof value === 'string' && value.trim() !== '') {
      value = Number(value);
    }
    if (!isFiniteNumber(value)) {
      console.warn(`[TelemetryDebug] [PARSER DROP] invalid value for ${key}: ${String(obj[key])}`);
      return null;
    }
    const [min, max] = TELEMETRY_RANGES[key];
    if (value < min || value > max) {
      console.warn(`[TelemetryDebug] [PARSER DROP] ${key} out of range: ${value} (expected ${min}-${max})`);
      return null;
    }
    out[key] = value;
  }

  console.log('[TelemetryDebug] [PARSER OK]', out);
  return out as SensorTelemetry;
}

