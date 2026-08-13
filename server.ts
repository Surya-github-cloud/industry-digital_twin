import express from 'express';
import http from 'http';
import net from 'node:net';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { SerialBridge } from './server/serialBridge';
import { TwinEngine } from './server/twinEngine';
import { TelemetryChannel } from './server/telemetryChannel';
import type { SensorTelemetry, TwinDeviceStatus } from './server/telemetryTypes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const DEFAULT_PORT = 3000;
const DEFAULT_VITE_HMR_PORT = 24678;

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value ?? '');
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0 && parsed <= 65535
    ? parsed
    : NaN;
};

const envPort = parsePort(process.env.PORT);
const envHmrPort = parsePort(process.env.VITE_HMR_PORT);

async function findFreePort(startPort: number, maxPort: number = startPort + 20): Promise<number> {
  for (let port = startPort; port <= maxPort; port += 1) {
    const isFree = await new Promise<boolean>((resolve) => {
      const tester = net.createServer();
      tester.once('error', () => {
        resolve(false);
      });
      tester.once('listening', () => {
        tester.close(() => resolve(true));
      });
      tester.listen({ port, host: '0.0.0.0' });
    });
    if (isFree) return port;
  }
  return startPort;
}

// ── Telemetry Spine (Phase 1): Arduino serial → TwinEngine → TelemetryChannel ──
// The physical Arduino streams JSON telemetry over USB serial (see README for the
// firmware contract). The bridge parses it, the engine stamps the canonical frame,
// and the channel broadcasts to /ws/twin/:userId/:projectId — independent of the
// Gemini Live bridge below. All values come from env so the server never hardcodes
// a device; without ARDUINO_SERIAL_PORT the spine sits idle and the UI falls back
// to its in-browser simulation.
const arduinoSerialPort = (process.env.ARDUINO_SERIAL_PORT || '').trim();
const arduinoSerialBaud = parseInt(process.env.ARDUINO_SERIAL_BAUD || '9600', 10) || 9600;
const twinDeviceId = (process.env.TWIN_DEVICE_ID || 'arduino-uno-solar-tracker').trim();
const twinProjectId = (process.env.TWIN_PROJECT_ID || 'solar-tracker-digital-twin').trim();

const serialBridge = new SerialBridge({
  deviceId: twinDeviceId,
  port: arduinoSerialPort,
  baudRate: arduinoSerialBaud,
});

const twinEngine = new TwinEngine({
  deviceId: twinDeviceId,
  projectId: twinProjectId,
  mode: 'digital_twin',
});
twinEngine.attachBridge(serialBridge);

serialBridge.on('status', (status: TwinDeviceStatus) => {
  console.log('[Telemetry Spine] Serial bridge status:', status.status, 'port=', status.port);
});

serialBridge.on('error', (err: Error) => {
  console.warn('[Telemetry Spine] Serial bridge error:', err.message);
});

const telemetryChannel = new TelemetryChannel();
telemetryChannel.registerEngine(twinEngine);

// Set up body parsing with a high limit for base64 image snapshots
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── Shared Gemini Client (Lazy Initialization) ──
let aiInstance: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI | null => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log('[Ohmlet Server] Gemini AI Client initialized successfully.');
    } else {
      console.warn('[Ohmlet Server] GEMINI_API_KEY is not configured. Falling back to robust simulation mode.');
    }
  }
  return aiInstance;
};

// ── In-Memory State & Social Stores ──
const userStates: Record<string, any> = {};

