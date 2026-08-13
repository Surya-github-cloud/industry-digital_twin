export interface TwinPort {
  id: string;
  name: string;
  type: 'power' | 'ground' | 'signal' | 'analog' | 'pwm';
  expectedConnectedTo?: string; // Target component id or specific pin for validation
  connectedTo?: string; // Actively connected wire target
}

export interface TwinComponent {
  id: string;
  name: string;
  type: string; // 'arduino' | 'servo_vertical' | 'servo_horizontal' | 'solar_panel' | 'ldr' | 'resistor' | 'breadboard' | 'plc' | 'robot_arm' | 'conveyor'
  status: 'pending' | 'placed' | 'active' | 'warning' | 'fault';
  position: [number, number, number];
  rotation: [number, number, number];
  parent?: string;
  children: string[];
  ports: TwinPort[];
  properties: Record<string, any>;
  metadata: {
    category: 'controller' | 'actuator' | 'sensor' | 'structural' | 'passive';
    sku: string;
    description: string;
    weightGrams: number;
    dimensions: string;
  };
  simulation: {
    type: string;
    rules: string[];
    state: Record<string, any>;
  };
  ai: {
    guidance: string;
    troubleshooting: string;
    maintenanceCycleDays: number;
    lastServiceDate: string;
  };
}

export interface TwinProject {
  id: string;
  name: string;
  description: string;
  components: TwinComponent[];
  wires: {
    id: string;
    fromComponent: string;
    fromPort: string;
    toComponent: string;
    toPort: string;
    color: string;
  }[];
}

