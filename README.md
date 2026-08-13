# Digital Twin Solar Tracker

This project is a digital-twin application for a dual-axis solar tracker with live telemetry, Arduino-style sensor feedback, WebSocket streaming, and a browser-based visualization layer.

## What this repo contains

- React + Vite frontend for the twin UI and simulation workspace
- Express + TypeScript backend in `server.ts`
- serial telemetry bridge for live Arduino input
- canonical digital-twin engine for stamping telemetry frames
- WebSocket channel for real-time telemetry broadcasting
- simulation fallback when hardware telemetry is unavailable

## Core architecture

- `server.ts`: server bootstrap, Express app, Vite dev mode, telemetry spine setup
- `server/serialBridge.ts`: serial port bridge to hardware telemetry
- `server/telemetryParser.ts`: validation and parsing of raw sensor lines
- `server/twinEngine.ts`: canonical source of digital-twin state
- `server/telemetryChannel.ts`: WebSocket broadcast hub
- `server/telemetryTypes.ts`: telemetry schema and validation ranges
- `src/hooks/useTelemetryTwin.ts`: frontend subscriber for twin updates
- `src/components/ohmlet/views/IndustrialCopilotView.tsx`: digital-twin dashboard and visualization

## Telemetry model

The canonical telemetry payload includes quadrant LDR values and servo positions:

- `topLeft`
- `topRight`
- `bottomLeft`
- `bottomRight`
- `servoX`
- `servoY`

## Local run

Prerequisites:
- Node.js

Commands:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Type check:

```bash
npm run lint
```

## Environment notes

- Hardware telemetry depends on an Arduino serial connection.
- The app can fall back to simulation when hardware is unavailable.
- Gemini-related AI features depend on a configured `GEMINI_API_KEY`.

## Project status

This repo is structured as a functional digital-twin prototype and telemetry environment for a solar-tracker system. It is suitable for architecture review, telemetry workflow validation, and project reporting, but it should not be described as production-ready without additional deployment and hardware validation.

## License

This project is provided as-is for local development and demonstration purposes.