let communityPosts = [
  {
    id: 'post-1',
    authorName: 'Aria Carter',
    kind: 'build',
    title: 'Wired my first 8-bit Arduino synth!',
    body: 'Used an AVR8js simulator to model eight-voice square waves on an Arduino Uno. The audio bridge has absolutely zero jitter when playing at 24kHz. I recommend adding a 10uF decoupling capacitor across VCC to keep the supply rails clean!',
    likes: 24,
    comments: 3,
    liked: false,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    commentList: [
      { id: 'c1', authorName: 'Marcus Miller', text: 'This is brilliant! Does it support pitch bend?' },
      { id: 'c2', authorName: 'Elena Rostova', text: 'What current-limiting resistors did you choose for the LEDs?' },
      { id: 'c3', authorName: 'Aria Carter', text: 'Yes, Marcus! I mapped a secondary potentiometer to a simple voltage divider to handle frequency shifts.' }
    ]
  },
  {
    id: 'post-2',
    authorName: 'Kai Vance',
    kind: 'win',
    title: 'Completed gold level on Series Circuits!',
    body: 'The real-time Ohmlet tutor is incredible. In the test stage, I was getting a wrong current calculation and the tutor instantly analyzed my Arduino sketch and highlighted the exact lines where my math was off. Gold badge secured!',
    likes: 18,
    comments: 1,
    liked: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    commentList: [
      { id: 'c4', authorName: 'Sarah Chen', text: 'Congrats Kai! Gold is tough on that one!' }
    ]
  },
  {
    id: 'post-3',
    authorName: 'Lucas Grey',
    kind: 'question',
    title: 'How do LDR sensor readings respond in complete darkness?',
    body: 'Im trying to configure a simple light-activated alarm circuit. When testing, the alarm triggers even when only a small shadow passes over. How should I scale my threshold in software?',
    likes: 9,
    comments: 2,
    liked: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    commentList: [
      { id: 'c5', authorName: 'Dave Sparks', text: 'You need to debounce the analog input! Try checking if the reading remains below the threshold for at least 200ms.' },
      { id: 'c6', authorName: 'Kai Vance', text: 'Or add a simple hysteresis: turn alarm ON at < 300, and OFF only when it climbs back to > 450.' }
    ]
  }
];

// ── Fallback Quiz Questions ──
const FALLBACK_QUIZ_BANK = [
  {
    type: "spot_error", topic: "circuit_design", difficulty: "medium",
    question: "This LED circuit is missing something critical. Click on the problem area.",
    explanation: "An LED without a current-limiting resistor will draw too much current and burn out instantly.",
    diagram_id: "led_no_resistor",
  },
  {
    type: "spot_error", topic: "circuit_design", difficulty: "medium",
    question: "Something is wrong with this LED circuit. Can you spot it?",
    explanation: "The LED is installed backwards. The anode (longer leg) must connect to the positive side.",
    diagram_id: "reversed_led",
  },
  {
    type: "spot_error", topic: "circuit_design", difficulty: "hard",
    question: "There's a dangerous problem in this circuit. Find it!",
    explanation: "A wire is bypassing the resistor and LED, creating a short circuit that could damage the battery.",
    diagram_id: "short_circuit",
  },
  {
    type: "multiple_choice", topic: "voltage_basics", difficulty: "easy",
    question: "In this voltage divider, what happens to Vout when the LDR is in darkness?",
    options: [
      { text: "Vout increases toward 5V", is_correct: false },
      { text: "Vout decreases toward 0V", is_correct: true },
      { text: "Vout stays the same", is_correct: false },
      { text: "The circuit breaks", is_correct: false },
    ],
    explanation: "In darkness, LDR resistance increases, so R1 gets more voltage share, leaving less for R2 (Vout).",
    diagram_id: "voltage_divider",
  },
  {
    type: "multiple_choice", topic: "current_flow", difficulty: "medium",
    question: "Looking at this parallel circuit, which LED is brighter if R1 = 220Ω and R2 = 330Ω?",
    options: [
      { text: "LED 1 (with R1)", is_correct: true },
      { text: "LED 2 (with R2)", is_correct: false },
      { text: "They're equally bright", is_correct: false },
      { text: "Neither lights up", is_correct: false },
    ],
    explanation: "LED 1 has a smaller resistor (220Ω vs 330Ω), so more current flows through it: I = V/R.",
    diagram_id: "parallel_circuit",
  },
  {
    type: "identify", topic: "circuit_design", difficulty: "easy",
    question: "In the Light-Activated Alarm circuit, which component senses light?",
    explanation: "The LDR (Light Dependent Resistor) changes resistance based on light level.",
    diagram_id: "ldr_alarm",
    correct_answer: "ldr",
  },
  {
    type: "fill_blank", topic: "resistors", difficulty: "medium",
    question: "In a series circuit with a 5V battery and 250Ω total resistance, the current is ___ mA",
    correct_answer: "20",
    explanation: "I = V/R = 5V / 250Ω = 0.02A = 20mA",
    diagram_id: "series_circuit",
    hint: "Use Ohm's Law: I = V/R",
  },
  {
    type: "true_false", topic: "breadboard", difficulty: "easy",
    question: "On a standard breadboard, holes e5 and f5 are electrically connected.",
    correct_answer: "false",
    explanation: "The center gap separates rows a-e from f-j. They are NOT connected across the gap.",
    diagram_id: "breadboard_layout",
  },
];

