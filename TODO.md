# Phase 1 — Telemetry Spine (Arduino → Express → WebSocket)

## Objective
Create the telemetry spine connecting the physical Arduino UNO (COM10, 9600 baud)
to the existing Express backend, ending in a dedicated WebSocket telemetry channel
that is completely independent of the Gemini Live bridge. UI / renderer / AI
Copilot stay untouched.

## Steps
- [x] Approve plan + architecture review (Simulation / Digital Twin / AI modes)
- [x] Add `serialport` dependency to `package.json`
- [x] Create `server/telemetryTypes.ts` — shared types + validation ranges
- [x] Create `server/telemetryParser.ts` — safe JSON line parser
- [x] Create `server/serialBridge.ts` — SerialPort wrapper (env config, resilient)
- [x] Create `server/twinEngine.ts` — canonical Digital Twin state store
- [x] Create `server/telemetryChannel.ts` — dedicated `/ws/twin/*` hub
- [x] Wire bridge → engine → channel into `server.ts` (single entry point)
- [x] Route `/ws/twin/*` upgrades separately from Gemini `/ws`
- [x] Document env vars in `.env`
- [ ] Install dependency + type-check (`npm run lint`)