// Global Registry of Modular Components for the Industrial Platform
export const COMPONENT_REGISTRY: Record<string, Omit<TwinComponent, 'id' | 'position' | 'rotation' | 'status' | 'children'>> = {
  breadboard: {
    name: 'Solderless Breadboard',
    type: 'breadboard',
    ports: [],
    properties: {
      tiePoints: 830,
      columns: 60,
    },
    metadata: {
      category: 'structural',
      sku: 'BB-830-W',
      description: 'Standard 830 tie-point breadboard with dual power rails.',
      weightGrams: 85,
      dimensions: '165mm x 55mm x 10mm',
    },
    simulation: {
      type: 'passive_bus',
      rules: ['conduct_rows', 'conduct_power_rails'],
      state: {},
    },
    ai: {
      guidance: 'Place this first as your central wiring node. Mount it to the base plate.',
      troubleshooting: 'Ensure row splits are maintained; do not place both pins of a dual-lead component in the same column row.',
      maintenanceCycleDays: 365,
      lastServiceDate: '2026-01-10',
    },
  },
  arduino: {
    name: 'Arduino Uno R3',
    type: 'arduino',
    ports: [
      { id: '5V', name: '5V Power Out', type: 'power', expectedConnectedTo: 'breadboard' },
      { id: 'GND', name: 'Ground', type: 'ground', expectedConnectedTo: 'breadboard' },
      { id: 'A0', name: 'Analog In 0 (LDR TL)', type: 'analog', expectedConnectedTo: 'ldr_tl' },
      { id: 'A1', name: 'Analog In 1 (LDR TR)', type: 'analog', expectedConnectedTo: 'ldr_tr' },
      { id: 'A2', name: 'Analog In 2 (LDR BL)', type: 'analog', expectedConnectedTo: 'ldr_bl' },
      { id: 'A3', name: 'Analog In 3 (LDR BR)', type: 'analog', expectedConnectedTo: 'ldr_br' },
      { id: 'D9', name: 'Digital 9 (Servo Vert)', type: 'pwm', expectedConnectedTo: 'servo_vert' },
      { id: 'D10', name: 'Digital 10 (Servo Horiz)', type: 'pwm', expectedConnectedTo: 'servo_horiz' },
    ],
    properties: {
      voltage: '5V',
      microcontroller: 'ATmega328P',
      clockSpeed: '16 MHz',
      firmwareVersion: '1.0.4',
    },
    metadata: {
      category: 'controller',
      sku: 'MCU-UNO-R3',
      description: '8-bit microcontroller board featuring digital and analog input/output pins.',
      weightGrams: 25,
      dimensions: '68.6mm x 53.4mm x 15mm',
    },
    simulation: {
      type: 'mcu_controller',
      rules: ['process_inputs', 'output_pwm_signals', 'serial_stream'],
      state: { running: true, memoryFree: 2048 },
    },
    ai: {
      guidance: 'Secure the microcontroller adjacent to the breadboard. Connect its 5V and GND pins to the primary power rail.',
      troubleshooting: 'If compilation fails, verify standard C++ syntax or check if Pins 9 and 10 are declared in setup().',
      maintenanceCycleDays: 180,
      lastServiceDate: '2026-03-15',
    },
  },
  servo_vert: {
    name: 'Azimuth Servo (Vertical Axis)',
    type: 'servo_vertical',
    ports: [
      { id: 'VCC', name: 'Power VCC', type: 'power', expectedConnectedTo: 'arduino' },
      { id: 'GND', name: 'Ground GND', type: 'ground', expectedConnectedTo: 'arduino' },
      { id: 'SIG', name: 'PWM Signal Pin 9', type: 'pwm', expectedConnectedTo: 'arduino' },
    ],
    properties: {
      angle: 90,
      minAngle: 0,
      maxAngle: 180,
      torque: '1.8 kg-cm',
    },
    metadata: {
      category: 'actuator',
      sku: 'ACT-SG90-V',
      description: 'Micro SG90 9g servo motor to actuate the vertical/azimuth tracking axis.',
      weightGrams: 9,
      dimensions: '22.2mm x 11.8mm x 31.8mm',
    },
    simulation: {
      type: 'rotary_actuator',
      rules: ['respond_to_pwm', 'apply_mechanical_torque'],
      state: { temperatureCelsius: 32 },
    },
    ai: {
      guidance: 'Mount this servo directly on the base frame, pointing vertically, to control the left-to-right tracking motion.',
      troubleshooting: 'If servo stutters, check for floating ground. High torque adjustments require external power decoupling.',
      maintenanceCycleDays: 90,
      lastServiceDate: '2026-04-22',
    },
  },
  servo_horiz: {
    name: 'Elevation Servo (Horizontal Axis)',
    type: 'servo_horizontal',
    ports: [
      { id: 'VCC', name: 'Power VCC', type: 'power', expectedConnectedTo: 'arduino' },
      { id: 'GND', name: 'Ground GND', type: 'ground', expectedConnectedTo: 'arduino' },
      { id: 'SIG', name: 'PWM Signal Pin 10', type: 'pwm', expectedConnectedTo: 'arduino' },
    ],
    properties: {
      angle: 90,
      minAngle: 15,
      maxAngle: 165,
      torque: '1.8 kg-cm',
    },
    metadata: {
      category: 'actuator',
      sku: 'ACT-SG90-H',
      description: 'Micro SG90 9g servo motor to actuate the horizontal/elevation tilt axis.',
      weightGrams: 9,
      dimensions: '22.2mm x 11.8mm x 31.8mm',
    },
    simulation: {
      type: 'rotary_actuator',
      rules: ['respond_to_pwm', 'apply_mechanical_torque'],
      state: { temperatureCelsius: 30 },
    },
    ai: {
      guidance: 'Attach this servo horizontally to the vertical axis bracket to pivot the solar panel frame upwards/downwards.',
      troubleshooting: 'Keep tilt angles within safe physical structural boundaries (15° to 165°) to avoid mount collisions.',
      maintenanceCycleDays: 90,
      lastServiceDate: '2026-04-22',
    },
  },
  solar_panel: {
    name: 'PV Solar Panel Model',
    type: 'solar_panel',
    ports: [
      { id: 'POS', name: 'Positive Terminal', type: 'power' },
      { id: 'NEG', name: 'Negative Terminal', type: 'ground' },
    ],
    properties: {
      voltageOutput: 0.0,
      currentOutput: 0.0,
      efficiencyPct: 18.5,
      currentPowerMw: 0.0,
    },
    metadata: {
      category: 'structural',
      sku: 'SOL-PV-5V',
      description: 'High-efficiency 5V photovoltaic solar micro-panel mock for tracking demonstration.',
      weightGrams: 42,
      dimensions: '110mm x 69mm x 3mm',
    },
    simulation: {
      type: 'power_generator',
      rules: ['calculate_solar_irradiance', 'generate_voltage_current'],
      state: { solarIntensityW_m2: 0 },
    },
    ai: {
      guidance: 'Secure the micro photovoltaic panel onto the solar tracking bracket. Route the power terminals back to the analog tracking analyzer.',
      troubleshooting: 'Low efficiency is typically caused by shadowing or misalignment with the simulated Sun. Align vectors for peak power.',
      maintenanceCycleDays: 120,
      lastServiceDate: '2026-05-01',
    },
  },
  ldr_tl: {
    name: 'Top-Left LDR Sensor',
    type: 'ldr',
    ports: [
      { id: 'VCC', name: 'Pin A', type: 'power', expectedConnectedTo: 'arduino' },
      { id: 'SIG', name: 'Pin B (Analog Read)', type: 'analog', expectedConnectedTo: 'arduino' },
    ],
    properties: {
      reading: 512,
      resistanceOhms: 10000,
    },
    metadata: {
      category: 'sensor',
      sku: 'SEN-LDR-TL',
      description: 'Light-dependent resistor installed in the Top-Left corner slot of the solar panel.',
      weightGrams: 1.5,
      dimensions: '5mm diameter',
    },
    simulation: {
      type: 'light_sensor',
      rules: ['read_sun_vector_intensity', 'convert_intensity_to_resistance'],
      state: {},
    },
    ai: {
      guidance: 'Solder/mount the Top-Left photoresistor into the quadrant sensor frame. Run jumpers to row e5 of the breadboard.',
      troubleshooting: 'Photoresistor values saturate easily under extreme glare. Debounce values inside your Arduino sketch loops.',
      maintenanceCycleDays: 365,
      lastServiceDate: '2026-05-10',
    },
  },
  ldr_tr: {
    name: 'Top-Right LDR Sensor',
    type: 'ldr',
    ports: [
      { id: 'VCC', name: 'Pin A', type: 'power', expectedConnectedTo: 'arduino' },
      { id: 'SIG', name: 'Pin B (Analog Read)', type: 'analog', expectedConnectedTo: 'arduino' },
    ],
    properties: {
      reading: 512,
      resistanceOhms: 10000,
    },
    metadata: {
      category: 'sensor',
      sku: 'SEN-LDR-TR',
      description: 'Light-dependent resistor installed in the Top-Right corner slot of the solar panel.',
      weightGrams: 1.5,
      dimensions: '5mm diameter',
    },
    simulation: {
      type: 'light_sensor',
      rules: ['read_sun_vector_intensity', 'convert_intensity_to_resistance'],
      state: {},
    },
    ai: {
      guidance: 'Solder/mount the Top-Right photoresistor into the quadrant sensor frame. Run jumpers to row e10 of the breadboard.',
      troubleshooting: 'Photoresistor values saturate easily under extreme glare. Debounce values inside your Arduino sketch loops.',
      maintenanceCycleDays: 365,
      lastServiceDate: '2026-05-10',
    },
  },
  ldr_bl: {
    name: 'Bottom-Left LDR Sensor',
    type: 'ldr',
    ports: [
      { id: 'VCC', name: 'Pin A', type: 'power', expectedConnectedTo: 'arduino' },
      { id: 'SIG', name: 'Pin B (Analog Read)', type: 'analog', expectedConnectedTo: 'arduino' },
    ],
    properties: {
      reading: 512,
      resistanceOhms: 10000,
    },
    metadata: {
      category: 'sensor',
      sku: 'SEN-LDR-BL',
      description: 'Light-dependent resistor installed in the Bottom-Left corner slot of the solar panel.',
      weightGrams: 1.5,
      dimensions: '5mm diameter',
    },
    simulation: {
      type: 'light_sensor',
      rules: ['read_sun_vector_intensity', 'convert_intensity_to_resistance'],
      state: {},
    },
    ai: {
      guidance: 'Solder/mount the Bottom-Left photoresistor into the quadrant sensor frame. Run jumpers to row e15 of the breadboard.',
      troubleshooting: 'Photoresistor values saturate easily under extreme glare. Debounce values inside your Arduino sketch loops.',
      maintenanceCycleDays: 365,
      lastServiceDate: '2026-05-10',
    },
  },
  ldr_br: {
    name: 'Bottom-Right LDR Sensor',
    type: 'ldr',
    ports: [
      { id: 'VCC', name: 'Pin A', type: 'power', expectedConnectedTo: 'arduino' },
      { id: 'SIG', name: 'Pin B (Analog Read)', type: 'analog', expectedConnectedTo: 'arduino' },
    ],
    properties: {
      reading: 512,
      resistanceOhms: 10000,
    },
    metadata: {
      category: 'sensor',
      sku: 'SEN-LDR-BR',
      description: 'Light-dependent resistor installed in the Bottom-Right corner slot of the solar panel.',
      weightGrams: 1.5,
      dimensions: '5mm diameter',
    },
    simulation: {
      type: 'light_sensor',
      rules: ['read_sun_vector_intensity', 'convert_intensity_to_resistance'],
      state: {},
    },
    ai: {
      guidance: 'Solder/mount the Bottom-Right photoresistor into the quadrant sensor frame. Run jumpers to row e20 of the breadboard.',
      troubleshooting: 'Photoresistor values saturate easily under extreme glare. Debounce values inside your Arduino sketch loops.',
      maintenanceCycleDays: 365,
      lastServiceDate: '2026-05-10',
    },
  },
  resistor_10k: {
    name: '10K Ohm Resistor',
    type: 'resistor',
    ports: [
      { id: 'P1', name: 'Lead 1', type: 'signal' },
      { id: 'P2', name: 'Lead 2', type: 'ground' },
    ],
    properties: {
      resistance: '10kΩ',
      tolerance: '±1%',
      powerRating: '0.25W',
    },
    metadata: {
      category: 'passive',
      sku: 'RES-10K-CF',
      description: '1/4 Watt Metal Film current pull-down resistors for LDR voltage dividers.',
      weightGrams: 0.1,
      dimensions: '60mm length (with leads)',
    },
    simulation: {
      type: 'current_limiter',
      rules: ['apply_ohms_law', 'voltage_divide'],
      state: {},
    },
    ai: {
      guidance: 'Install four 10k resistors connecting each LDR signal line row on the breadboard directly back to the Ground rail.',
      troubleshooting: 'If resistors are missing, photoresistors will float and output static 5V signal feeds.',
      maintenanceCycleDays: 999,
      lastServiceDate: '2026-01-01',
    },
  },
  solar_mount: {
    name: '3D Solar Mounting Bracket',
    type: 'solar_mount',
    ports: [],
    properties: {
      material: 'PETG / Aluminum',
      structuralStrength: 'High',
    },
    metadata: {
      category: 'structural',
      sku: 'STR-SL-MNT',
      description: 'Dual-axis gimbal frame holding the solar micro-panel and connecting horizontal servo to vertical axis.',
      weightGrams: 75,
      dimensions: '120mm x 95mm x 45mm',
    },
    simulation: {
      type: 'passive_structural',
      rules: ['transfer_rotation', 'anchor_components'],
      state: {},
    },
    ai: {
      guidance: 'Snap this bracket onto the elevation servo bracket arm. This holds the final solar tracker payload.',
      troubleshooting: 'Verify standard mechanical alignment before tightening. Binding leads to servo wear and tracking lock.',
      maintenanceCycleDays: 180,
      lastServiceDate: '2026-05-15',
    },
  },
  
  // Future Extensible Industrial Plugins (Demonstrating Phase 19 Plugin System!)
  plc_controller: {
    name: 'Industrial PLC Panel',
    type: 'plc',
    ports: [
      { id: 'L1', name: 'Line 1 24VDC', type: 'power' },
      { id: 'M', name: 'Line Neutral', type: 'ground' },
      { id: 'I0', name: 'DI Sensor 1', type: 'signal' },
      { id: 'Q0', name: 'DO Solenoid Valve', type: 'pwm' },
    ],
    properties: {
      protocol: 'Modbus TCP',
      cycleTime: '2ms',
      status: 'Standby / Pre-commissioning',
    },
    metadata: {
      category: 'controller',
      sku: 'IND-PLC-S7',
      description: 'Extensible Industrial Automation PLC. Part of our Industry 4.0 expansion.',
      weightGrams: 350,
      dimensions: '120mm x 80mm x 70mm',
    },
    simulation: {
      type: 'plc_simulation_rules',
      rules: ['ladder_logic_execution', 'io_scanning'],
      state: { running: false, activeAlarms: [] },
    },
    ai: {
      guidance: 'This is an upcoming industrial module. It will be configurable using our plugin system.',
      troubleshooting: 'Check Ethernet connection and IP configurations.',
      maintenanceCycleDays: 365,
      lastServiceDate: '2026-06-01',
    },
  },
  robot_arm: {
    name: '6-DOF Robotic Manipulator',
    type: 'robot_arm',
    ports: [
      { id: 'PWR', name: 'Power 48VDC', type: 'power' },
      { id: 'ETH', name: 'EtherCAT Communication', type: 'signal' },
    ],
    properties: {
      payloadLimit: '3.0 kg',
      reachRadius: '650mm',
      status: 'Future Plugin Expansion',
    },
    metadata: {
      category: 'actuator',
      sku: 'ACT-ROB-6DOF',
      description: 'Precision robotic arm for parts assembly and palletizing. Future plugin expansion.',
      weightGrams: 4200,
      dimensions: '500mm height',
    },
    simulation: {
      type: 'inverse_kinematics',
      rules: ['execute_joint_vectors', 'calculate_tcp_position'],
      state: {},
    },
    ai: {
      guidance: 'Future Industry 4.0 module. Connect the EtherCAT cable to your system switch.',
      troubleshooting: 'If axis joint exceeds threshold, prompt safe mechanical calibration reset.',
      maintenanceCycleDays: 90,
      lastServiceDate: '2026-06-01',
    },
  }
};