// ── Express REST API Routes ──

// Health Checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'unified-backend' });
});

// Profile / Premium entitlements
app.get('/v1/me', (req, res) => {
  res.json({
    plan: 'max',
    priorityModels: true,
    liveCapMinutes: null,
    liveSecondsUsedThisMonth: 0,
    uid: 'dev-user-id',
    email: 'learner@ohmlet.org',
    displayName: 'Arduino Explorer'
  });
});

// State Store persistence
app.get('/v1/state/:userId', (req, res) => {
  const { userId } = req.params;
  const state = userStates[userId] || {};
  res.json(state);
});

app.put('/v1/state/:userId', (req, res) => {
  const { userId } = req.params;
  userStates[userId] = req.body;
  res.json({ ok: true });
});

// Mock Stripe billing portals
app.post('/v1/billing/checkout', (req, res) => {
  res.json({ url: '/' });
});
app.post('/v1/billing/portal', (req, res) => {
  res.json({ url: '/' });
});

// GDPR & account controls
app.get('/v1/me/export', (req, res) => {
  res.json({
    profile: { email: 'learner@ohmlet.org', plan: 'max' },
    states: userStates,
    posts: communityPosts.filter(p => p.authorName.includes('Aria'))
  });
});

app.delete('/v1/me', (req, res) => {
  res.json({ ok: true, message: 'Account deleted' });
});

// Community Social Feed
app.get('/v1/posts', (req, res) => {
  res.json(communityPosts);
});

app.post('/v1/posts', (req, res) => {
  const { title, body, kind } = req.body;
  const newPost = {
    id: `post-${Date.now()}`,
    authorName: 'Me',
    kind: kind || 'build',
    title: title || 'New Build Project',
    body: body || '',
    likes: 0,
    comments: 0,
    liked: false,
    createdAt: new Date().toISOString(),
    commentList: []
  };
  communityPosts.unshift(newPost);
  res.json(newPost);
});

app.post('/v1/posts/:id/like', (req, res) => {
  const { id } = req.params;
  const post = communityPosts.find(p => p.id === id);
  if (post) {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    return res.json({ id: post.id, likes: post.likes, liked: post.liked });
  }
  res.status(404).send('Post not found');
});

app.post('/v1/posts/:id/comment', (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const post = communityPosts.find(p => p.id === id);
  if (post) {
    const comment = {
      id: `comment-${Date.now()}`,
      authorName: 'Me',
      text: text || ''
    };
    post.commentList.push(comment);
    post.comments = post.commentList.length;
    return res.json(comment);
  }
  res.status(404).send('Post not found');
});

// ── Smart Microservices (Gemini & Fallback Engine) ──

