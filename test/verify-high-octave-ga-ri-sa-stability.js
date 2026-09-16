// Verification Test Suite: High Octave Ga-Ri-Sa Stability & Anti-Flicker Immunity
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// 1. Load SwarasData and Carnatic Flute Tracker
const dummyWindow = {};
const swarasCode = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf8');
eval(`(function(window) { ${swarasCode} })(dummyWindow)`);
global.window = dummyWindow;

const trackerCode = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf8');
eval(`(function(window) { ${trackerCode} })(dummyWindow)`);
const CarnaticFluteTracker = dummyWindow.CarnaticFluteTracker;

assert(CarnaticFluteTracker, 'CarnaticFluteTracker class must be exported on window');
console.log('✅ PASS: CarnaticFluteTracker loaded successfully.');

// Mock canvas and 2D context
const mockCanvas = { width: 640, height: 480 };
const mockCtx = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  arc: () => {},
  fill: () => {},
  fillText: () => {},
  setLineDash: () => {},
  measureText: () => ({ width: 60 }),
  clearRect: () => {},
  rect: () => {}
};

function createMockHand(screenX, screenY, isLeft = true, fingerSpanScale = 1.0, zDamp = 0.0) {
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 1.0 - screenX, y: screenY, z: zDamp });
  }
  const dir = isLeft ? 1 : -1;
  lm[5]  = { x: 1.0 - (screenX + 0.04 * dir), y: screenY, z: zDamp };
  lm[9]  = { x: 1.0 - screenX, y: screenY, z: zDamp };
  lm[13] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY, z: zDamp };
  lm[17] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY, z: zDamp };

  // Knuckles and fingertips
  lm[6]  = { x: 1.0 - (screenX + 0.04 * dir), y: screenY - 0.03, z: zDamp };
  lm[7]  = { x: 1.0 - (screenX + 0.04 * dir), y: screenY - 0.05, z: zDamp };
  lm[8]  = { x: 1.0 - (screenX + 0.04 * dir), y: screenY - 0.07 * fingerSpanScale, z: zDamp };

  lm[10] = { x: 1.0 - screenX, y: screenY - 0.03, z: zDamp };
  lm[11] = { x: 1.0 - screenX, y: screenY - 0.05, z: zDamp };
  lm[12] = { x: 1.0 - screenX, y: screenY - 0.07 * fingerSpanScale, z: zDamp };

  lm[14] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY - 0.03, z: zDamp };
  lm[15] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY - 0.05, z: zDamp };
  lm[16] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY - 0.07 * fingerSpanScale, z: zDamp };

  lm[18] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY - 0.03, z: zDamp };
  lm[19] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY - 0.05, z: zDamp };
  lm[20] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY - 0.07 * fingerSpanScale, z: zDamp };
  return lm;
}

// -----------------------------------------------------------------------------
// Test 1: High Octave Elevation with Split Hands (Left Hand High, Right Hand Lower)
// -----------------------------------------------------------------------------
console.log('\n--- 1. Testing High Octave Elevation with Lower Resting Right Hand ---');
const tracker1 = new CarnaticFluteTracker();
tracker1.canvasElement = mockCanvas;
tracker1.canvasCtx = mockCtx;
tracker1.awaitingInitialSa = false;
tracker1.sessionUnlocked = true;
tracker1.currentOctave = 1; // Playing in High Octave

let octaveFlips = 0;
tracker1.onOctaveChanged = (oct) => {
  if (oct !== 1) octaveFlips++;
};