// Returns initial assembly components for our Solar Tracker demo
export const getInitialSolarTrackerProject = (assembledCount: number = 11): TwinProject => {
  const components: TwinComponent[] = [];

  // We always place the first component (breadboard)
  components.push({
    id: 'c-bb',
    name: COMPONENT_REGISTRY.breadboard.name,
    type: COMPONENT_REGISTRY.breadboard.type,
    status: 'placed',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    children: [],
    ports: [...COMPONENT_REGISTRY.breadboard.ports],
    properties: { ...COMPONENT_REGISTRY.breadboard.properties },
    metadata: { ...COMPONENT_REGISTRY.breadboard.metadata },
    simulation: { ...COMPONENT_REGISTRY.breadboard.simulation },
    ai: { ...COMPONENT_REGISTRY.breadboard.ai },
  });

  // Then add subsequent components based on assembledCount (starting from step index 1 to assembledCount - 1)
  for (let i = 1; i < assembledCount; i++) {
    const step = ASSEMBLY_SEQUENCE_STEPS[i];
    if (!step) continue;
    const itemRegistry = COMPONENT_REGISTRY[step.componentKey];
    if (!itemRegistry) continue;

    components.push({
      id: `c-${step.componentKey}`,
      name: itemRegistry.name,
      type: itemRegistry.type,
      status: 'placed',
      position: step.targetPosition,
      rotation: [0, 0, 0],
      children: [],
      ports: [...itemRegistry.ports],
      properties: { ...itemRegistry.properties },
      metadata: { ...itemRegistry.metadata },
      simulation: { ...itemRegistry.simulation },
      ai: { ...itemRegistry.ai },
    });
  }

  return {
    id: 'solar-tracker-tw',
    name: 'Dual-Axis Solar Tracker Digital Twin',
    description: 'Virtual-physical twin of an automated solar tracker with active azimuth/elevation servos and quadrant LDR feedback.',
    components,
    wires: [],
  };
};