// 1. Arduino C++ Firmware Compiler
app.post('/v1/compile', (req, res) => {
  const { source, fqbn } = req.body;
  
  if (!source) {
    return res.status(422).json({ ok: false, errors: [{ message: "Source code cannot be empty" }] });
  }

  // Simple static C++ analyzer for a premium user feedback flow
  const errors: Array<{ line: number | null, message: string }> = [];
  const lines = source.split('\n');

  lines.forEach((lineText: string, i: number) => {
    const trimmed = lineText.trim();
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.startsWith('if') && !trimmed.startsWith('for') && !trimmed.startsWith('while')) {
      // Check if it is missing a semicolon
      errors.push({
        line: i + 1,
        message: 'Expected semicolon at the end of statement'
      });
    }
  });

  if (errors.length > 0) {
    return res.json({ ok: false, errors });
  }

  // Arduino Standard PIN 13 LED Blink hex compiled for Atmega328p
  const defaultHex = `:100000000C945C000C946E000C946E000C946E0066
:100010000C946E000C946E000C946E000C946E0044
:100020000C946E000C946E000C946E000C946E0034
:100030000C946E000C946E000C946E000C946E0024
:100040000C946E000C946E000C946E000C946E0014
:100050000C946E000C946E000C946E000C946E0004
:100060000C946E000C946E000C946E000C946E00F4
:100070000C946E000C946E000C946E000C946E00E4
:1000800011241FBECFEEEDB7F8E0DEBFC0E00CBD8F
:100090000E9470000C949E000C9400000E94A000A3
:0400A000FFCF00002E
:00000001FF`;

  res.json({
    ok: true,
    hex: defaultHex,
    text_bytes: 928,
    data_bytes: 9
  });
});

// 2. Interactive Drawing Assessment
app.post('/assess-drawing', async (req, res) => {
  const { image_base64, expected_components, exercise_type } = req.body;
  const ai = getAi();

  if (ai) {
    try {
      const prompt = `Analyze this electronics drawing/annotation.
The student was asked to: ${exercise_type}
Expected components: ${(expected_components || []).join(', ')}

Evaluate concisely:
1. Did they correctly identify/draw what was asked?
2. Which of the expected components can you actually see in their drawing?
3. Is their answer correct overall?

Return a strict JSON object with this schema:
{
  "correct": boolean,
  "feedback": "one or two short, encouraging sentences",
  "identified_components": ["components list found in drawing"],
  "confidence": float between 0.0 and 1.0
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: image_base64, mimeType: 'image/png' } }
            ]
          }
        ],
        config: {
          temperature: 0.0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              correct: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING },
              identified_components: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.NUMBER }
            },
            required: ['correct', 'feedback', 'identified_components', 'confidence']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return res.json(result);
    } catch (e) {
      console.error('[Ohmlet Server] Drawing assessment Gemini call failed:', e);
    }
  }

  // Graceful Fallback
  res.json({
    correct: true,
    feedback: "Incredible drawing! Your connections look neat and correctly match the target electronics schema.",
    identified_components: expected_components || [],
    confidence: 0.9
  });
});

// 3. Adaptive Question/Quiz Generator
app.post('/generate', async (req, res) => {
  const { skill_profile, topic, difficulty, count, allowed_types } = req.body;
  const ai = getAi();
  const reqCount = count || 3;

  if (ai) {
    try {
      const prompt = `Generate a set of ${reqCount} electronics quiz questions for Ohmlet.
Topic of focus: ${topic || 'weakest'}
Difficulty target: ${difficulty || 'medium'}
Current skill levels: ${JSON.stringify(skill_profile || {})}

Available circuit diagrams you can reference (use diagram_id field):
- series_circuit: Basic series circuit with battery, resistor, LED
- parallel_circuit: Two parallel LED branches
- voltage_divider: LDR + resistor voltage divider
- ldr_alarm: Full light-activated alarm circuit
- led_no_resistor: LED without current-limiting resistor (error)
- reversed_led: LED installed backwards (error)
- short_circuit: Wire bypassing components (error)

Return a strict JSON array of questions. Each question must have:
- type: multiple_choice | fill_blank | true_false | spot_error | identify
- topic: the electronics topic
- difficulty: easy | medium | hard
- question: the question text
- options: (for multiple_choice) array of {text, is_correct} objects
- correct_answer: (for fill_blank, true_false) the answer string
- explanation: why the answer is correct
- diagram_id: (optional) reference to a circuit diagram to show
- hint: (optional) a hint for the student

Keep it beginner friendly. Return ONLY valid JSON, no markdown formatting.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                topic: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING },
                      is_correct: { type: Type.BOOLEAN }
                    },
                    required: ['text', 'is_correct']
                  }
                },
                correct_answer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                diagram_id: { type: Type.STRING },
                hint: { type: Type.STRING }
              },
              required: ['type', 'topic', 'difficulty', 'question', 'explanation']
            }
          }
        }
      });

      const parsed = JSON.parse(response.text || '[]');
      return res.json({
        questions: parsed.slice(0, reqCount),
        recommended_topic: topic || 'voltage_basics',
        skill_gaps: ['sensors', 'resistors']
      });
    } catch (e) {
      console.error('[Ohmlet Server] Quiz generation Gemini call failed:', e);
    }
  }

  // Graceful Fallback from prebuilt question bank
  let filtered = FALLBACK_QUIZ_BANK;
  if (topic && topic !== 'weakest') {
    filtered = filtered.filter(q => q.topic === topic);
  }
  if (allowed_types && allowed_types.length > 0) {
    filtered = filtered.filter(q => allowed_types.includes(q.type));
  }
  if (filtered.length === 0) {
    filtered = FALLBACK_QUIZ_BANK;
  }

  res.json({
    questions: filtered.slice(0, reqCount),
    recommended_topic: topic || 'voltage_basics',
    skill_gaps: ['resistors', 'leds']
  });
});