// Simulate 50 frames where Left Hand is at High level (Y = 0.43) and Right Hand floats lower (Y = 0.55 - 0.57)
for (let f = 0; f < 50; f++) {
  const leftY = 0.43 + Math.sin(f * 0.2) * 0.015; // 0.415 - 0.445
  const rightY = 0.56 + Math.cos(f * 0.15) * 0.02; // 0.54 - 0.58
  const leftHand = createMockHand(0.42, leftY, true);
  const rightHand = createMockHand(0.62, rightY, false);

  tracker1.onResults({
    multiHandLandmarks: [leftHand, rightHand],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}

assert.strictEqual(tracker1.currentOctave, 1, 'Flute must remain locked in High Octave (1)');
assert.strictEqual(octaveFlips, 0, 'Must produce ZERO octave flips when Right Hand floats lower');
console.log('✅ PASS: High Octave remains rock-solid (0 flips) even when Right Hand floats 10cm lower.');

// -----------------------------------------------------------------------------
// Test 2: Stable High Octave Ga Immunity to Micro-Jitter (All Open)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Stable High Octave Ga (All Open) Zero-Flicker ---');
const tracker2 = new CarnaticFluteTracker();
tracker2.canvasElement = mockCanvas;
tracker2.canvasCtx = mockCtx;
tracker2.awaitingInitialSa = false;
tracker2.sessionUnlocked = true;
tracker2.currentOctave = 1;

let detectedGaNotes = [];
tracker2.onSwaraDetected = (res) => {
  if (res && res.swara) {
    detectedGaNotes.push(res.swara.id || res.swara.family);
  }
};

// 60 frames of holding Ga (fingers extended/open, with realistic sensor micro-jitter)
for (let f = 0; f < 60; f++) {
  const jitterY = Math.sin(f * 0.4) * 0.005;
  const jitterZ = Math.cos(f * 0.3) * 0.02;
  // Span scale 1.0 (fingers extended, open)
  const leftHand = createMockHand(0.42, 0.43 + jitterY, true, 1.0, jitterZ);
  const rightHand = createMockHand(0.62, 0.54 + jitterY, false, 1.0, jitterZ);

  tracker2.onResults({
    multiHandLandmarks: [leftHand, rightHand],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}

const nonGaCount = detectedGaNotes.filter(id => id !== 'ga' && id !== 'ga3').length;
assert.strictEqual(nonGaCount, 0, `All frames must be Ga, found ${nonGaCount} flickers to other swaras`);
assert(detectedGaNotes.length >= 50, 'Ga must be continuously detected across all frames');
console.log(`✅ PASS: 60 frames of stable Ga produced ZERO flickers to Ri or Sa (${detectedGaNotes.length} Ga frames).`);

// -----------------------------------------------------------------------------
// Test 3: Stable High Octave Ri Immunity to Micro-Jitter (L1 Closed, L2-L7 Open)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Stable High Octave Ri (L1 Closed) Zero-Flicker ---');
const tracker3 = new CarnaticFluteTracker();
tracker3.canvasElement = mockCanvas;
tracker3.canvasCtx = mockCtx;
tracker3.awaitingInitialSa = false;
tracker3.sessionUnlocked = true;
tracker3.currentOctave = 1;

let detectedRiNotes = [];
tracker3.onSwaraDetected = (res) => {
  if (res && res.swara) {
    detectedRiNotes.push(res.swara.id || res.swara.family);
  }
};

// Helper for Ri: L1 curled/closed (span 0.65), L2-L4 open (span 1.0)
function createRiHand(screenX, screenY, isLeft = true, jitterZ = 0) {
  const lm = createMockHand(screenX, screenY, isLeft, 1.0, jitterZ);
  // Curl L1 (index): tip closer to MCP
  lm[8] = { x: 1.0 - (screenX + 0.04), y: screenY - 0.038, z: jitterZ };
  return lm;
}

// 60 frames of holding Ri
for (let f = 0; f < 60; f++) {
  const jitterY = Math.sin(f * 0.4) * 0.005;
  const jitterZ = Math.cos(f * 0.3) * 0.02;
  const leftHand = createRiHand(0.42, 0.43 + jitterY, true, jitterZ);
  const rightHand = createMockHand(0.62, 0.54 + jitterY, false, 1.0, jitterZ);

  tracker3.onResults({
    multiHandLandmarks: [leftHand, rightHand],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}

const nonRiCount = detectedRiNotes.filter(id => id !== 'ri' && id !== 'ri2').length;
assert.strictEqual(nonRiCount, 0, `All frames must be Ri, found ${nonRiCount} flickers`);
assert(detectedRiNotes.length >= 50, 'Ri must be continuously detected across all frames');
console.log(`✅ PASS: 60 frames of stable Ri produced ZERO flickers to Ga or Sa (${detectedRiNotes.length} Ri frames).`);

// -----------------------------------------------------------------------------
// Test 4: Stable High Octave Sa Immunity to Micro-Jitter (L1 & L2 Closed)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Testing Stable High Octave Sa (L1 & L2 Closed) Zero-Flicker ---');
const tracker4 = new CarnaticFluteTracker();
tracker4.canvasElement = mockCanvas;
tracker4.canvasCtx = mockCtx;
tracker4.awaitingInitialSa = false;
tracker4.sessionUnlocked = true;
tracker4.currentOctave = 1;

let detectedSaNotes = [];
tracker4.onSwaraDetected = (res) => {
  if (res && res.swara) {
    detectedSaNotes.push(res.swara.id || res.swara.family);
  }
};

// Helper for Sa: L1 & L2 curled/closed (span 0.65), L3 open
function createSaHand(screenX, screenY, isLeft = true, jitterZ = 0) {
  const lm = createMockHand(screenX, screenY, isLeft, 1.0, jitterZ);
  // Curl L1 (index)
  lm[8] = { x: 1.0 - (screenX + 0.04), y: screenY - 0.038, z: jitterZ };
  // Curl L2 (middle)
  lm[12] = { x: 1.0 - screenX, y: screenY - 0.038, z: jitterZ };
  return lm;
}

// 60 frames of holding Sa
for (let f = 0; f < 60; f++) {
  const jitterY = Math.sin(f * 0.4) * 0.005;
  const jitterZ = Math.cos(f * 0.3) * 0.02;
  const leftHand = createSaHand(0.42, 0.43 + jitterY, true, jitterZ);
  const rightHand = createMockHand(0.62, 0.54 + jitterY, false, 1.0, jitterZ);

  tracker4.onResults({
    multiHandLandmarks: [leftHand, rightHand],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}

const nonSaCount = detectedSaNotes.filter(id => id !== 'sa').length;
assert.strictEqual(nonSaCount, 0, `All frames must be Sa, found ${nonSaCount} flickers`);
assert(detectedSaNotes.length >= 50, 'Sa must be continuously detected across all frames');
console.log(`✅ PASS: 60 frames of stable Sa produced ZERO flickers to Ri or Ga (${detectedSaNotes.length} Sa frames).`);

// -----------------------------------------------------------------------------
// Test 5: Rapid Transitioning Ga -> Ri -> Sa (0.2s = 6-8 frames each)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Testing Rapid Ga -> Ri -> Sa Transitions (0.2s notes) ---');
const tracker5 = new CarnaticFluteTracker();
tracker5.canvasElement = mockCanvas;
tracker5.canvasCtx = mockCtx;
tracker5.awaitingInitialSa = false;
tracker5.sessionUnlocked = true;
tracker5.currentOctave = 1;

let rapidSequence = [];
tracker5.onSwaraDetected = (res) => {
  if (res && res.swara) {
    rapidSequence.push(res.swara.id || res.swara.family);
  }
};

// 1. Play Ga for 8 frames
for (let f = 0; f < 8; f++) {
  const leftHand = createMockHand(0.42, 0.43, true, 1.0);
  const rightHand = createMockHand(0.62, 0.54, false, 1.0);
  tracker5.onResults({ multiHandLandmarks: [leftHand, rightHand], multiHandedness: [{ label: 'Right' }, { label: 'Left' }] });
}
// 2. Play Ri for 8 frames
for (let f = 0; f < 8; f++) {
  const leftHand = createRiHand(0.42, 0.43, true);
  const rightHand = createMockHand(0.62, 0.54, false, 1.0);
  tracker5.onResults({ multiHandLandmarks: [leftHand, rightHand], multiHandedness: [{ label: 'Right' }, { label: 'Left' }] });
}
// 3. Play Sa for 8 frames
for (let f = 0; f < 8; f++) {
  const leftHand = createSaHand(0.42, 0.43, true);
  const rightHand = createMockHand(0.62, 0.54, false, 1.0);
  tracker5.onResults({ multiHandLandmarks: [leftHand, rightHand], multiHandedness: [{ label: 'Right' }, { label: 'Left' }] });
}

// Check that each section detected its corresponding swara
const gaSlice = rapidSequence.slice(0, 8);
const riSlice = rapidSequence.slice(8, 16);
const saSlice = rapidSequence.slice(16, 24);

assert(gaSlice.filter(s => s === 'ga' || s === 'ga3').length >= 7, 'Ga must play during Ga section');
assert(riSlice.filter(s => s === 'ri' || s === 'ri2').length >= 6, 'Ri must play promptly during Ri section');
assert(saSlice.filter(s => s === 'sa').length >= 6, 'Sa must play promptly during Sa section');

console.log('✅ PASS: Rapid Ga -> Ri -> Sa (0.2s notes) transitions cleanly without lag or misdetections.');

console.log('\n🌟 ALL HIGH OCTAVE GA-RI-SA STABILITY TESTS PASSED 100%!\n');
