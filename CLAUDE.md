# CLAUDE.md

## Purpose

This repository is a digital-twin application for a solar-tracker / hardware-telemetry project. The main job for Claude in this repo is to help produce a clear, evidence-based project report for the digital twin system, not to perform broad, unrelated refactors.

Use this file as the operating guide for report-generation work only. Stay within scope: analyze the repo, explain what the system does, summarize current status, identify risks and gaps, and produce a readable report for stakeholders.

## Task scope

Focus only on:
- digital twin architecture
- telemetry pipeline and live hardware integration
- simulation / WebSocket behavior
- project readiness and operational gaps
- recommendations and next steps for reporting

Do not expand the task into unrelated product features, broad app cleanup, or speculative redesigns unless the user asks explicitly.

## Project summary

This project combines:
- a React + Vite frontend in the root app
- an Express + TypeScript server in [server.ts](server.ts)
- a serial telemetry bridge for Arduino hardware in [server/serialBridge.ts](server/serialBridge.ts)
- a canonical digital-twin engine in [server/twinEngine.ts](server/twinEngine.ts)
- live telemetry broadcasting over WebSockets in [server/telemetryChannel.ts](server/telemetryChannel.ts)
- a UI-driven digital-twin panel in [src/components/ohmlet/views/IndustrialCopilotView.tsx](src/components/ohmlet/views/IndustrialCopilotView.tsx)

The digital twin is a solar-tracker product with quadrant LDR sensor inputs, servo actuation, and a live telemetry system. The core telemetry model is defined in [server/telemetryTypes.ts](server/telemetryTypes.ts) and includes values such as topLeft, topRight, bottomLeft, bottomRight, servoX, and servoY.

## Primary repo entry points

Read these files first when preparing a report:
- [README.md](README.md)
- [package.json](package.json)
- [server.ts](server.ts)
- [server/telemetryTypes.ts](server/telemetryTypes.ts)
- [server/serialBridge.ts](server/serialBridge.ts)
- [server/twinEngine.ts](server/twinEngine.ts)
- [server/telemetryChannel.ts](server/telemetryChannel.ts)
- [src/hooks/useTelemetryTwin.ts](src/hooks/useTelemetryTwin.ts)
- [src/components/ohmlet/views/IndustrialCopilotView.tsx](src/components/ohmlet/views/IndustrialCopilotView.tsx)

## Architecture to understand

### 1. Telemetry spine
The system has a live hardware path:
- Arduino emits one JSON telemetry line per loop
- [server/serialBridge.ts](server/serialBridge.ts) opens the serial port and listens for data
- [server/telemetryParser.ts](server/telemetryParser.ts) validates and parses the payload
- [server/twinEngine.ts](server/twinEngine.ts) stamps the canonical frame with deviceId, projectId, timestamp, and mode
- [server/telemetryChannel.ts](server/telemetryChannel.ts) broadcasts the latest frame through a WebSocket channel

### 2. Frontend digital-twin UI
The UI uses the telemetry hook to connect to the twin channel and updates live values, including servo angles and sensor readings. The smart solar-tracker view calculates LDR intensity and power metrics based on the sun angle and current servo orientation.

### 3. Modes and states
The system supports modes such as simulation, digital_twin, ai_commanded, and vision in [server/telemetryTypes.ts](server/telemetryTypes.ts). In practice, the current implementation centers on the digital-twin + serial-driven path with graceful simulation fallback.

## Report-generation workflow

When asked to prepare a report, Claude should follow this sequence:

1. Confirm the report type.
   - default: technical status / architecture / readiness report
   - if the user asks for a stakeholder summary, shorten and improve business language
   - if the user asks for a technical deep dive, include architecture, control flow, and risk analysis

2. Read the repo evidence.
   - Start with [README.md](README.md), [package.json](package.json), and [server.ts](server.ts)
   - Then read telemetry and twin implementation files
   - Confirm actual implemented behavior rather than inferred behavior

3. Summarize what is already working.
   - identify real features present in code
   - cite how telemetry is ingested, framed, and broadcast
   - note the use of serial bridges, WebSockets, and simulated fallback

4. Summarize what is incomplete or risky.
   - missing environment configuration (for example, Arduino hardware or GEMINI_API_KEY)
   - simulation fallback logic
   - hardware dependency for physical device telemetry
   - potential deployment or operational constraints

5. Produce the report in a structured format.
   - executive summary
   - system overview
   - technical architecture
   - data flow
   - operational status
   - risks and issues
   - recommendations
   - next steps

## Required report style

The report should be:
- factual and evidence-based
- concise but complete
- organized with clear headings
- written for a technical audience unless the user asks for a non-technical version
- grounded in repo evidence, not generic AI assumptions

## Default output template

Use this structure:

```md
# Digital Twin Project Report

## Executive Summary
- One paragraph summarizing the project and current maturity.

## Project Purpose
- What the system is trying to achieve.

## Current Architecture
- Frontend
- Backend
- Telemetry spine
- Twin engine

## Data Flow
1. Sensor input from Arduino
2. Serial parsing and validation
3. Twin engine canonical frame generation
4. WebSocket broadcasting
5. UI updates and digital-twin visualization

## What Is Working
- list implemented capabilities

## Current Gaps / Risks
- list dependency risks, config assumptions, and operational concerns

## Recommendations
- prioritized actions

## Next Steps
- short action plan
```

## Evidence rules

Claude must:
- prefer repo evidence over assumptions
- explain uncertainty when the repo lacks proof
- clearly separate implemented functionality from aspirational claims
- keep the output specific to this project and not generic to all digital-twin systems

## Operational guidance

### Running locally
Use the repo scripts in [package.json](package.json):
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`

### Environment dependencies
The app expects:
- Node.js
- Arduino serial connection when using live telemetry
- environment variables for port and hardware configuration
- Gemini API key if AI features are enabled via [server.ts](server.ts)

### Typical project context to reference
The repo clearly demonstrates:
- digital twin of a dual-axis solar tracker
- quadrant LDR monitoring
- servo-based direction correction
- telemetry broadcast and UI sync
- fallback simulation when hardware is absent

## Guardrails

Claude should not:
- claim the project is production-ready without evidence
- invent missing features or undocumented integrations
- rewrite the entire codebase unless explicitly requested
- create a huge report without a clear summary section

## Final behavior

For this repo, Claude should treat the task as a focused research-and-summary workflow: inspect the implementation, synthesize the current status, and return a polished report for the user.

If asked to write the actual report, produce a polished markdown report with the template above, tailored to the solar-tracker digital-twin implementation found in this repository.