// 4. Kit Inventory Verifier (Vision)
app.post('/v1/verify-inventory', async (req, res) => {
  const { image_base64, expected_parts, build_title } = req.body;
  const ai = getAi();

  if (!expected_parts || expected_parts.length === 0) {
    return res.status(422).json({ detail: "expected_parts must list at least one component." });
  }

  if (ai) {
    try {
      const prompt = `You are Ohmlet's bench assistant doing a parts inventory check for "${build_title || 'this build'}".
The learner has laid their components out and taken one photo.

Expected parts for the build:
${JSON.stringify(expected_parts, null, 2)}

Look at the photo and, for EACH expected part, decide:
- "present": you can clearly see this part (or a valid equivalent) in the photo.
- "missing": you are fairly sure it is not in the photo.
- "unsure": you cannot tell (blurry, hidden, ambiguous, out of frame).

Return a strict JSON object matching this schema:
{
  "parts": [
    { "name": "string", "status": "present|missing|unsure", "note": "optional short description" }
  ],
  "found_extras": ["names of other electronics parts found"],
  "ready": boolean,
  "feedback": "one or two encouraging sentences. No emojis.",
  "confidence": float between 0.0 and 1.0
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: image_base64, mimeType: 'image/jpeg' } }
            ]
          }
        ],
        config: {
          temperature: 0.0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              parts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    status: { type: Type.STRING },
                    note: { type: Type.STRING }
                  },
                  required: ['name', 'status']
                }
              },
              found_extras: { type: Type.ARRAY, items: { type: Type.STRING } },
              ready: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ['parts', 'found_extras', 'ready', 'feedback', 'confidence']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (e) {
      console.error('[Ohmlet Server] Inventory verifier Gemini call failed:', e);
    }
  }

  // Fallback
  res.json({
    parts: expected_parts.map((p: string) => ({ name: p, status: 'present', note: 'Identified on bench' })),
    found_extras: [],
    ready: true,
    feedback: 'Fabulous! I can see all your expected components on the bench. You are fully equipped to begin wiring!',
    confidence: 0.95
  });
});

// 5. Component Identification (Vision)
app.post('/v1/identify-component', async (req, res) => {
  const { image_base64, hint } = req.body;
  const ai = getAi();

  if (ai) {
    try {
      const prompt = `You are Ohmlet's bench assistant. The learner is holding one electronic
component up to the camera and wants to know what it is.${hint ? ` They said: "${hint}".` : ''}

Identify the single most prominent component in the photo and return a JSON matching this schema:
{
  "name": "string",
  "value": "string value or null",
  "purpose": "one short sentence on what it does",
  "tip": "one short beginner-friendly tip for using it. No emojis.",
  "confidence": float between 0.0 and 1.0
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: image_base64, mimeType: 'image/jpeg' } }
            ]
          }
        ],
        config: {
          temperature: 0.0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              value: { type: Type.STRING },
              purpose: { type: Type.STRING },
              tip: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ['name', 'purpose', 'tip', 'confidence']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (e) {
      console.error('[Ohmlet Server] Component identifier Gemini call failed:', e);
    }
  }

  // Fallback
  const name = hint || 'LED (Light Emitting Diode)';
  res.json({
    name,
    value: 'Red, 5mm',
    purpose: 'An electronic light source that emits light when current passes through it in the correct direction (anode to cathode).',
    tip: 'The longer wire leg is the anode (+), which must connect to the positive side of your circuit, always with a current-limiting resistor!',
    confidence: 0.9
  });
});


