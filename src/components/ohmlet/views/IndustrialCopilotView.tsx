import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import {
  Boxes,
  Cpu,
  Tv,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Award,
  ChevronRight,
  ChevronDown,
  Info,
  Layers,
  Settings,
  HelpCircle,
  FileDown,
  FileUp,
  Save,
  CheckCircle,
  AlertTriangle,
  Send,
  Volume2,
  Terminal,
  Compass,
  ArrowRight,
  Sun,
  Shield,
  Clock,
  Wrench,
  Search,
  Check,
  Code
} from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  COMPONENT_REGISTRY,
  ASSEMBLY_SEQUENCE_STEPS,
  getInitialSolarTrackerProject,
  TwinComponent,
  TwinProject
} from '../twin/TwinRegistry';
import { useTelemetryTwin } from '../../../hooks/useTelemetryTwin';

// Helper component to render a realistic sagging 3D jumper wire
interface JumperWireProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  slack?: number;
}

const JumperWire: React.FC<JumperWireProps> = ({ from, to, color, slack = -0.3 }) => {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    
    // Create a natural sag midpoint
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    
    // Sag downwards along Y axis
    mid.y += slack;
    
    // Add a slight horizontal drape to look more organic
    mid.x += (Math.random() - 0.5) * 0.15;
    mid.z += (Math.random() - 0.5) * 0.15;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(16);
  }, [from, to, slack]);

  return (
    <mesh>
      <tubeGeometry args={[new THREE.CatmullRomCurve3(points), 16, 0.025, 6, false]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
};

// ── 3D Visualizer for the Digital Twin Assembly ──
interface DynamicTwinSceneProps {
  components: TwinComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
  sunPosition: [number, number, number];
  servoX: number; // Azimuth Angle (0-180)
  servoY: number; // Elevation Angle (15-165)
  assemblyStep: number;
}

const DynamicTwinScene: React.FC<DynamicTwinSceneProps> = ({
  components,
  selectedComponentId,
  onSelectComponent,
  sunPosition,
  servoX,
  servoY,
  assemblyStep
}) => {
  // Convert angles to radians for 3D rotations (SG90 SG90 90 deg center)
  const angleXRad = ((servoX - 90) * Math.PI) / 180;
  const angleYRad = ((servoY - 90) * Math.PI) / 180;

  const isPlaced = (type: string) => {
    return components.some(c => c.type === type);
  };

  const isSelected = (type: string) => {
    const comp = components.find(c => c.type === type);
    return comp ? selectedComponentId === comp.id : false;
  };

  return (
    <group position={[0, -0.5, 0]}>
      {/* Floor / Workbench Grid */}
      <gridHelper args={[24, 24, '#4f5e7f', '#1b2333']} position={[0, -0.01, 0]} />
      
      {/* Draggable/Animated Sun Indicator Sphere */}
      <mesh position={sunPosition}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" />
        <pointLight color="#fef08a" intensity={2.2} distance={25} castShadow />
      </mesh>

      {/* ── HIGH FIDELITY INDUSTRIAL LABORATORY WORKBENCH ── */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[8.5, 0.2, 7.5]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Polished Aluminum Bezel Trim */}
      <mesh position={[0, -0.1, 3.76]}>
        <boxGeometry args={[8.52, 0.22, 0.04]} />
        <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, -0.1, -3.76]}>
        <boxGeometry args={[8.52, 0.22, 0.04]} />
        <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[4.26, -0.1, 0]}>
        <boxGeometry args={[0.04, 0.22, 7.52]} />
        <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[-4.26, -0.1, 0]}>
        <boxGeometry args={[0.04, 0.22, 7.52]} />
        <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.8} />
      </mesh>
      
      {/* ── BREADBOARD (STEP 1) ── */}
      {isPlaced('breadboard') && (
        <group
          position={[0, 0.1, -1]}
          onClick={(e) => {
            e.stopPropagation();
            const comp = components.find(c => c.type === 'breadboard');
            if (comp) onSelectComponent(comp.id);
          }}
        >
          {/* Main ABS off-white plastic chassis */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.2, 0.25, 1.9]} />
            <meshStandardMaterial
              color={isSelected('breadboard') ? '#fbbf24' : '#f8fafc'}
              roughness={0.5}
            />
          </mesh>
          {/* Central division channel groove */}
          <mesh position={[0, 0.11, 0]}>
            <boxGeometry args={[4.1, 0.04, 0.08]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          {/* Red Positive Power Rails */}
          <mesh position={[0, 0.126, 0.8]}>
            <boxGeometry args={[4.0, 0.005, 0.015]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <mesh position={[0, 0.126, -0.8]}>
            <boxGeometry args={[4.0, 0.005, 0.015]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          {/* Blue Negative Ground Rails */}
          <mesh position={[0, 0.126, 0.88]}>
            <boxGeometry args={[4.0, 0.005, 0.015]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
          <mesh position={[0, 0.126, -0.88]}>
            <boxGeometry args={[4.0, 0.005, 0.015]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
          
          {/* Visual representations of rows/pin holes */}
          <gridHelper args={[4.0, 32, '#94a3b8', '#cbd5e1']} position={[0, 0.127, 0]} rotation={[0, 0, 0]} />
        </group>
      )}

      {/* ── ARDUINO UNO R3 (STEP 2) ── */}
      {isPlaced('arduino') && (
        <group
          position={[-2.4, 0.14, 1.5]}
          rotation={[0, 0.08, 0]}
          onClick={(e) => {
            e.stopPropagation();
            const comp = components.find(c => c.type === 'arduino');
            if (comp) onSelectComponent(comp.id);
          }}
        >
          {/* Brass standoffs */}
          <mesh position={[-0.8, -0.1, -1.0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.12, 8]} />
            <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.8, -0.1, 1.0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.12, 8]} />
            <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Teal fiberglass PCB with gold contacts */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.9, 0.08, 2.5]} />
            <meshStandardMaterial
              color={isSelected('arduino') ? '#fbbf24' : '#016466'}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
          {/* Golden edge trace accents */}
          <mesh position={[0, -0.042, 0]}>
            <boxGeometry args={[1.92, 0.002, 2.52]} />
            <meshStandardMaterial color="#eab308" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Silver USB Port shield block */}
          <mesh position={[-0.6, 0.18, -1.1]} castShadow>
            <boxGeometry args={[0.45, 0.28, 0.6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Hollow black interior slot */}
          <mesh position={[-0.6, 0.18, -1.41]}>
            <boxGeometry args={[0.35, 0.18, 0.02]} />
            <meshStandardMaterial color="#000000" roughness={0.9} />
          </mesh>

          {/* Black plastic DC barrel power jack */}
          <mesh position={[0.6, 0.2, 1.0]} castShadow>
            <boxGeometry args={[0.4, 0.35, 0.55]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          {/* Center silver cylinder pin inside power jack */}
          <mesh position={[0.6, 0.2, 1.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
          </mesh>

          {/* ATmega328P main black dual-inline IC chip */}
          <mesh position={[0.3, 0.08, -0.1]} castShadow>
            <boxGeometry args={[0.26, 0.1, 1.1]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          {/* Silkscreen lines for microcontroller pin markings */}
          <mesh position={[0.3, 0.131, -0.1]}>
            <boxGeometry args={[0.2, 0.002, 1.0]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Long female pin header rails (Top & Bottom edge connectors) */}
          {/* Left Rail (D0-D13) */}
          <mesh position={[-0.8, 0.12, 0]} castShadow>
            <boxGeometry args={[0.12, 0.18, 2.1]} />
            <meshStandardMaterial color="#111827" roughness={0.7} />
          </mesh>
          {/* Right Rail (Analog / Power) */}
          <mesh position={[0.8, 0.12, 0]} castShadow>
            <boxGeometry args={[0.12, 0.18, 2.1]} />
            <meshStandardMaterial color="#111827" roughness={0.7} />
          </mesh>

          {/* Status LEDs */}
          {/* Active POWER Indicator (Bright Green!) */}
          <mesh position={[-0.65, 0.06, 0.6]}>
            <boxGeometry args={[0.06, 0.04, 0.06]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <pointLight position={[-0.65, 0.12, 0.6]} color="#22c55e" intensity={0.25} distance={1.0} />

          {/* Blinking TX/RX Indicators (Amber yellow) */}
          <mesh position={[-0.65, 0.06, 0.45]}>
            <boxGeometry args={[0.06, 0.04, 0.06]} />
            <meshBasicMaterial color={Math.floor(Date.now() / 400) % 2 === 0 ? '#f59e0b' : '#334155'} />
          </mesh>
        </group>
      )}

      {/* ── VERTICAL AZIMUTH SERVO (STEP 3) ── */}
      {isPlaced('servo_vertical') && (
        <group position={[0, 0.1, 2]}>
          {/* Semi-transparent SG90 dark blue plastic housing */}
          <mesh
            castShadow
            onClick={(e) => {
              e.stopPropagation();
              const comp = components.find(c => c.type === 'servo_vertical');
              if (comp) onSelectComponent(comp.id);
            }}
          >
            <boxGeometry args={[1.3, 0.85, 0.85]} />
            <meshStandardMaterial
              color={isSelected('servo_vertical') ? '#fbbf24' : '#1d4ed8'}
              roughness={0.2}
              opacity={0.8}
              transparent={true}
            />
          </mesh>

          {/* High-fidelity gear-train assembly inside transparent body */}
          <group position={[0, 0, 0]}>
            <mesh position={[0.3, 0.1, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.5, 12]} />
              <meshStandardMaterial color="#fef08a" metalness={0.2} roughness={0.4} />
            </mesh>
            <mesh position={[-0.2, 0.1, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.5, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
          </group>

          {/* Standard mounting ears / flanges with silver screws */}
          <mesh position={[0.9, -0.1, 0]} castShadow>
            <boxGeometry args={[0.5, 0.08, 0.85]} />
            <meshStandardMaterial color="#1e40af" />
          </mesh>
          <mesh position={[-0.9, -0.1, 0]} castShadow>
            <boxGeometry args={[0.5, 0.08, 0.85]} />
            <meshStandardMaterial color="#1e40af" />
          </mesh>
          {/* Tiny silver screws */}
          <mesh position={[0.95, -0.05, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>
          <mesh position={[-0.95, -0.05, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>

          {/* AZIMUTH ROTATION HUB (Pivots around Y axis based on servoX / Azimuth angle) */}
          <group rotation={[0, -angleXRad, 0]}>
            {/* Main output gear spindle shaft (silver spline) */}
            <mesh position={[0.3, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 0.35, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>

            {/* White ABS Plastic Single-Arm Horn (Coupler arm) */}
            <mesh position={[0.15, 0.62, 0]} castShadow>
              <boxGeometry args={[0.8, 0.06, 0.3]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
            </mesh>
            <mesh position={[0.3, 0.62, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.061, 16]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
            </mesh>
            {/* Center silver micro locking screw */}
            <mesh position={[0.3, 0.66, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </mesh>

            {/* Vertical Support Bracket Structure (Pivots azimuthally) */}
            <mesh position={[0.0, 1.1, 0]} castShadow>
              <boxGeometry args={[0.45, 0.95, 0.45]} />
              <meshStandardMaterial color="#475569" roughness={0.5} />
            </mesh>

            {/* ── ELEVATION HORIZONTAL SERVO (STEP 4) ── */}
            {isPlaced('servo_horizontal') && (
              <group position={[0, 1.5, 0]}>
                {/* Elevation servo motor casing (Mounted horizontally on vertical bracket arm) */}
                <mesh
                  rotation={[0, 0, Math.PI / 2]}
                  onClick={(e) => {
                    e.stopPropagation();
                    const comp = components.find(c => c.type === 'servo_horizontal');
                    if (comp) onSelectComponent(comp.id);
                  }}
                  castShadow
                >
                  <boxGeometry args={[0.85, 1.3, 0.85]} />
                  <meshStandardMaterial
                    color={isSelected('servo_horizontal') ? '#fbbf24' : '#2563eb'}
                    roughness={0.2}
                    opacity={0.8}
                    transparent={true}
                  />
                </mesh>
                
                {/* Horizontal mounting screw detail */}
                <mesh position={[0, -0.65, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
                  <meshStandardMaterial color="#475569" />
                </mesh>

                {/* ELEVATION TILT SHAFT (Pivots around X axis based on servoY / Elevation angle) */}
                <group rotation={[-angleYRad, 0, 0]}>
                  {/* Rotating spindle coupling */}
                  <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.26, 0.26, 0.18, 16]} />
                    <meshStandardMaterial color="#f8fafc" roughness={0.4} />
                  </mesh>
                  {/* Output lock bolt */}
                  <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.05, 8]} />
                    <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                  </mesh>

                  {/* ── SOLAR TRACKING BRACKET MOUNT (STEP 5) ── */}
                  {isPlaced('solar_mount') && (
                    <group position={[0, 0.5, 0]}>
                      {/* Central bracket bridge */}
                      <mesh
                        onClick={(e) => {
                          e.stopPropagation();
                          const comp = components.find(c => c.type === 'solar_mount');
                          if (comp) onSelectComponent(comp.id);
                        }}
                        castShadow
                      >
                        <boxGeometry args={[2.5, 0.12, 2.5]} />
                        <meshStandardMaterial
                          color={isSelected('solar_mount') ? '#fbbf24' : '#334155'}
                          roughness={0.6}
                        />
                      </mesh>

                      {/* Structurally realistic mechanical side brackets with physical pins */}
                      <mesh position={[-1.25, -0.3, 0]} castShadow>
                        <boxGeometry args={[0.08, 0.7, 2.1]} />
                        <meshStandardMaterial color="#334155" roughness={0.6} />
                      </mesh>
                      <mesh position={[1.25, -0.3, 0]} castShadow>
                        <boxGeometry args={[0.08, 0.7, 2.1]} />
                        <meshStandardMaterial color="#334155" roughness={0.6} />
                      </mesh>
                      {/* Support joints */}
                      <mesh position={[-1.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.1, 0.1, 0.05, 8]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
                      </mesh>
                      <mesh position={[1.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.1, 0.1, 0.05, 8]} />
                        <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
                      </mesh>

                      {/* ── PHOTOVOLTAIC SOLAR PANEL (STEP 6) ── */}
                      {isPlaced('solar_panel') && (
                        <group position={[0, 0.22, 0]}>
                          {/* Anodized aluminium black protective frame outer lip */}
                          <mesh
                            onClick={(e) => {
                              e.stopPropagation();
                              const comp = components.find(c => c.type === 'solar_panel');
                              if (comp) onSelectComponent(comp.id);
                            }}
                            castShadow
                          >
                            <boxGeometry args={[3.25, 0.12, 3.25]} />
                            <meshStandardMaterial
                              color={isSelected('solar_panel') ? '#fbbf24' : '#1e1b4b'}
                              roughness={0.15}
                              metalness={0.85}
                            />
                          </mesh>

                          {/* Solar cells divisions array layout (Deep blue monocrystalline cell color) */}
                          <mesh position={[0, 0.061, 0]} receiveShadow>
                            <boxGeometry args={[3.12, 0.02, 3.12]} />
                            <meshStandardMaterial
                              color="#1a1e36"
                              roughness={0.1}
                              metalness={0.9}
                            />
                          </mesh>
                          {/* Fine silver monocrystalline division grid lines */}
                          <gridHelper args={[3.11, 4, '#121824', '#6366f1']} position={[0, 0.073, 0]} />

                          {/* Semi-glossy protective glass top sheet */}
                          <mesh position={[0, 0.075, 0]}>
                            <boxGeometry args={[3.11, 0.01, 3.11]} />
                            <meshStandardMaterial color="#e0f2fe" roughness={0.01} metalness={0.98} transparent opacity={0.25} />
                          </mesh>

                          {/* Quadrant optical separator partitions (Cross divider) of height 0.6 */}
                          <mesh position={[0, 0.38, 0]} castShadow>
                            <boxGeometry args={[0.06, 0.6, 2.5]} />
                            <meshStandardMaterial color="#0f172a" roughness={0.8} />
                          </mesh>
                          <mesh position={[0, 0.38, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
                            <boxGeometry args={[0.06, 0.6, 2.5]} />
                            <meshStandardMaterial color="#0f172a" roughness={0.8} />
                          </mesh>

                          {/* ── TOP-LEFT LDR SENSOR (STEP 7) ── */}
                          {isPlaced('ldr_tl') && (
                            <group position={[-0.8, 0.08, -0.8]}>
                              {/* White ceramic base disc */}
                              <mesh castShadow>
                                <cylinderGeometry args={[0.16, 0.16, 0.06, 12]} />
                                <meshStandardMaterial color="#f8fafc" roughness={0.6} />
                              </mesh>
                              {/* Orange serpentine cadmium-sulfide track pattern */}
                              <mesh position={[0, 0.031, 0]}>
                                <cylinderGeometry args={[0.13, 0.13, 0.005, 12]} />
                                <meshStandardMaterial color="#ea580c" roughness={0.3} />
                              </mesh>
                              {/* Winding metal trace dividers */}
                              <mesh position={[0, 0.033, 0]}>
                                <boxGeometry args={[0.1, 0.004, 0.02]} />
                                <meshStandardMaterial color="#475569" />
                              </mesh>
                              {/* Glossy clear epoxy protective encapsulate lens dome */}
                              <mesh position={[0, 0.04, 0]}>
                                <sphereGeometry args={[0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                                <meshStandardMaterial color="#ffffff" roughness={0.0} transparent opacity={0.4} />
                              </mesh>
                              {/* Two silver wire leads going down */}
                              <mesh position={[-0.06, -0.1, 0]}>
                                <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
                                <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                              </mesh>
                              <mesh position={[0.06, -0.1, 0]}>
                                <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
                                <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                              </mesh>
                            </group>
                          )}

                          {/* ── TOP-RIGHT LDR SENSOR (STEP 8) ── */}
                          {isPlaced('ldr_tr') && (
                            <group position={[0.8, 0.08, -0.8]}>
                              {/* White ceramic base disc */}
                              <mesh castShadow>
                                <cylinderGeometry args={[0.16, 0.16, 0.06, 12]} />
                                <meshStandardMaterial color="#f8fafc" roughness={0.6} />
                              </mesh>
                              {/* Orange serpentine cadmium-sulfide track pattern */}
                              <mesh position={[0, 0.031, 0]}>
                                <cylinderGeometry args={[0.13, 0.13, 0.005, 12]} />
                                <meshStandardMaterial color="#ea580c" roughness={0.3} />
                              </mesh>
                              {/* Winding metal trace dividers */}
                              <mesh position={[0, 0.033, 0]}>
                                <boxGeometry args={[0.1, 0.004, 0.02]} />
                                <meshStandardMaterial color="#475569" />
                              </mesh>
                              {/* Glossy clear epoxy protective encapsulate lens dome */}
                              <mesh position={[0, 0.04, 0]}>
                                <sphereGeometry args={[0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                                <meshStandardMaterial color="#ffffff" roughness={0.0} transparent opacity={0.4} />
                              </mesh>
                              {/* Two silver wire leads going down */}
                              <mesh position={[-0.06, -0.1, 0]}>
                                <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
                                <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                              </mesh>
                              <mesh position={[0.06, -0.1, 0]}>
                                <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
                                <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                              </mesh>
                            </group>
                          )}

                          {/* ── BOTTOM-LEFT LDR SENSOR (STEP 9) ── */}
                          {isPlaced('ldr_bl') && (
                            <group position={[-0.8, 0.08, 0.8]}>
                              {/* White ceramic base disc */}
                              <mesh castShadow>
                                <cylinderGeometry args={[0.16, 0.16, 0.06, 12]} />
                                <meshStandardMaterial color="#f8fafc" roughness={0.6} />
                              </mesh>
                              {/* Orange serpentine cadmium-sulfide track pattern */}
                              <mesh position={[0, 0.031, 0]}>
                                <cylinderGeometry args={[0.13, 0.13, 0.005, 12]} />
                                <meshStandardMaterial color="#ea580c" roughness={0.3} />
                              </mesh>
                              {/* Winding metal trace dividers */}
                              <mesh position={[0, 0.033, 0]}>
                                <boxGeometry args={[0.1, 0.004, 0.02]} />
                                <meshStandardMaterial color="#475569" />
                              </mesh>
                              {/* Glossy clear epoxy protective encapsulate lens dome */}
                              <mesh position={[0, 0.04, 0]}>
                                <sphereGeometry args={[0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                                <meshStandardMaterial color="#ffffff" roughness={0.0} transparent opacity={0.4} />
                              </mesh>
                              {/* Two silver wire leads going down */}
                              <mesh position={[-0.06, -0.1, 0]}>
                                <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
                                <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                              </mesh>
                              <mesh position={[0.06, -0.1, 0]}>
                                <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
                                <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                              </mesh>
                            </group>
                          )}

                          {/* ── BOTTOM-RIGHT LDR SENSOR (STEP 10) ── */}
                          {isPlaced('ldr_br') && (
                            <group position={[0.8, 0.08, 0.8]}>
                              {/* White ceramic base disc */}
                              <mesh castShadow>
                                <cylinderGeometry args={[0.16, 0.16, 0.06, 12]} />
                                <meshStandardMaterial color="#f8fafc" roughness={0.6} />
                              </mesh>
                              {/* Orange serpentine cadmium-sulfide track pattern */}
                              <mesh position={[0, 0.031, 0]}>
                                <cylinderGeometry args={[0.13, 0.13, 0.005, 12]} />
                                <meshStandardMaterial color="#ea580c" roughness={0.3} />
                              </mesh>
                              {/* Winding metal trace dividers */}
                              <mesh position={[0, 0.033, 0]}>
                                <boxGeometry args={[0.1, 0.004, 0.02]} />
                                <meshStandardMaterial color="#475569" />
                              </mesh>
                              {/* Glossy clear epoxy protective encapsulate lens dome */}
                              <mesh position={[0, 0.04, 0]}>
                                <sphereGeometry args={[0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                                <meshStandardMaterial color="#ffffff" roughness={0.0} transparent opacity={0.4} />
                              </mesh>
                              {/* Two silver wire leads going down */}
                              <mesh position={[-0.06, -0.1, 0]}>
                                <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
                                <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                              </mesh>
                              <mesh position={[0.06, -0.1, 0]}>
                                <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
                                <meshStandardMaterial color="#94a3b8" metalness={0.9} />
                              </mesh>
                            </group>
                          )}
                        </group>
                      )}
                    </group>
                  )}
                </group>
              </group>
            )}
          </group>
        </group>
      )}

      {/* ── 10K Ohm RESISTOR DIVIDERS (STEP 11) ── */}
      {isPlaced('resistor_10k') && (
        <group position={[0, 0.25, -1]}>
          {/* Resistor 1 */}
          <group position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            {/* Ceramic Beige cylinder body */}
            <mesh castShadow>
              <cylinderGeometry args={[0.065, 0.065, 0.45, 12]} />
              <meshStandardMaterial
                color={isSelected('resistor_10k') ? '#fbbf24' : '#f5e0b3'}
                roughness={0.5}
              />
            </mesh>
            {/* Color Bands (Brown, Black, Orange, Gold for 10K Ohm 5%) */}
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.067, 0.067, 0.04, 12]} />
              <meshBasicMaterial color="#78350f" /> {/* Brown */}
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.067, 0.067, 0.04, 12]} />
              <meshBasicMaterial color="#000000" /> {/* Black */}
            </mesh>
            <mesh position={[0, 0.0, 0]}>
              <cylinderGeometry args={[0.067, 0.067, 0.04, 12]} />
              <meshBasicMaterial color="#ea580c" /> {/* Orange */}
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.067, 0.067, 0.04, 12]} />
              <meshBasicMaterial color="#ca8a04" /> {/* Gold */}
            </mesh>
            {/* Long silver wire leads bent downwards */}
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
            <mesh position={[0, -0.35, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          </group>

          {/* Resistor 2 */}
          <group position={[1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.065, 0.065, 0.45, 12]} />
              <meshStandardMaterial color="#f5e0b3" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.067, 0.067, 0.04, 12]} />
              <meshBasicMaterial color="#78350f" />
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.067, 0.067, 0.04, 12]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
            <mesh position={[0, 0.0, 0]}>
              <cylinderGeometry args={[0.067, 0.067, 0.04, 12]} />
              <meshBasicMaterial color="#ea580c" />
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.067, 0.067, 0.04, 12]} />
              <meshBasicMaterial color="#ca8a04" />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
            <mesh position={[0, -0.35, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          </group>
        </group>
      )}

      {/* ── DYNAMIC 3D GRACEFUL JUMPER WIRES ── */}
      {isPlaced('arduino') && isPlaced('breadboard') && (
        <group>
          {/* Arduino GND to Breadboard GND (Black) */}
          <JumperWire from={[-1.7, 0.28, 0.8]} to={[-0.8, 0.25, -0.1]} color="#000000" slack={-0.3} />
          {/* Arduino 5V to Breadboard Red rail (Red) */}
          <JumperWire from={[-1.7, 0.28, 1.0]} to={[-0.8, 0.25, -0.2]} color="#ef4444" slack={-0.32} />

          {/* Arduino Pin 9 to Azimuth Servo control wire (Orange) */}
          {isPlaced('servo_vertical') && (
            <JumperWire from={[-1.7, 0.28, 0.2]} to={[0.2, 0.25, 1.85]} color="#f97316" slack={-0.45} />
          )}

          {/* Arduino Pin 10 to Elevation Servo control wire (Yellow) */}
          {isPlaced('servo_horizontal') && (
            <JumperWire from={[-1.7, 0.28, 0.05]} to={[0.4, 1.5, 1.8]} color="#eab308" slack={-0.6} />
          )}

          {/* LDR sensors down to divider resistors on Breadboard (Flexible trailing ribbon wire bundle) */}
          {isPlaced('ldr_tl') && (
            <JumperWire from={[0.0, 1.8, 2.0]} to={[-0.5, 0.25, -1.2]} color="#3b82f6" slack={-0.5} />
          )}
          {isPlaced('ldr_tr') && (
            <JumperWire from={[0.0, 1.8, 2.0]} to={[0.5, 0.25, -1.2]} color="#a855f7" slack={-0.5} />
          )}
        </group>
      )}
    </group>
  );
};

// Main Industrial Copilot View
export const IndustrialCopilotView: React.FC = () => {
  // --- Active Project & Components ---
  const [project, setProject] = useState<TwinProject>(() => getInitialSolarTrackerProject(11));
  const [selectedCompId, setSelectedCompId] = useState<string | null>('c-solar_panel');
  
  // --- Selected Active Plugin ---
  const [activePlugin, setActivePlugin] = useState<'solar_tracker' | 'plc_panel' | 'robot_arm'>('solar_tracker');

  // --- Left-side Tabs ---
  const [leftTab, setLeftTab] = useState<'hierarchy' | 'assembly'>('hierarchy');
  // --- Right-side Tabs ---
  const [rightTab, setRightTab] = useState<'dashboard' | 'inspector'>('dashboard');

  // --- Layout states for Modern Digital Twin Panel Workspace ---
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isBottomDrawerOpen, setIsBottomDrawerOpen] = useState(true);
  const [bottomDrawerTab, setBottomDrawerTab] = useState<'copilot' | 'serial' | 'telemetry' | 'problems' | 'console'>('copilot');
  const [bottomDrawerHeight, setBottomDrawerHeight] = useState<'small' | 'medium' | 'large'>('medium');
  const [hierarchySearchQuery, setHierarchySearchQuery] = useState('');
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<'simulation' | 'assembly' | 'dashboard'>('simulation');

  // --- Hierarchy Tree Nodes Expansion State ---
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    project: true,
    tracker: true,
    mcu: true,
    frame: true,
    sensors: true
  });

  // --- Telemetry Dashboard Live Variables ---
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [autoTracking, setAutoTracking] = useState<boolean>(true);
  const [servoX, setServoX] = useState<number>(90); // Azimuth: 0 (Left/East) to 180 (Right/West)
  const [servoY, setServoY] = useState<number>(45); // Elevation: 15 (Flat) to 165 (Deep high)
  const [arduinoConnected, setArduinoConnected] = useState<boolean>(false); // USB Hardware Sync

  const wsUrl = useMemo(() => {
    return window.location.origin;
  }, []);

  const {
    status: telemetryStatus,
    latestFrame,
    deviceId: telemetryDeviceId,
    lastStatusMessage,
  } = useTelemetryTwin({
    wsUrl,
    userId: 'dev-user',
    projectId: 'solar-tracker-digital-twin',
    autoConnect: arduinoConnected,
  });

  const isPhysicalMode = arduinoConnected && (telemetryStatus === 'connected' || latestFrame !== null);

  useEffect(() => {
    if (!arduinoConnected || !latestFrame) return;
    console.log(`[DIGITAL TWIN] PHYSICAL TELEMETRY APPLIED servoX=${latestFrame.servoX} servoY=${latestFrame.servoY}`);
    setServoX(latestFrame.servoX);
    setServoY(latestFrame.servoY);
  }, [arduinoConnected, latestFrame]);

  useEffect(() => {
    if (!arduinoConnected) return;

    if (telemetryStatus === 'connecting') {
      setTerminalLogs(prev => [...prev, `[SERIAL] Connecting to physical telemetry channel...`]);
    } else if (telemetryStatus === 'connected') {
      setTerminalLogs(prev => [...prev, `[SERIAL] Physical telemetry stream active. Device ${telemetryDeviceId ?? 'unknown'} synchronized.`]);
    } else if (telemetryStatus === 'error') {
      setTerminalLogs(prev => [...prev, `[SERIAL] Physical telemetry error detected. Falling back to virtual simulation.`]);
    }
  }, [arduinoConnected, telemetryStatus, telemetryDeviceId]);

  // --- Drag-to-Orbit Simulated Sun position ---
  const [sunAngle, setSunAngle] = useState<number>(45); // Azimuth Angle of the Sun (0 to 180)
  const [sunElevation, setSunElevation] = useState<number>(60); // Elevation of the Sun (10 to 90)

  // --- Calculated Sun position vector in 3D ---
  const sun3DPosition = useMemo<[number, number, number]>(() => {
    const radius = 8;
    const azRad = (sunAngle * Math.PI) / 180;
    const elRad = (sunElevation * Math.PI) / 180;
    
    // Calculate spherical coordinates mapped to 3D Cartesian vectors
    const x = radius * Math.cos(elRad) * Math.cos(azRad);
    const y = radius * Math.sin(elRad);
    const z = radius * Math.cos(elRad) * Math.sin(azRad) + 2; // Offset center toward tracker
    return [x, y, z];
  }, [sunAngle, sunElevation]);

  // --- Dynamic LDR Intensity Readings (Real Local Coordinates Shadow Casting) ---
  const ldrIntensity = useMemo(() => {
    // 1. Calculate relative panel angles in radians based on current servo position (SG90 has 90° center)
    const angleXRad = ((servoX - 90) * Math.PI) / 180;
    const angleYRad = ((servoY - 90) * Math.PI) / 180;

    // 2. Normalize Sun global position relative to the panel's rotational center (0.0, 1.8, 2.0)
    const [sunX, sunY, sunZ] = sun3DPosition;
    const dx = sunX;
    const dy = sunY - 1.8;
    const dz = sunZ - 2.0;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.01) return { tl: 80, tr: 80, bl: 80, br: 80 };

    const sx = dx / dist;
    const sy = dy / dist;
    const sz = dz / dist;

    // 3. Transform global Sun unit vector into the panel's local 3D coordinate frame
    // Step 3a: Rotate around Y-axis by +angleXRad (inverse Azimuth rotation)
    const rx = sx * Math.cos(angleXRad) + sz * Math.sin(angleXRad);
    const ry = sy;
    const rz = -sx * Math.sin(angleXRad) + sz * Math.cos(angleXRad);

    // Step 3b: Rotate around X-axis by +angleYRad (inverse Elevation rotation)
    const lx = rx;
    const ly = ry * Math.cos(angleYRad) - rz * Math.sin(angleYRad);
    const lz = ry * Math.sin(angleYRad) + rz * Math.cos(angleYRad);

    // 4. Base alignment intensity determined by local Sun tilt cosine (ly)
    // If ly <= 0, the sun is shining behind or parallel to the panel, yielding dark ambient state
    const scale = Math.max(0.0, ly) * 943;

    // 5. Quadrant Partition Wall Shadow Casting
    // The central divider walls (height h = 0.6) cast shadows onto the quadrants
    const shadowSensitivity = 1.4;
    const shadowX_Left = lx > 0 ? Math.max(0.08, 1.0 - (lx / (ly + 0.05)) * shadowSensitivity) : 1.0;
    const shadowX_Right = lx < 0 ? Math.max(0.08, 1.0 - (Math.abs(lx) / (ly + 0.05)) * shadowSensitivity) : 1.0;
    const shadowZ_Top = lz > 0 ? Math.max(0.08, 1.0 - (lz / (ly + 0.05)) * shadowSensitivity) : 1.0;
    const shadowZ_Bottom = lz < 0 ? Math.max(0.08, 1.0 - (Math.abs(lz) / (ly + 0.05)) * shadowSensitivity) : 1.0;

    // 6. Map to physical analog values on virtual Arduino pins (80 to 1023)
    const tlVal = Math.round(Math.max(80, Math.min(1023, 80 + scale * shadowX_Left * shadowZ_Top)));
    const trVal = Math.round(Math.max(80, Math.min(1023, 80 + scale * shadowX_Right * shadowZ_Top)));
    const blVal = Math.round(Math.max(80, Math.min(1023, 80 + scale * shadowX_Left * shadowZ_Bottom)));
    const brVal = Math.round(Math.max(80, Math.min(1023, 80 + scale * shadowX_Right * shadowZ_Bottom)));

    return { tl: tlVal, tr: trVal, bl: blVal, br: brVal };
  }, [sun3DPosition, servoX, servoY]);

  // --- Real-Time PV Voltage & Power Output Generation ---
  const solarPowerMetrics = useMemo(() => {
    // Determine exact alignment factor from local Sun vector coordinates
    const angleXRad = ((servoX - 90) * Math.PI) / 180;
    const angleYRad = ((servoY - 90) * Math.PI) / 180;

    const [sunX, sunY, sunZ] = sun3DPosition;
    const dx = sunX;
    const dy = sunY - 1.8;
    const dz = sunZ - 2.0;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.01) return { voltage: 0, current: 0, powerMw: 0, efficiency: 0 };

    const sx = dx / dist;
    const sy = dy / dist;
    const sz = dz / dist;

    const rx = sx * Math.cos(angleXRad) + sz * Math.sin(angleXRad);
    const ry = sy;
    const rz = -sx * Math.sin(angleXRad) + sz * Math.cos(angleXRad);
    const ly = ry * Math.cos(angleYRad) - rz * Math.sin(angleYRad);

    const dot = Math.max(0, ly);

    // Generate solar panel electrical characteristics
    const maxVoltage = 5.2; // 5.2V max Voc
    const maxCurrent = 240; // 240mA max Isc

    const activeV = parseFloat((dot * maxVoltage).toFixed(2));
    const activeI = parseFloat((dot * maxCurrent).toFixed(1));
    const activeMw = parseFloat((activeV * activeI).toFixed(1));
    const trackingEfficiency = Math.round(dot * 100);

    return {
      voltage: activeV,
      current: activeI,
      powerMw: activeMw,
      efficiency: trackingEfficiency
    };
  }, [sun3DPosition, servoX, servoY]);

  // --- Auto-Tracking Algorithm Execution (Closed-Loop Virtual Arduino) ───
  useEffect(() => {
    if (!isSimulating || !autoTracking || arduinoConnected) return;

    const timer = setInterval(() => {
      // Pin Mapping from physical Solar Tracker PCB prototype as requested:
      // A2 → Top Left LDR
      // A3 → Top Right LDR
      // A1 → Bottom Left LDR
      // A0 → Bottom Right LDR
      const ldrTL = ldrIntensity.tl;
      const ldrTR = ldrIntensity.tr;
      const ldrBL = ldrIntensity.bl;
      const ldrBR = ldrIntensity.br;

      // Execute exact Arduino solar-tracking C++ code logic:
      const avgTop = (ldrTL + ldrTR) / 2;
      const avgBot = (ldrBL + ldrBR) / 2;
      const avgLeft = (ldrTL + ldrBL) / 2;
      const avgRight = (ldrTR + ldrBR) / 2;

      const diffElevation = avgTop - avgBot; // Vertical difference (Elevation error)
      const diffAzimuth = avgLeft - avgRight; // Horizontal difference (Azimuth error)

      const deadBand = 12; // Deadband tolerance to prevent jitter

      setServoX(prev => {
        let next = prev;
        if (Math.abs(diffAzimuth) > deadBand) {
          // Move toward higher light intensity (Azimuth angle increases if left side has more light to turn towards West/negative X)
          next = prev + (diffAzimuth > 0 ? 1.5 : -1.5);
        }
        return Math.max(0, Math.min(180, next));
      });

      setServoY(prev => {
        let next = prev;
        if (Math.abs(diffElevation) > deadBand) {
          // Move toward higher light intensity (Elevation angle increases if top side has more light)
          next = prev + (diffElevation > 0 ? 1.5 : -1.5);
        }
        return Math.max(15, Math.min(165, next));
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isSimulating, autoTracking, ldrIntensity]);

  // --- Assembly Engine Logic ---
  const [assemblyProgress, setAssemblyProgress] = useState<number>(11); // Starts fully pre-assembled
  const currentAssemblyStep = useMemo(() => {
    return ASSEMBLY_SEQUENCE_STEPS.find(s => s.step === assemblyProgress + 1) || null;
  }, [assemblyProgress]);

  const handleAssembleNext = () => {
    if (assemblyProgress >= ASSEMBLY_SEQUENCE_STEPS.length) return;
    
    const nextStep = ASSEMBLY_SEQUENCE_STEPS[assemblyProgress];
    const itemRegistry = COMPONENT_REGISTRY[nextStep.componentKey];
    
    const newComp: TwinComponent = {
      id: `c-${nextStep.componentKey}-${Date.now()}`,
      name: itemRegistry.name,
      type: itemRegistry.type,
      status: 'placed',
      position: nextStep.targetPosition,
      rotation: [0, 0, 0],
      children: [],
      ports: [...itemRegistry.ports],
      properties: { ...itemRegistry.properties },
      metadata: { ...itemRegistry.metadata },
      simulation: { ...itemRegistry.simulation },
      ai: { ...itemRegistry.ai }
    };

    setProject(prev => ({
      ...prev,
      components: [...prev.components, newComp]
    }));
    
    setSelectedCompId(newComp.id);
    setAssemblyProgress(prev => prev + 1);

    // Prompt user in Copilot terminal
    setTerminalLogs(prev => [
      ...prev,
      `[ASSEMBLY] Placed component: "${newComp.name}" at coordinate [${newComp.position.join(', ')}]`,
      `[SYSTEM] Twin database synchronized.`
    ]);
  };

  const handleResetAssembly = () => {
    const initial = getInitialSolarTrackerProject(1);
    setProject(initial);
    setSelectedCompId('c-bb');
    setAssemblyProgress(0);
    setTerminalLogs([
      `[SYSTEM] Resetting workbench. Starting from clean state.`,
      `[GUIDE] Click 'Assemble Next Component' in the left tab to secure the Breadboard.`
    ]);
  };

  // --- Serial / Monitor Console logs ---
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[Ohmlet Copilot Kernel v3.4] Core online. Ready for Digital Twin synchronization.`,
    `[SIMULATOR] Solar positioning orbital vectors ready. Auto-Tracking idle.`,
    `[INFO] Press PLAY to stream virtual hardware status feeds.`
  ]);
  const [terminalInput, setTerminalInput] = useState<string>('');

  useEffect(() => {
    if (!isSimulating) return;

    const logTimer = setInterval(() => {
      setTerminalLogs(prev => {
        const timestamp = new Date().toLocaleTimeString();
        const newLog = `[${timestamp} SERIAL] TL:${ldrIntensity.tl} TR:${ldrIntensity.tr} BL:${ldrIntensity.bl} BR:${ldrIntensity.br} | Servos X:${Math.round(servoX)}° Y:${Math.round(servoY)}° | Voc:${solarPowerMetrics.voltage}V`;
        return [...prev.slice(-30), newLog];
      });
    }, 3000);

    return () => clearInterval(logTimer);
  }, [isSimulating, ldrIntensity, servoX, servoY, solarPowerMetrics]);

  // --- AI Copilot Messaging Engine ---
  const [copilotMessages, setCopilotMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: "Greetings, faith. I am your Industrial AI Copilot. I have synchronized our workspace with the Dual-Axis Solar Tracker Digital Twin. You can manipulate the virtual model, drag Sun orbital vectors, test tracking algorithms, or follow assembly steps. How can I help you optimize our hardware setup today?",
      time: '12:00'
    }
  ]);
  const [copilotInput, setCopilotInput] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleSendCopilotMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!copilotInput.trim()) return;

    const userMsgText = copilotInput;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setCopilotMessages(prev => [...prev, { sender: 'user', text: userMsgText, time: timestamp }]);
    setCopilotInput('');

    // Pre-calculate response based on keyword analysis (Industrial, Hardware and Code specific)
    let replyText = "Understood. The telemetry registers standard voltage feeds. Let me analyze if we require decoupling capacitors or software changes.";

    const query = userMsgText.toLowerCase();
    if (query.includes('unsolicited') || query.includes('why') || query.includes('what')) {
      replyText = "This dashboard displays real-time coordinates of the SG90 azimuth and elevation servo joints. By rotating both gears dynamically, the PV panel can face perpendicular to the light rays, increasing absolute generation efficiency by up to 34% compared to stationary frames.";
    } else if (query.includes('wire') || query.includes('pin') || query.includes('connection')) {
      replyText = "Wiring check: Ensure LDR Top-Left is wired to Arduino A0, Top-Right to A1, Bottom-Left to A2, and Bottom-Right to A3. Each sensor line must bridge to ground through a 10K current limiting pull-down resistor to avoid high voltage saturation.";
    } else if (query.includes('code') || query.includes('arduino') || query.includes('sketch')) {
      replyText = "Software logic: Your setup is running. The differential formula is: (avgTop - avgBot) to adjust the elevation servo joint, and (avgLeft - avgRight) to adjust the horizontal tracking servo. We suggest adding a 12-value deadband buffer to reduce continuous jitter.";
    } else if (query.includes('hardware') || query.includes('serial') || query.includes('websocket')) {
      replyText = "Serial Connection: We can pipe actual USB Serial data at 9600 baud directly. Our WebSocket server receives this payload and pivots the 3D representation in real time to match the real physical solar tracker joints.";
    } else if (query.includes('troubleshoot') || query.includes('fail') || query.includes('error')) {
      replyText = "Fault detected? Verify that you have placed 10K resistors across all 4 LDR analog feeds. A missing resistor leaves the analog gate floating, creating static maximum inputs (1023) in complete darkness.";
    } else if (query.includes('maintenance') || query.includes('service')) {
      replyText = "SG90 servos carry an industrial maintenance cycle of 90 days due to physical gear fatigue. You can monitor temperature readings (currently nominal at 31°C) and lubrication thresholds inside the Inspector panel.";
    }

    setTimeout(() => {
      setCopilotMessages(prev => [...prev, { sender: 'ai', text: replyText, time: timestamp }]);
    }, 600);
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotMessages]);

  // --- Project Saving & Loading via JSON ---
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(project, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'solar-tracker-digital-twin.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    setTerminalLogs(prev => [...prev, `[SYSTEM] Exported entire Digital Twin state as JSON.`]);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as TwinProject;
          if (parsed && parsed.components) {
            setProject(parsed);
            if (parsed.components.length > 0) {
              setSelectedCompId(parsed.components[0].id);
              setAssemblyProgress(parsed.components.length);
            }
            setTerminalLogs(prev => [...prev, `[SYSTEM] Successfully imported Digital Twin JSON configuration.`]);
          }
        } catch {
          alert('Invalid Digital Twin JSON file format.');
        }
      };
    }
  };

  // --- Inspector Component Details helper ---
  const selectedComponent = useMemo(() => {
    if (!selectedCompId) return null;
    return project.components.find(c => c.id === selectedCompId) || null;
  }, [selectedCompId, project.components]);

  const toggleNode = (node: string) => {
    setExpandedNodes(prev => ({ ...prev, [node]: !prev[node] }));
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col bg-[#070b13] font-sans text-slate-100 antialiased overflow-hidden rounded-2xl border-2 border-[#1e293b]">
      {/* ── TOP NAV BAR (Siemens NX / Factory IO Style Engineering Toolbar) ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-[#0c1220] px-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-900 font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Boxes className="h-5 w-5 text-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Digital Twin v4.0</span>
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-ping" />
            </div>
            <h1 className="text-sm font-black text-slate-100 tracking-tight leading-tight uppercase">Industry 4.0 Platform</h1>
          </div>
        </div>

        {/* Professional Engineering Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-1 bg-[#131b2e] p-1 rounded-lg border border-slate-800">
          {[
            { id: 'simulation', label: 'Assembly', icon: Boxes },
            { id: 'simulation_active', label: 'Simulation Mode', icon: Activity },
            { id: 'diagnostics', label: 'Ignition SCADA', icon: Tv },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                if (mode.id === 'simulation') setLeftTab('assembly');
                else setLeftTab('hierarchy');
                setTerminalLogs(prev => [...prev, `[WORKSPACE] Switched view perspective to ${mode.label}`]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-md text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
            >
              <mode.icon className="h-3.5 w-3.5 text-amber-500" />
              {mode.label}
            </button>
          ))}
        </div>

        {/* Right Status Actions & Workspace Identifiers */}
        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-[#131a2a] border border-slate-800 px-2.5 py-1 text-xs font-mono text-slate-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> SYS: ACTIVE
          </span>

          {/* Active Serial Sync */}
          <button
            onClick={() => {
              setArduinoConnected(!arduinoConnected);
              setTerminalLogs(prev => [
                ...prev,
                arduinoConnected ? `[SYSTEM] Disconnected physical serial connection.` : `[SYSTEM] Synchronizing via Serial WebSocket bridge...`,
                !arduinoConnected ? `[SERIAL] Streaming actual physical tracking readings!` : `[SERIAL] Falling back to high-fidelity virtual simulation.`
              ]);
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
              arduinoConnected
                ? 'border-green-500/30 bg-green-950/40 text-green-400'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${arduinoConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`} />
            {arduinoConnected ? 'USB: Linked' : 'USB: Simulated'}
          </button>

          {/* Toolbar utilities */}
          <div className="flex gap-1.5">
            <button
              onClick={handleExportJSON}
              title="Export state as JSON blueprint"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-amber-500 transition-all"
            >
              <FileDown className="h-4 w-4" />
            </button>
            <label className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-amber-500 cursor-pointer transition-all">
              <FileUp className="h-4 w-4" />
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button
              onClick={handleResetAssembly}
              title="Reset workspace twin parameters"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-red-400 hover:bg-slate-700 hover:text-red-300 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE PANEL ── */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* ========================================================
            LEFT COLUMN (20% Width): Project Hierarchy & Assembly Mode
            ======================================================== */}
        {isLeftPanelOpen ? (
          <aside className="w-80 border-r border-slate-800 bg-[#090d19] flex flex-col shrink-0 relative transition-all duration-300 shadow-[2px_0_10px_rgba(0,0,0,0.3)] z-10">
            {/* Header with toggle close option */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0c1122] p-3 shrink-0">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">Workspace Hub</span>
              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="text-slate-500 hover:text-slate-200 text-xs p-1 hover:bg-slate-800 rounded transition-all"
                title="Collapse Panel"
              >
                ◀
              </button>
            </div>

            {/* Panel Selector Section */}
            <div className="flex border-b border-slate-800 p-2 gap-1 bg-[#0a0f1e] shrink-0">
              <button
                onClick={() => setLeftTab('hierarchy')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${leftTab === 'hierarchy' ? 'bg-[#182235] text-white border border-slate-700/60 shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'}`}
              >
                <Layers className="h-3.5 w-3.5 text-amber-500" /> Hierarchy
              </button>
              <button
                onClick={() => setLeftTab('assembly')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${leftTab === 'assembly' ? 'bg-[#182235] text-white border border-slate-700/60 shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'}`}
              >
                <Boxes className="h-3.5 w-3.5 text-amber-500" /> Assembly Path
              </button>
            </div>

            {/* Left Panel Inner Content with independent scrollbar */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              
              {/* TAB 1: Hierarchy Tree with search and Category Icons */}
              {leftTab === 'hierarchy' && (
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search system components..."
                        value={hierarchySearchQuery}
                        onChange={(e) => setHierarchySearchQuery(e.target.value)}
                        className="w-full bg-[#121826] border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Telemetry Nodes</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#162238] border border-slate-800 font-mono text-amber-500 font-bold">
                      {project.components.filter(c => c.name.toLowerCase().includes(hierarchySearchQuery.toLowerCase())).length} nodes
                    </span>
                  </div>

                  {/* Standardized Category Tree */}
                  <div className="text-xs space-y-2 font-mono">
                    {/* Root Node: Solar Tracker Twin */}
                    <div className="space-y-1">
                      <button
                        onClick={() => toggleNode('project')}
                        className="flex items-center justify-between w-full text-left p-1 rounded hover:bg-[#131b2d] text-amber-500 font-black uppercase tracking-wide"
                      >
                        <span className="flex items-center gap-1.5">
                          {expandedNodes.project ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          <Boxes className="h-4 w-4 text-amber-500" /> 📦 Solar Tracker
                        </span>
                        <span className="h-2 w-2 rounded-full bg-green-400" />
                      </button>

                      {expandedNodes.project && (
                        <div className="pl-3 ml-2 border-l border-slate-800 space-y-1.5">
                          
                          {/* Solderless Breadboard */}
                          {(!hierarchySearchQuery || 'solderless breadboard'.includes(hierarchySearchQuery.toLowerCase())) && (
                            <button
                              onClick={() => {
                                const c = project.components.find(x => x.type === 'breadboard');
                                if (c) {
                                  setSelectedCompId(c.id);
                                  setRightTab('inspector');
                                }
                              }}
                              className={`flex items-center justify-between w-full text-left p-1.5 rounded transition-all hover:bg-slate-800/50 ${
                                selectedComponent?.type === 'breadboard' ? 'bg-amber-500/10 border-l-2 border-amber-500 text-white font-bold' : 'text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Layers className="h-3 w-3 text-slate-400" />
                                🔩 Breadboard Base
                              </span>
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            </button>
                          )}

                          {/* MCU Arduino */}
                          {(!hierarchySearchQuery || 'arduino uno micro controller'.includes(hierarchySearchQuery.toLowerCase())) && (
                            <button
                              onClick={() => {
                                const c = project.components.find(x => x.type === 'arduino');
                                if (c) {
                                  setSelectedCompId(c.id);
                                  setRightTab('inspector');
                                }
                              }}
                              className={`flex items-center justify-between w-full text-left p-1.5 rounded transition-all hover:bg-slate-800/50 ${
                                selectedComponent?.type === 'arduino' ? 'bg-amber-500/10 border-l-2 border-amber-500 text-white font-bold' : 'text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Cpu className="h-3 w-3 text-cyan-400" />
                                ⚡ Controller: Arduino R3
                              </span>
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            </button>
                          )}

                          {/* Actuation Gimbal Frame */}
                          <div>
                            <button
                              onClick={() => toggleNode('frame')}
                              className="flex items-center gap-1.5 w-full text-left p-1 hover:bg-[#131b2d] text-slate-400 uppercase tracking-widest text-[9px] font-bold"
                            >
                              {expandedNodes.frame ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span>⚙ Mechanical Actuation</span>
                            </button>

                            {expandedNodes.frame && (
                              <div className="pl-3 border-l border-slate-800 space-y-1 mt-1">
                                {/* Azimuth Servo */}
                                {(!hierarchySearchQuery || 'azimuth axis joint'.includes(hierarchySearchQuery.toLowerCase())) && (
                                  <button
                                    onClick={() => {
                                      const c = project.components.find(x => x.type === 'servo_vertical');
                                      if (c) {
                                        setSelectedCompId(c.id);
                                        setRightTab('inspector');
                                      }
                                    }}
                                    className={`flex items-center justify-between w-full text-left p-1.5 rounded transition-all hover:bg-slate-800/50 ${
                                      selectedComponent?.type === 'servo_vertical' ? 'bg-amber-500/10 border-l-2 border-amber-500 text-white font-bold' : 'text-slate-400'
                                    }`}
                                  >
                                    <span className="pl-1 text-[11px]">↳ SG90 Azimuth Joint</span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                                  </button>
                                )}

                                {/* Elevation Servo */}
                                {(!hierarchySearchQuery || 'elevation tilt axis joint'.includes(hierarchySearchQuery.toLowerCase())) && (
                                  <button
                                    onClick={() => {
                                      const c = project.components.find(x => x.type === 'servo_horizontal');
                                      if (c) {
                                        setSelectedCompId(c.id);
                                        setRightTab('inspector');
                                      }
                                    }}
                                    className={`flex items-center justify-between w-full text-left p-1.5 rounded transition-all hover:bg-slate-800/50 ${
                                      selectedComponent?.type === 'servo_horizontal' ? 'bg-amber-500/10 border-l-2 border-amber-500 text-white font-bold' : 'text-slate-400'
                                    }`}
                                  >
                                    <span className="pl-1 text-[11px]">↳ SG90 Elevation Joint</span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                                  </button>
                                )}

                                {/* Solar Panel payload */}
                                {(!hierarchySearchQuery || 'solar pv collector'.includes(hierarchySearchQuery.toLowerCase())) && (
                                  <button
                                    onClick={() => {
                                      const c = project.components.find(x => x.type === 'solar_panel');
                                      if (c) {
                                        setSelectedCompId(c.id);
                                        setRightTab('inspector');
                                      }
                                    }}
                                    className={`flex items-center justify-between w-full text-left p-1.5 rounded transition-all hover:bg-slate-800/50 ${
                                      selectedComponent?.type === 'solar_panel' ? 'bg-amber-500/10 border-l-2 border-amber-500 text-white font-bold' : 'text-slate-300'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1 pl-1">
                                      <Sun className="h-3 w-3 text-amber-500 animate-spin-slow" />
                                      ☀ Solar PV Collector
                                    </span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Sensors Sub-tree */}
                          <div>
                            <button
                              onClick={() => toggleNode('sensors')}
                              className="flex items-center gap-1.5 w-full text-left p-1 hover:bg-[#131b2d] text-slate-400 uppercase tracking-widest text-[9px] font-bold"
                            >
                              {expandedNodes.sensors ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span>📡 Sensor Array quadrants</span>
                            </button>

                            {expandedNodes.sensors && (
                              <div className="pl-3 border-l border-slate-800 space-y-1 mt-1">
                                {['ldr_tl', 'ldr_tr', 'ldr_bl', 'ldr_br'].map(key => {
                                  const mapped = COMPONENT_REGISTRY[key];
                                  if (!mapped) return null;
                                  if (hierarchySearchQuery && !mapped.name.toLowerCase().includes(hierarchySearchQuery.toLowerCase())) return null;
                                  return (
                                    <button
                                      key={key}
                                      onClick={() => {
                                        const c = project.components.find(x => x.type === mapped.type);
                                        if (c) {
                                          setSelectedCompId(c.id);
                                          setRightTab('inspector');
                                        }
                                      }}
                                      className={`flex items-center justify-between w-full text-left p-1.5 rounded transition-all hover:bg-slate-800/50 ${
                                        selectedComponent?.type === mapped.type ? 'bg-amber-500/10 border-l-2 border-amber-500 text-white font-bold' : 'text-slate-400'
                                      }`}
                                    >
                                      <span className="text-[11px]">↳ {mapped.name.split(' ')[0]} LDR</span>
                                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational diagnostics badge widget */}
                  <div className="rounded-xl border border-slate-800 bg-[#0f1525] p-3 text-xs leading-relaxed space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300 flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5 text-green-400" /> System Integrity
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-950/40 text-green-400 font-bold border border-green-500/20">99.8%</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Closed-loop tracking logic reports accurate feedback alignment against simulated solar vectors.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: Assembly Sequence Path (Siemens NX Step Guide Style) */}
              {leftTab === 'assembly' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Sequence Progress</span>
                    <span className="text-xs font-black text-amber-500 font-mono">
                      {Math.round((assemblyProgress / ASSEMBLY_SEQUENCE_STEPS.length) * 100)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full bg-[#111624] rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                      style={{ width: `${(assemblyProgress / ASSEMBLY_SEQUENCE_STEPS.length) * 100}%` }}
                    />
                  </div>

                  {/* Active Step Guide */}
                  {currentAssemblyStep ? (
                    <div className="rounded-xl border-2 border-amber-500/30 bg-amber-950/10 p-4 space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Step {currentAssemblyStep.step} of 11</span>
                        <span className="rounded bg-[#ff9900]/10 px-2 py-0.5 text-[9px] font-mono text-amber-500 border border-amber-500/20">
                          PENDING LINK
                        </span>
                      </div>
                      <h3 className="text-xs font-black text-slate-200 uppercase tracking-wide leading-tight">{currentAssemblyStep.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{currentAssemblyStep.description}</p>
                      
                      <button
                        onClick={handleAssembleNext}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-black py-2.5 text-xs transition-transform hover:-translate-y-0.5 shadow-md shadow-amber-500/10"
                      >
                        Assemble Next Component <ChevronRight className="h-4 w-4 text-slate-950" />
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-4 text-center space-y-3">
                      <Award className="h-10 w-10 text-green-400 mx-auto animate-bounce" />
                      <h3 className="text-xs font-black text-green-400 uppercase tracking-widest">Twin Synchronized</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        All physical structural and sensory units placed on breadboard layout correctly.
                      </p>
                      <button
                        onClick={handleResetAssembly}
                        className="w-full rounded-lg border border-slate-800 bg-slate-800 text-slate-300 hover:bg-slate-700 py-1.5 text-xs font-bold"
                      >
                        Reset Assembly Path
                      </button>
                    </div>
                  )}

                  {/* Assembly Steps Grid */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Step Matrix</span>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {ASSEMBLY_SEQUENCE_STEPS.map((step) => {
                        const completed = assemblyProgress >= step.step;
                        return (
                          <div
                            key={step.step}
                            className={`flex items-center gap-3 p-2 rounded-lg border text-xs transition-all ${
                              completed ? 'border-slate-800/60 bg-[#0d1424]/20 text-slate-400' : 'border-slate-800 bg-slate-900/10 text-slate-500'
                            }`}
                          >
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${completed ? 'bg-green-500/10 text-green-400 border border-green-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                              {completed ? '✓' : step.step}
                            </div>
                            <div className="min-w-0 flex-1 leading-snug">
                              <p className={`truncate font-bold ${completed ? 'text-slate-400 font-mono' : 'text-slate-500 font-mono'}`}>{step.title}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        ) : (
          /* Mini Tab to reopen Left panel */
          <button
            onClick={() => setIsLeftPanelOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-[#0c1122] hover:bg-slate-800 text-slate-400 hover:text-white border-y border-r border-slate-700 p-2 rounded-r-lg text-xs"
            title="Expand Hierarchy Panel"
          >
            ▶
          </button>
        )}

        {/* ========================================================
            CENTER COLUMN (60% Width): 3D Digital Twin Core Viewport
            ======================================================== */}
        <section className="flex-1 flex flex-col bg-[#0b0f19] relative overflow-hidden">
          
          {/* Real-time Sun Angle Widgets HUD overlay */}
          <div className="absolute top-4 left-4 z-10 space-y-2 pointer-events-auto">
            <div className="rounded-xl border border-slate-800/80 bg-[#0e1422]/90 backdrop-blur-md p-4 max-w-xs space-y-3 shadow-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                <Sun className="h-4 w-4 text-amber-400 animate-spin-slow" /> Ambient Solar Source Vector
              </span>
              
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-500 uppercase font-black">Azimuth (E ➔ W):</span>
                  <span className="text-amber-400 font-bold">{sunAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={sunAngle}
                  onChange={(e) => {
                    setSunAngle(parseInt(e.target.value));
                    if (autoTracking) {
                      setTerminalLogs(prev => [...prev.slice(-15), `[SIMULATOR] Orbital change: Sun set to ${e.target.value}°`]);
                    }
                  }}
                  className="w-full accent-amber-500 h-1 bg-slate-800 rounded"
                />
                
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-500 uppercase font-black">Elevation Height:</span>
                  <span className="text-amber-400 font-bold">{sunElevation}°</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={sunElevation}
                  onChange={(e) => {
                    setSunElevation(parseInt(e.target.value));
                  }}
                  className="w-full accent-amber-500 h-1 bg-slate-800 rounded"
                />
              </div>

              {/* Angle Presets */}
              <div className="flex gap-1 pt-1 border-t border-slate-800/80">
                {[
                  { label: 'Sunrise', a: 15, e: 30 },
                  { label: 'Noon', a: 90, e: 85 },
                  { label: 'Sunset', a: 165, e: 25 }
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setSunAngle(p.a);
                      setSunElevation(p.e);
                    }}
                    className="flex-1 rounded bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 py-1 text-[9px] font-black uppercase text-slate-300 hover:text-white transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Action HUD (Blender style selection tools) */}
          {selectedComponent && (
            <div className="absolute top-4 right-4 z-10 pointer-events-auto">
              <div className="flex items-center gap-1 bg-[#0d1424]/90 backdrop-blur border border-slate-700/80 p-1.5 rounded-xl shadow-2xl">
                <span className="text-[10px] font-black uppercase text-slate-500 px-2 font-mono truncate max-w-[120px]">
                  {selectedComponent.name.split(' ')[0]}
                </span>
                <div className="h-4 w-[1px] bg-slate-800" />
                {[
                  { label: 'Move', icon: Compass, action: () => setTerminalLogs(prev => [...prev, `[COMMAND] Move selected component coordinates`]) },
                  { label: 'Rotate', icon: RotateCcw, action: () => setTerminalLogs(prev => [...prev, `[COMMAND] Rotate component model projection`]) },
                  { label: 'Wiring', icon: Sparkles, action: () => setTerminalLogs(prev => [...prev, `[COMMAND] Highlight diagnostic wiring ports`]) },
                  { label: 'Properties', icon: Info, action: () => setRightTab('inspector') }
                ].map((tool) => (
                  <button
                    key={tool.label}
                    onClick={tool.action}
                    title={tool.label}
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 transition-all border border-transparent hover:border-amber-500/20"
                  >
                    <tool.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3D Viewport Area */}
          <div className="flex-1 w-full relative">
            <Canvas camera={{ position: [5, 4, 5], fov: 42 }} gl={{ antialias: true }} shadows>
              <color attach="background" args={['#080c14']} />
              <ambientLight intensity={0.5} />
              
              {/* Sun Light Source (creates shadows) */}
              <directionalLight
                position={sun3DPosition}
                intensity={2.0}
                castShadow
                shadow-mapSize={[2048, 2048]}
              />
              
              {/* Ambient ground reflectance */}
              <directionalLight position={[-5, 5, -5]} intensity={0.4} />
              
              <Suspense fallback={null}>
                <DynamicTwinScene
                  components={project.components}
                  selectedComponentId={selectedCompId}
                  onSelectComponent={setSelectedCompId}
                  sunPosition={sun3DPosition}
                  servoX={servoX}
                  servoY={servoY}
                  assemblyStep={assemblyProgress}
                />
              </Suspense>

              <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={15} />
            </Canvas>

            {/* Stage coordinate legend badges */}
            <div className="absolute bottom-4 left-4 z-10 flex gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800/80 bg-[#0e1422]/95 px-3 py-1 text-[10px] font-bold text-slate-300 backdrop-blur shadow-lg">
                <Compass className="h-3.5 w-3.5 text-blue-400" /> Rotate 3D twin model
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800/80 bg-[#0e1422]/95 px-3 py-1 text-[10px] font-bold text-slate-300 backdrop-blur shadow-lg">
                <Activity className="h-3.5 w-3.5 text-green-400 animate-pulse" /> 60 FPS NOMINAL
              </span>
            </div>
          </div>

          {/* ========================================================
              BOTTOM DRAWER (VS Code Style tabbed console layout)
              ======================================================== */}
          {isBottomDrawerOpen ? (
            <div
              className={`border-t border-slate-800 bg-[#070a12] flex flex-col transition-all duration-300 ${
                bottomDrawerHeight === 'small' ? 'h-32' : bottomDrawerHeight === 'medium' ? 'h-52' : 'h-80'
              }`}
            >
              {/* Tab Header */}
              <div className="flex h-9 items-center justify-between border-b border-slate-800 bg-[#0b0f1a] px-3 shrink-0 select-none">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {[
                    { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
                    { id: 'serial', label: 'Serial Monitor', icon: Terminal },
                    { id: 'telemetry', label: 'Telemetry stream', icon: Activity },
                    { id: 'problems', label: 'Problems list', icon: AlertTriangle }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setBottomDrawerTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded transition-all ${
                        bottomDrawerTab === tab.id
                          ? 'bg-[#182236] text-white border border-slate-700/80 shadow'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Window height toggle actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (bottomDrawerHeight === 'small') setBottomDrawerHeight('medium');
                      else if (bottomDrawerHeight === 'medium') setBottomDrawerHeight('large');
                      else setBottomDrawerHeight('small');
                    }}
                    className="text-[9px] text-slate-500 hover:text-slate-300 bg-[#121826] px-1.5 py-0.5 rounded border border-slate-800"
                    title="Toggle Height Size"
                  >
                    Size: {bottomDrawerHeight.toUpperCase()}
                  </button>
                  <button
                    onClick={() => setIsBottomDrawerOpen(false)}
                    className="text-[9px] font-bold text-slate-500 hover:text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded"
                  >
                    Collapse ✖
                  </button>
                </div>
              </div>

              {/* Tab Content rendering area */}
              <div className="flex-1 overflow-hidden relative flex flex-col">
                
                {/* AI Copilot dialogue tab */}
                {bottomDrawerTab === 'copilot' && (
                  <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                      {copilotMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-2.5 max-w-4xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                          <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] ${
                            msg.sender === 'ai' ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-white'
                          }`}>
                            {msg.sender === 'ai' ? 'AI' : 'U'}
                          </div>
                          <div className={`rounded-lg px-3 py-1.5 text-xs leading-relaxed ${
                            msg.sender === 'ai' ? 'bg-[#121826] border border-slate-800 text-slate-300' : 'bg-amber-500 text-slate-950 font-semibold'
                          }`}>
                            <p>{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>

                    <div className="w-48 border-l border-slate-800 bg-[#090e18] p-2.5 shrink-0 hidden md:flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-1">Fast Prompts</span>
                      <div className="space-y-1">
                        {['Wiring plan', 'Servos stutters', 'Deadband values'].map((ptext) => (
                          <button
                            key={ptext}
                            onClick={() => setCopilotInput(`Show ${ptext}`)}
                            className="w-full text-left bg-[#121826] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[9px] text-slate-400 p-1 rounded truncate font-mono"
                          >
                            {ptext}
                          </button>
                        ))}
                      </div>
                      <span className="text-[8px] text-slate-600 block text-right font-mono">Kernel v4.0</span>
                    </div>
                  </div>
                )}

                {/* Virtual Serial Monitor (9600 BAUD) */}
                {bottomDrawerTab === 'serial' && (
                  <div className="flex-1 flex flex-col bg-[#070b13]">
                    <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] text-green-400 space-y-1 custom-scrollbar">
                      {terminalLogs.slice(-20).map((log, idx) => (
                        <div key={idx} className="leading-snug opacity-90">{log}</div>
                      ))}
                    </div>
                    <div className="h-8 border-t border-slate-800 bg-[#0a0e16] flex items-center px-3 shrink-0">
                      <span className="text-slate-500 text-[10px] font-mono mr-2">&gt;_</span>
                      <input
                        type="text"
                        placeholder="Type Serial command (e.g. SET_DEADBAND 15) and press Enter..."
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && terminalInput.trim()) {
                            setTerminalLogs(prev => [...prev, `[USER COMMAND] ${terminalInput}`]);
                            if (terminalInput.toLowerCase().includes('deadband')) {
                              setTerminalLogs(prev => [...prev, `[SYSTEM] Set digital deadband buffer threshold to ${terminalInput.split(' ')[1] || '12'}mV`]);
                            } else if (terminalInput.toLowerCase().includes('manual')) {
                              setAutoTracking(false);
                              setTerminalLogs(prev => [...prev, `[SYSTEM] Switched to Manual Joystick Joint Actuation.`]);
                            } else {
                              setTerminalLogs(prev => [...prev, `[COMMAND ERR] Command not recognized inside localized kernel.`]);
                            }
                            setTerminalInput('');
                          }
                        }}
                        className="flex-1 bg-transparent border-none text-[10px] text-slate-200 focus:outline-none focus:ring-0 placeholder-slate-700 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Live Telemetry stream logs */}
                {bottomDrawerTab === 'telemetry' && (
                  <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] text-cyan-400 space-y-1.5 custom-scrollbar">
                    <div>[SYS] Incident Sun Coordinates: X: {sun3DPosition[0].toFixed(3)} | Y: {sun3DPosition[1].toFixed(3)} | Z: {sun3DPosition[2].toFixed(3)}</div>
                    <div>[SYS] Calculated Solar Alignment Error: {(100 - solarPowerMetrics.efficiency).toFixed(1)}% offset displacement</div>
                    <div>[SYS] SG90 Joints Yaw position: {servoX.toFixed(1)}° | Pitch position: {servoY.toFixed(1)}°</div>
                    <div>[SYS] Photovoltaic feedback array generating Voc: {solarPowerMetrics.voltage}V | Power output: {solarPowerMetrics.powerMw}mW</div>
                    <div>[SYS] Physical telemetry channel status: {telemetryStatus === 'connected' ? (latestFrame ? 'CONNECTED' : 'CONNECTED / WAITING FOR TELEMETRY') : telemetryStatus.toUpperCase()} {telemetryStatus === 'connected' && telemetryDeviceId ? `(${telemetryDeviceId})` : ''}</div>
                    {latestFrame && (
                      <div className="pt-2 border-t border-slate-800 text-slate-300">
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Last physical frame</div>
                        <div>TL: {latestFrame.topLeft} | TR: {latestFrame.topRight} | BL: {latestFrame.bottomLeft} | BR: {latestFrame.bottomRight}</div>
                        <div>Servo X: {latestFrame.servoX}° | Servo Y: {latestFrame.servoY}°</div>
                        <div className="text-[10px] text-slate-400">Frame ts: {new Date(latestFrame.timestamp).toLocaleTimeString()}</div>
                      </div>
                    )}
                    <div>[SYS] Local calibration state nominal. Closed-loop PID coefficient stable.</div>
                  </div>
                )}

                {/* Problems checklist warnings */}
                {bottomDrawerTab === 'problems' && (
                  <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar">
                    <div className="flex items-center gap-2 text-amber-500">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Warning (1): Hardware Link Unavailable. Falling back to local twin simulation.</span>
                    </div>
                    {solarPowerMetrics.efficiency < 40 && (
                      <div className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Warning (2): Suboptimal light tracking. Efficiency drops below 40% threshold.</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-500">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <span>Diagnostics: SG90 temperature 31°C holds nominal values.</span>
                    </div>
                  </div>
                )}

                {/* Bottom Input Form for AI dialog when on Copilot tab */}
                {bottomDrawerTab === 'copilot' && (
                  <form onSubmit={handleSendCopilotMessage} className="h-9 border-t border-slate-800 bg-[#0c121e] flex items-center px-3 shrink-0">
                    <input
                      type="text"
                      placeholder="Ask AI Copilot for assembly, tracking parameters, wiring checks, or troubleshooting..."
                      value={copilotInput}
                      onChange={(e) => setCopilotInput(e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-slate-200 focus:outline-none focus:ring-0 placeholder-slate-600"
                    />
                    <button
                      type="submit"
                      className="h-6 px-3 rounded bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <Send className="h-3 w-3" /> Send
                    </button>
                  </form>
                )}

              </div>
            </div>
          ) : (
            /* Tab strip to easily reopen bottom drawer */
            <div className="h-8 border-t border-slate-800 bg-[#070a12] flex items-center justify-between px-3 shrink-0">
              <button
                onClick={() => setIsBottomDrawerOpen(true)}
                className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-400 flex items-center gap-1"
              >
                ▲ Open Bottom Engineering Drawer
              </button>
              <span className="text-[9px] font-mono text-slate-600">Copilot Offline but responsive</span>
            </div>
          )}
        </section>

        {/* ========================================================
            RIGHT COLUMN (20% Width): SCADA Telemetry Dashboard & Inspector
            ======================================================== */}
        {isRightPanelOpen ? (
          <aside className="w-80 border-l border-slate-800 bg-[#090d19] flex flex-col shrink-0 relative transition-all duration-300 shadow-[-2px_0_10px_rgba(0,0,0,0.3)] z-10">
            {/* Header with collapse button */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0c1122] p-3 shrink-0">
              <button
                onClick={() => setIsRightPanelOpen(false)}
                className="text-slate-500 hover:text-slate-200 text-xs p-1 hover:bg-slate-800 rounded transition-all"
                title="Collapse Panel"
              >
                ▶
              </button>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">SCADA Diagnostics</span>
            </div>

            {/* Sidebar toggle tab switcher */}
            <div className="flex border-b border-slate-800 p-2 gap-1 bg-[#0a0f1e] shrink-0">
              <button
                onClick={() => setRightTab('dashboard')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${rightTab === 'dashboard' ? 'bg-[#182235] text-white border border-slate-700/60 shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'}`}
              >
                <Activity className="h-3.5 w-3.5 text-amber-500" /> SCADA Live
              </button>
              <button
                onClick={() => setRightTab('inspector')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${rightTab === 'inspector' ? 'bg-[#182235] text-white border border-slate-700/60 shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/35'}`}
              >
                <Info className="h-3.5 w-3.5 text-amber-500" /> Inspector
              </button>
            </div>

            {/* Right Scrollable Panel Column */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              
              {/* TAB 1: Real-Time Telemetry Dashboard */}
              {rightTab === 'dashboard' && (
                <div className="space-y-4">
                  {/* Simulation State controllers */}
                  <div className="rounded-xl border border-slate-800 bg-[#121826] p-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tracker Controllers</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${autoTracking ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-400'}`}>
                        {autoTracking ? 'AUTO CLOSED-LOOP' : 'MANUAL INPUT'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs">
                      <span className="text-slate-400 font-bold">Simulator Engine:</span>
                      <button
                        onClick={() => {
                          setIsSimulating(!isSimulating);
                          setTerminalLogs(prev => [...prev, isSimulating ? `[SIMULATOR] Paused virtual orbital calculations.` : `[SIMULATOR] Resumed active calculations.`]);
                        }}
                        className={`flex h-5 items-center rounded-full px-1 w-11 transition-colors ${isSimulating ? 'bg-amber-500' : 'bg-slate-800'}`}
                      >
                        <div className={`h-3 w-3 rounded-full bg-slate-900 transition-transform ${isSimulating ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs">
                      <span className="text-slate-400 font-bold">Auto Tracking Mode:</span>
                      <button
                        onClick={() => setAutoTracking(!autoTracking)}
                        className={`flex h-5 items-center rounded-full px-1 w-11 transition-colors ${autoTracking ? 'bg-amber-500' : 'bg-slate-800'}`}
                      >
                        <div className={`h-3 w-3 rounded-full bg-slate-900 transition-transform ${autoTracking ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Azimuth / Elevation Gauge Dials */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-[#111724] p-3 text-center space-y-1 shadow">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">Yaw Joint</span>
                      <div className="relative h-14 w-14 mx-auto">
                        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#1d263b" strokeWidth="3" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#fbbf24" strokeWidth="3" strokeDasharray={`${(servoX / 180) * 87.9} 87.9`} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-black text-slate-200">
                          {Math.round(servoX)}°
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">Yaw Azimuth</p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#111724] p-3 text-center space-y-1 shadow">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">Pitch Joint</span>
                      <div className="relative h-14 w-14 mx-auto">
                        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#1d263b" strokeWidth="3" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#fbbf24" strokeWidth="3" strokeDasharray={`${(servoY / 180) * 87.9} 87.9`} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-black text-slate-200">
                          {Math.round(servoY)}°
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">Pitch Tilt</p>
                    </div>
                  </div>

                  {/* Manual Sliders when auto-tracking is off */}
                  {!autoTracking && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 space-y-2.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                        ⚙ Manual Actuation Override
                      </span>
                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                            <span>Servo Yaw:</span>
                            <span className="text-amber-500 font-bold">{Math.round(servoX)}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="180"
                            value={servoX}
                            onChange={(e) => setServoX(parseInt(e.target.value))}
                            className="w-full h-1 accent-amber-500 bg-slate-800 rounded"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                            <span>Servo Pitch:</span>
                            <span className="text-amber-500 font-bold">{Math.round(servoY)}°</span>
                          </div>
                          <input
                            type="range"
                            min="15"
                            max="165"
                            value={servoY}
                            onChange={(e) => setServoY(parseInt(e.target.value))}
                            className="w-full h-1 accent-amber-500 bg-slate-800 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PV power Generation statistics */}
                  <div className="rounded-xl border border-slate-800 bg-[#121824] p-3.5 space-y-3 shadow">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                      <Tv className="h-4 w-4 text-amber-500" /> Micro-grid Generation Feed
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-[#161e31] rounded-lg p-2.5 border border-slate-800">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Power</p>
                        <p className="text-md font-mono font-black text-amber-400">{solarPowerMetrics.powerMw} <span className="text-[10px] text-slate-400">mW</span></p>
                      </div>
                      <div className="bg-[#161e31] rounded-lg p-2.5 border border-slate-800">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Panel Yield</p>
                        <p className="text-md font-mono font-black text-green-400">{solarPowerMetrics.efficiency}%</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[10px] border-t border-slate-800 pt-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Volts (Voc):</span>
                        <span className="text-slate-300 font-bold">{solarPowerMetrics.voltage} V</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amps (Isc):</span>
                        <span className="text-slate-300 font-bold">{solarPowerMetrics.current} mA</span>
                      </div>
                    </div>
                  </div>

                  {/* Quadrant Photoresistor inputs */}
                  <div className="rounded-xl border border-slate-800 bg-[#121824] p-3.5 space-y-3 shadow">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">Sensor Array Intensitites (0-1023)</span>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      {/* TL */}
                      <div className="bg-[#101524] rounded border border-slate-800 p-2 text-center">
                        <span className="text-[8px] text-slate-500 uppercase font-black block leading-none">Top Left</span>
                        <span className="text-xs font-black text-slate-200 mt-1 block leading-none">{ldrIntensity.tl}</span>
                        <div className="h-1 w-full bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${(ldrIntensity.tl / 1023) * 100}%` }} />
                        </div>
                      </div>
                      {/* TR */}
                      <div className="bg-[#101524] rounded border border-slate-800 p-2 text-center">
                        <span className="text-[8px] text-slate-500 uppercase font-black block leading-none">Top Right</span>
                        <span className="text-xs font-black text-slate-200 mt-1 block leading-none">{ldrIntensity.tr}</span>
                        <div className="h-1 w-full bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${(ldrIntensity.tr / 1023) * 100}%` }} />
                        </div>
                      </div>
                      {/* BL */}
                      <div className="bg-[#101524] rounded border border-slate-800 p-2 text-center">
                        <span className="text-[8px] text-slate-500 uppercase font-black block leading-none">Bottom Left</span>
                        <span className="text-xs font-black text-slate-200 mt-1 block leading-none">{ldrIntensity.bl}</span>
                        <div className="h-1 w-full bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${(ldrIntensity.bl / 1023) * 100}%` }} />
                        </div>
                      </div>
                      {/* BR */}
                      <div className="bg-[#101524] rounded border border-slate-800 p-2 text-center">
                        <span className="text-[8px] text-slate-500 uppercase font-black block leading-none">Bottom Right</span>
                        <span className="text-xs font-black text-slate-200 mt-1 block leading-none">{ldrIntensity.br}</span>
                        <div className="h-1 w-full bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${(ldrIntensity.br / 1023) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Component Inspector */}
              {rightTab === 'inspector' && (
                <div className="space-y-4">
                  {selectedComponent ? (
                    <div className="space-y-4">
                      <div className="pb-3 border-b border-slate-800">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 uppercase font-black font-mono">
                          {selectedComponent.metadata.category}
                        </span>
                        <h3 className="text-sm font-black text-slate-100 mt-1.5">{selectedComponent.name}</h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {selectedComponent.metadata.sku}</p>
                      </div>

                      {/* Details specs */}
                      <div className="space-y-3 text-xs">
                        <p className="text-slate-400 leading-relaxed font-sans">{selectedComponent.metadata.description}</p>
                        
                        <div className="bg-[#121824] rounded-xl p-3 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">General Properties</span>
                          {Object.entries(selectedComponent.properties).map(([key, val]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-slate-500">{key}:</span>
                              <span className="text-slate-300">{String(val)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1.5">
                            <span className="text-slate-500">Weight:</span>
                            <span className="text-slate-300">{selectedComponent.metadata.weightGrams}g</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Dimensions:</span>
                            <span className="text-slate-300 truncate max-w-[120px]" title={selectedComponent.metadata.dimensions}>
                              {selectedComponent.metadata.dimensions}
                            </span>
                          </div>
                        </div>

                        {/* Port connections status */}
                        {selectedComponent.ports.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Active Wire Ports</span>
                            <div className="space-y-1">
                              {selectedComponent.ports.map(port => (
                                <div key={port.id} className="flex items-center justify-between p-1.5 rounded bg-[#101524] border border-slate-800 text-[10px] font-mono">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <div className={`h-1.5 w-1.5 rounded-full ${port.type === 'power' ? 'bg-red-500 animate-pulse' : port.type === 'ground' ? 'bg-slate-500' : 'bg-blue-400'}`} />
                                    {port.name}
                                  </span>
                                  <span className="text-green-400 font-bold">LOCKED</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Simulation Rules */}
                        <div className="rounded-xl border border-slate-800 bg-[#121824] p-3 space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Simulation Rules</span>
                          <div className="space-y-1">
                            {selectedComponent.simulation.rules.map((rule, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                                <Check className="h-3.5 w-3.5 text-amber-500" /> {rule}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Maintenance scheduler */}
                        <div className="rounded-xl border border-slate-800 bg-[#121824] p-3 space-y-2 font-mono text-[10px]">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Wrench className="h-3 w-3 text-amber-500" /> Maintenance Cycles
                          </span>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Service Threshold:</span>
                            <span className="text-slate-300">{selectedComponent.ai.maintenanceCycleDays} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Last Service:</span>
                            <span className="text-slate-300">{selectedComponent.ai.lastServiceDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Health Index:</span>
                            <span className="text-green-400 font-bold">100% (Nominal)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-500 space-y-2">
                      <Layers className="h-8 w-8 mx-auto opacity-45" />
                      <p className="text-xs">No component selected.</p>
                      <p className="text-[10px] max-w-xs leading-relaxed">
                        Click on any component in the system hierarchy tree or in the 3D grid area to inspect.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        ) : (
          /* Mini Tab to reopen Right panel */
          <button
            onClick={() => setIsRightPanelOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-[#0c1122] hover:bg-slate-800 text-slate-400 hover:text-white border-y border-l border-slate-700 p-2 rounded-l-lg text-xs"
            title="Expand Diagnostics Panel"
          >
            ◀
          </button>
        )}

      </div>
    </div>
  );
};
