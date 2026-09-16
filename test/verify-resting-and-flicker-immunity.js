// Verification Test Suite: Resting Hand Posture Immunity & Anti-Flicker Protection
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

assert(CarnaticFluteTracker, 'CarnaticFluteTracker loaded successfully.');
console.log('✅ PASS: CarnaticFluteTracker loaded successfully.');

const tracker = new CarnaticFluteTracker();
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
tracker.canvasElement = mockCanvas;
tracker.canvasCtx = mockCtx;

// Helper to create mock hand landmarks
function createMockHand(screenX, screenY, isLeft = true, fingerSpanScale = 1.0) {
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 1.0 - screenX, y: screenY, z: 0.0 });
  }
  const dir = isLeft ? 1 : -1;
  lm[5]  = { x: 1.0 - (screenX + 0.04 * dir), y: screenY, z: 0.0 };
  lm[9]  = { x: 1.0 - screenX, y: screenY, z: 0.0 };
  lm[13] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY, z: 0.0 };
  lm[17] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY, z: 0.0 };

  // Fingertips (extension)
  lm[8]  = { x: 1.0 - (screenX + 0.04 * dir), y: screenY - 0.07 * fingerSpanScale, z: 0.0 };
  lm[12] = { x: 1.0 - screenX, y: screenY - 0.07 * fingerSpanScale, z: 0.0 };
  lm[16] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY - 0.07 * fingerSpanScale, z: 0.0 };
  lm[20] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY - 0.07 * fingerSpanScale, z: 0.0 };
  return lm;
}

// -----------------------------------------------------------------------------
// Test 1: Hands in resting position below cutoff (Y = 0.78 on desk/lap)
// -----------------------------------------------------------------------------
console.log('\n--- 1. Testing Hands in Rest Positions (Desk / Lap Y >= 0.74) ---');

const restingLeft = createMockHand(0.40, 0.78, true);
const restingRight = createMockHand(0.60, 0.78, false);

tracker.onResults({
  multiHandLandmarks: [restingLeft, restingRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});

assert.strictEqual(tracker.inPlayingPosition, false, 'Hands resting on desk at Y=0.78 must be recognized as NOT in playing position');
console.log('✅ PASS: Hands at resting elevation (Y=0.78) produce NO playing posture and NO notes.');

// -----------------------------------------------------------------------------
// Test 2: Solo Left hand resting on armrest/table (Y = 0.70) while Right hand is down
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Solo Left Hand Resting on Armrest/Table (Y >= 0.68) ---');

const restingSoloLeft = createMockHand(0.40, 0.70, true);
tracker.onResults({
  multiHandLandmarks: [restingSoloLeft],
  multiHandedness: [{ label: 'Right' }]
});

assert.strictEqual(tracker.inPlayingPosition, false, 'Solo left hand resting low at Y=0.70 must NOT play');
console.log('✅ PASS: Solo left hand resting low does not trigger playing position.');

// -----------------------------------------------------------------------------
// Test 3: Clasped / overlapping resting hands
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Clasped / Overlapping Hands at Rest ---');

const claspedLeft = createMockHand(0.50, 0.60, true);
const claspedRight = createMockHand(0.52, 0.60, false); // Span only 0.02

tracker.onResults({
  multiHandLandmarks: [claspedLeft, claspedRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});

assert.strictEqual(tracker.inPlayingPosition, false, 'Clasped hands touching at rest must NOT trigger playing position');
console.log('✅ PASS: Clasped resting hands are cleanly rejected.');

// -----------------------------------------------------------------------------
// Test 4: Relaxed Resting Finger Curl Immunity (No Sa / Ri Flickering)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Testing Relaxed Resting Finger Curl Immunity (No Sa / Ri Flickering) ---');

// In a relaxed resting hand, index & middle fingers naturally curve slightly (raw score 0.41 - 0.46)
tracker.currentHoleStates[0] = false; // L1 open
tracker.currentHoleStates[1] = false; // L2 open
tracker.fingerCurlScores[0] = 0.0;
tracker.fingerCurlScores[1] = 0.0;

function createRelaxedFingerLandmarks(score) {
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 0.5, y: 0.5, z: 0.0 });
  }
  // MCP at (0.5, 0.5)
  const span = (0.82 - score * 0.22) * 0.09;
  lm[5] = { x: 0.5, y: 0.5, z: 0.0 };
  lm[6] = { x: 0.5, y: 0.46, z: 0.0 };
  lm[7] = { x: 0.5, y: 0.43, z: 0.0 };
  lm[8] = { x: 0.5, y: 0.5 - span, z: 0.0 };
  return lm;
}

// Simulate 50 frames of relaxed resting hand noise (curl scores fluctuating between 0.41 and 0.46)
let l1FalseClosures = 0;
let l2FalseClosures = 0;

for (let frame = 0; frame < 50; frame++) {
  const relaxedScore = 0.43 + Math.sin(frame * 0.3) * 0.03; // 0.40 to 0.46
  const relaxedLm = createRelaxedFingerLandmarks(relaxedScore);
  const l1Closed = tracker.isHoleClosed(relaxedLm, 5, 6, 7, 8, 0);
  const l2Closed = tracker.isHoleClosed(relaxedLm, 5, 6, 7, 8, 1);
  if (l1Closed) l1FalseClosures++;
  if (l2Closed) l2FalseClosures++;
}

assert.strictEqual(l1FalseClosures, 0, 'Relaxed resting index finger must NEVER close L1 (zero Ri false detection)');
assert.strictEqual(l2FalseClosures, 0, 'Relaxed resting middle finger must NEVER close L2 (zero Sa false detection)');
console.log('✅ PASS: 50 frames of resting hand finger noise produce ZERO false hole closures and ZERO Sa/Ri flickers.');

// -----------------------------------------------------------------------------
// Test 5: Intentional Flute Playing Still Responds on Frame 1
// -----------------------------------------------------------------------------
console.log('\n--- 5. Testing Intentional Flute Playing (Responds on Frame 1) ---');

const activePlayingLeft = createMockHand(0.40, 0.55, true);
const activePlayingRight = createMockHand(0.62, 0.56, false); // Span 0.22, Y at Mid line

tracker.onResults({
  multiHandLandmarks: [activePlayingLeft, activePlayingRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});

assert.strictEqual(tracker.inPlayingPosition, true, 'Raised hands with valid span MUST enter playing position');
console.log('✅ PASS: Raised playing hands cleanly enter playing position.');

// Intentional deep curl (score 0.65) closes hole on Frame 1
const intentionalCurlLm = createRelaxedFingerLandmarks(0.65);
const intentionalClose = tracker.isHoleClosed(intentionalCurlLm, 5, 6, 7, 8, 0);
assert.strictEqual(intentionalClose, true, 'Intentional finger closure must engage hole on Frame 1');
console.log('✅ PASS: Intentional finger hit closes hole on Frame 1.');

// Intentional finger lift (score 0.20) vents hole on Frame 1
const intentionalLiftLm = createRelaxedFingerLandmarks(0.20);
const intentionalVent = tracker.isHoleClosed(intentionalLiftLm, 5, 6, 7, 8, 0);
assert.strictEqual(intentionalVent, false, 'Intentional finger lift must vent hole on Frame 1');
console.log('✅ PASS: Intentional finger lift vents hole on Frame 1.');

console.log('\n🌟 ALL RESTING POSTURE IMMUNITY & ANTI-FLICKER TESTS PASSED 100%!\n');