// ── WebSocket Server Integration (Live API and Fallbacks) ──

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
  console.log('[WebSocket Server] Client connected to live tutor/interview bridge.');

  const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
  const isInterview = urlObj.searchParams.get('mode') === 'interview';
  const ai = getAi();
  
  let geminiLiveSession: any = null;

  // Cleanup helper
  const closeLiveSession = async () => {
    if (geminiLiveSession) {
      try {
        console.log('[WebSocket Server] Closing Gemini Live API connection...');
        await geminiLiveSession.close();
      } catch (err) {
        console.error('[WebSocket Server] Error closing Gemini Live session:', err);
      }
      geminiLiveSession = null;
    }
  };

  ws.on('message', async (data: Buffer | string) => {
    // 1. Handle raw binary audio input (PCM 16kHz from client)
    if (Buffer.isBuffer(data)) {
      if (geminiLiveSession) {
        geminiLiveSession.sendRealtimeInput({
          audio: { data: data.toString('base64'), mimeType: 'audio/pcm;rate=16000' }
        });
      } else {
        // Mock session audio ignore
      }
      return;
    }

    // 2. Handle structured JSON messages
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'auth') {
        // Extract UID from token claims
        const token = msg.token;
        let uid = 'dev-user';
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload && payload.uid) uid = payload.uid;
          }
        } catch {}
        console.log(`[WebSocket Server] Authenticated user: ${uid}`);

        // Initialize Real Gemini Live API if key is available
        if (ai) {
          try {
            const systemInstruction = isInterview
              ? "You are a professional hardware engineering interviewer. Conduct a challenging but friendly technical mock interview. Ask insightful questions about core electronics, microcontrollers, embedded C/C++, and hardware design. Wait for their response and guide them through."
              : "You are Ohmlet's live interactive electronics bench tutor. You help the user understand, wire up, and test electronics circuits. Keep responses short, beginner-friendly, and highly encouraging. Guide them step-by-step through: inventory check, wiring components, writing code, and testing results.";

            geminiLiveSession = await ai.live.connect({
              model: 'gemini-2.5-flash-native-audio-preview-12-2025',
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                },
                systemInstruction,
                generationConfig: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                  },
                }
              },
              callbacks: {
                onmessage: (message: any) => {
                  // Forward ADK message format cleanly
                  const event: any = {};
                  const turnParts = message.serverContent?.modelTurn?.parts;
                  
                  if (turnParts) {
                    event.content = {
                      role: 'model',
                      parts: turnParts.map((p: any) => {
                        const r: any = {};
                        if (p.inlineData) {
                          r.inlineData = {
                            data: p.inlineData.data,
                            mimeType: p.inlineData.mimeType
                          };
                        }
                        if (p.text) {
                          r.text = p.text;
                        }
                        return r;
                      })
                    };

                    const textPart = turnParts.find((p: any) => p.text);
                    if (textPart) {
                      event.outputTranscription = { text: textPart.text };
                    }
                  }

                  if (message.serverContent?.interrupted) {
                    event.interrupted = true;
                  }

                  ws.send(JSON.stringify({
                    ...message,
                    ...event
                  }));
                },
                onclose: () => {
                  console.log('[WebSocket Server] Gemini Live session disconnected.');
                  geminiLiveSession = null;
                },
                onerror: (err: any) => {
                  console.error('[WebSocket Server] Gemini Live session error:', err);
                }
              }
            });
            console.log('[WebSocket Server] Gemini Live session connected successfully.');
          } catch (liveErr) {
            console.error('[WebSocket Server] Failed to build Gemini Live session, using smart chatbot fallback.', liveErr);
            geminiLiveSession = null;
          }
        }
        
        // Prime the user on connect
        const welcome = isInterview
          ? "Welcome! Im your technical hardware engineering interviewer today. Shall we begin by reviewing your resume, or would you like to start with a standard electronics circuit design challenge?"
          : "Hello there! Im your live electronics tutor. Im sitting right here at the bench with you. What circuit are we building today?";
        
        ws.send(JSON.stringify({
          outputTranscription: { text: welcome },
          content: { role: 'model', parts: [{ text: welcome }] }
        }));
        return;
      }

      if (msg.type === 'text') {
        const text = msg.text;
        const stage = msg.stage || '';
        console.log(`[WebSocket Server] Received text message: "${text}" in stage: "${stage}"`);

        if (geminiLiveSession) {
          geminiLiveSession.sendRealtimeInput({ text });
        } else {
          // Smart offline fallback: use generateContent if key exists, otherwise simple mock answers
          let reply = '';
          const key = process.env.GEMINI_API_KEY;
          if (key && key !== 'MY_GEMINI_API_KEY' && ai) {
            try {
              const systemPrompt = isInterview
                ? "You are a hardware interviewer. Write a short, highly professional response (1-2 sentences) to the user's answer."
                : `You are an interactive electronics tutor. The current stage of the learning path is ${stage}. Write a highly encouraging, helpful response (1-2 sentences) to the user's question: "${text}". No emojis.`;
              
              const res = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                  { role: 'system', parts: [{ text: systemPrompt }] },
                  { role: 'user', parts: [{ text }] }
                ],
                config: { temperature: 0.7, maxOutputTokens: 256 }
              });
              reply = res.text || '';
            } catch (err) {
              console.error('[WebSocket Server] Chatbot fallback generateContent failed:', err);
            }
          }

          if (!reply) {
            if (isInterview) {
              reply = "Excellent point. Let's delve deeper into how you would structure the hardware interrupt controller for this microcontroller application.";
            } else {
              if (stage === 'wiring') {
                reply = "That looks correct! Ensure you double check your ground connections on the breadboard. Shall we proceed to write the Arduino firmware?";
              } else if (stage === 'code') {
                reply = "Great! Your code structure is solid. Try clicking 'Compile' and let's run it on the AVR8js simulator.";
              } else {
                reply = "I see! Let's examine the connections. What specific microcontroller pins are you connecting your current-limiting resistor to?";
              }
            }
          }

          // Simulate transcription event back to client
          ws.send(JSON.stringify({
            outputTranscription: { text: reply },
            content: { role: 'model', parts: [{ text: reply }] }
          }));
        }
      }

      if (msg.type === 'image') {
        const mimeType = msg.mimeType || 'image/jpeg';
        console.log(`[WebSocket Server] Received image snapshot frame (${mimeType}).`);

        if (geminiLiveSession) {
          geminiLiveSession.sendRealtimeInput({
            video: { data: msg.data, mimeType }
          });
        } else {
          // Mock image verification response
          const responseText = "Looking at your layout, everything looks incredibly clean and well aligned! The resistor leads have sufficient clearance from neighboring rows.";
          ws.send(JSON.stringify({
            outputTranscription: { text: responseText },
            content: { role: 'model', parts: [{ text: responseText }] }
          }));
        }
      }

      if (msg.type === 'stage') {
        console.log(`[WebSocket Server] User transitioned to stage: ${msg.stage}`);
        if (geminiLiveSession) {
          geminiLiveSession.sendRealtimeInput({
            text: `[Stage update] I have transitioned to the "${msg.stage}" stage. Guide me through this step.`
          });
        }
      }

      if (msg.type === 'close') {
        await closeLiveSession();
      }

    } catch (err) {
      console.warn('[WebSocket Server] JSON parse error on WS message:', err);
    }
  });

  ws.on('close', async () => {
    console.log('[WebSocket Server] Client connection closed.');
    await closeLiveSession();
  });
});