export const ASSEMBLY_SEQUENCE_STEPS = [
  {
    step: 1,
    componentKey: 'breadboard',
    title: 'Mount the Solderless Breadboard',
    description: 'Place the central solderless breadboard. This acts as the physical and electrical node for distribution.',
    targetPosition: [0, 0, 0] as [number, number, number],
  },
  {
    step: 2,
    componentKey: 'arduino',
    title: 'Install Arduino Uno R3 MCU',
    description: 'Position the Arduino Uno microcontroller next to the breadboard. Connect its primary logic processing center.',
    targetPosition: [-3, 0, 0] as [number, number, number],
  },
  {
    step: 3,
    componentKey: 'servo_vert',
    title: 'Anchor Azimuth Tracking Servo',
    description: 'Connect the SG90 azimuth servo to the base mount plate. This handles the vertical rotation axis (horizontal tracking).',
    targetPosition: [0, 0.5, 3] as [number, number, number],
  },
  {
    step: 4,
    componentKey: 'servo_horiz',
    title: 'Attach Elevation Servo Axis',
    description: 'Mount the tilt elevation SG90 servo horizontally onto the vertical rotation bracket. This enables the tracking unit to rotate upwards and downwards.',
    targetPosition: [0, 1.2, 3] as [number, number, number],
  },
  {
    step: 5,
    componentKey: 'solar_mount',
    title: 'Assemble Solar Panel Bracket Frame',
    description: 'Snap the central custom bracket holding the photodiode quadrants onto the elevation servo head.',
    targetPosition: [0, 1.8, 3] as [number, number, number],
  },
  {
    step: 6,
    componentKey: 'solar_panel',
    title: 'Secure PV Solar Micro-Panel',
    description: 'Place the solar panel onto the central mounting plate. Connect positive and negative outputs to monitor voltage generation.',
    targetPosition: [0, 2.0, 3] as [number, number, number],
  },
  {
    step: 7,
    componentKey: 'ldr_tl',
    title: 'Install Top-Left Photoresistor (LDR)',
    description: 'Place the top-left light-dependent resistor quadrant sensor to register incident sunlight angles.',
    targetPosition: [-0.6, 2.2, 2.4] as [number, number, number],
  },
  {
    step: 8,
    componentKey: 'ldr_tr',
    title: 'Install Top-Right Photoresistor (LDR)',
    description: 'Secure the top-right photoresistor onto the quadrant sensor shield.',
    targetPosition: [0.6, 2.2, 2.4] as [number, number, number],
  },
  {
    step: 9,
    componentKey: 'ldr_bl',
    title: 'Install Bottom-Left Photoresistor (LDR)',
    description: 'Install the bottom-left photoresistor quadrant sensor.',
    targetPosition: [-0.6, 1.8, 3.6] as [number, number, number],
  },
  {
    step: 10,
    componentKey: 'ldr_br',
    title: 'Install Bottom-Right Photoresistor (LDR)',
    description: 'Secure the bottom-right photoresistor quadrant sensor.',
    targetPosition: [0.6, 1.8, 3.6] as [number, number, number],
  },
  {
    step: 11,
    componentKey: 'resistor_10k',
    title: 'Wire Divider Resistors',
    description: 'Connect the four 10K resistors in series with the photoresistor leads to ground, forming precise voltage dividers.',
    targetPosition: [0, 0.1, -1] as [number, number, number],
  },
];