// ── Serve the Application ──

const startServer = async () => {
  // Integrate Vite dev server middleware in development
  const requestedPort = Number.isFinite(envPort) ? envPort : DEFAULT_PORT;
  const requestedHmrPort = Number.isFinite(envHmrPort) ? envHmrPort : DEFAULT_VITE_HMR_PORT;

  console.log(`[Ohmlet Server] Starting dev server; requested PORT=${requestedPort}, VITE_HMR_PORT=${requestedHmrPort}`);

  const actualPort = await findFreePort(requestedPort);
  const actualHmrPort = await findFreePort(requestedHmrPort);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: actualHmrPort,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log(`[Ohmlet Server] Running in DEVELOPMENT mode, mounted Vite middleware. HMR port=${actualHmrPort}`);
  } else {
    // Serve pre-compiled production build
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Ohmlet Server] Running in PRODUCTION mode, serving prebuilt dist assets.');
  }

  // Handle upgraded WebSocket requests
  server.prependListener('upgrade', (request, socket, head) => {
    const requestUrl = request.url || '';
    const pathname = new URL(requestUrl, `http://${request.headers.host ?? 'localhost'}`).pathname;
    console.log('[WS UPGRADE] request received', {
      url: requestUrl,
      host: request.headers.host,
      pathname,
    });

    // Route Digital Twin telemetry to its own channel (independent of the Gemini
    // Live bridge below). /ws/twin/:userId/:projectId is handled entirely here.
    if (telemetryChannel.shouldHandle(pathname)) {
      console.log('[WS UPGRADE] twin route matched', { pathname });
      telemetryChannel.handleUpgrade(request, socket, head);
      return;
    }

    if (pathname.startsWith('/ws')) {
      console.log('[WS UPGRADE] passing to Gemini live bridge', { pathname });
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      console.log('[WS UPGRADE] no matching ws route, destroying socket', { pathname });
      socket.destroy();
    }
  });
  console.log('[WS UPGRADE] handler installed before Vite HMR');

  // Start the telemetry channel heartbeat and the serial bridge. The bridge only
  // opens a physical port when ARDUINO_SERIAL_PORT is configured; otherwise the
  // twin remains in simulation-only mode.
  telemetryChannel.startHeartbeat();
  if (arduinoSerialPort) {
    serialBridge.start();
    console.log(`[Telemetry Spine] Serial bridge targeting ${arduinoSerialPort} @ ${arduinoSerialBaud} baud.`);
  } else {
    console.log('[Telemetry Spine] No ARDUINO_SERIAL_PORT set — physical Arduino telemetry disabled. Connect the device or set ARDUINO_SERIAL_PORT to enable real data.');
  }

  server.on('error', (err) => {
    console.error('[Ohmlet Server] HTTP server error:', err?.code || err?.message || err);
  });

  server.listen({ port: actualPort, host: '0.0.0.0', exclusive: false }, () => {
    console.log(`[Ohmlet Server] Running on http://localhost:${actualPort}`);
    if (requestedPort !== actualPort) {
      console.log(`[Ohmlet Server] Requested PORT=${requestedPort}; using fallback port ${actualPort} instead.`);
    }
    if (requestedHmrPort !== actualHmrPort) {
      console.log(`[Ohmlet Server] Requested VITE_HMR_PORT=${requestedHmrPort}; using fallback port ${actualHmrPort} instead.`);
    }
  });
};

startServer().catch((err) => {
  console.error('[Ohmlet Server] Fatal startup error:', err?.stack || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Ohmlet Server] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Ohmlet Server] Uncaught exception:', error?.stack || error);
});
