// Verification Test Suite: 90° Profile View, Inclined Dynamic Flute, Line-Free Octave Tracking
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
console.log('✅ PASS: CarnaticFluteTracker successfully loaded and instantiated.');

// 2. Test Dynamic Flute Inclination & Center Geometry
console.log('\n--- 2. Testing Dynamic Flute Inclination & Hand-Anchoring Geometry ---');

const tracker = new CarnaticFluteTracker();

function createMockHand(screenX, screenY, isLeft = true) {
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 1.0 - screenX, y: screenY, z: 0.0 });
  }
  // For Left hand facing player: Index is to the right (+X) of pinky (-X)
  // For Right hand facing player: Index is to the left (-X) of pinky (+X)
  const dir = isLeft ? 1 : -1;
  lm[5] = { x: 1.0 - (screenX + 0.04 * dir), y: screenY, z: 0.0 };
  lm[9] = { x: 1.0 - screenX, y: screenY, z: 0.0 };
  lm[13] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY, z: 0.0 };
  lm[17] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY, z: 0.0 };

  // Setup fingertips
  lm[8]  = { x: 1.0 - (screenX + 0.04 * dir), y: screenY - 0.05, z: 0.0 }; // index
  lm[12] = { x: 1.0 - screenX, y: screenY - 0.05, z: 0.0 };                 // middle
  lm[16] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY - 0.05, z: 0.0 }; // ring
  lm[20] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY - 0.05, z: 0.0 }; // pinky
  return lm;
}

// Test Case B: Inclined hands at ~20 degrees (Left hand higher Y=0.48, Right hand lower Y=0.58)
const mockLeft = createMockHand(0.35, 0.48, true);
const mockRight = createMockHand(0.65, 0.58, false);

// Mock canvas & context
const mockCanvas = { width: 640, height: 480, getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 480 }) };
const mockCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  roundRect: () => {},
  fill: () => {},
  stroke: () => {},
  arc: () => {},
  ellipse: () => {},
  fillRect: () => {},
  fillText: () => {},
  measureText: (txt) => ({ width: txt.length * 8 }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  clearRect: () => {}
};

tracker.canvasElement = mockCanvas;
tracker.canvasCtx = mockCtx;

// Process frame with inclined hands
tracker.onResults({
  multiHandLandmarks: [mockLeft, mockRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }] // Mirrored: 'Right' = Left hand
});

assert(tracker.dynamicFlute.active, 'Dynamic flute must be active when hands are in playing posture');
assert(tracker.dynamicFlute.smoothedSpan > 0.20, 'Span between hands must be positive and non-zero');
assert(tracker.dynamicHolePositions && tracker.dynamicHolePositions.length === 7, 'Must have 7 dynamic hole positions');

// Verify holes are strictly monotonic along the inclined flute axis
for (let i = 0; i < 6; i++) {
  assert(
    tracker.dynamicHolePositions[i + 1].s > tracker.dynamicHolePositions[i].s,
    `Hole ${i+1} must be spaced after Hole ${i} along the flute axis`
  );
}
console.log('✅ PASS: Dynamic inclined flute accurately computes geometry and preserves monotonic hole spacing.');

// 3. Test Line-Free Relative Octave Shift from Hand Elevation
console.log('\n--- 3. Testing Line-Free Relative Hand Elevation Octave Switching ---');

// Calibrate baseline at Y = 0.52
tracker.updateOctaveFromHandsY(0.52);
assert.strictEqual(tracker.currentOctave, 0, 'Initial posture must start in Madhya (0)');

// Small flutter (0.50 -> 0.54) must not switch octave
tracker.updateOctaveFromHandsY(0.50);
tracker.updateOctaveFromHandsY(0.54);
assert.strictEqual(tracker.currentOctave, 0, 'Gentle hand movement within tolerance must stay in Madhya (0)');

// Lift hands up by 10% (Y = 0.41 relative to baseline 0.52 -> relY = -0.11)
tracker.updateOctaveFromHandsY(0.41);
tracker.updateOctaveFromHandsY(0.41);
assert.strictEqual(tracker.currentOctave, 1, 'Lifting hands up cleanly triggers Tara (+1 High Octave)');
console.log('✅ PASS: Moving hands up triggers Tara (+1) without any fixed screen lines.');

// Lower hands down by 10% (Y = 0.63 relative to baseline 0.52 -> relY = +0.11)
tracker.updateOctaveFromHandsY(0.63);
tracker.updateOctaveFromHandsY(0.63);
tracker.updateOctaveFromHandsY(0.63);
assert.strictEqual(tracker.currentOctave, -1, 'Lowering hands down cleanly triggers Mandra (-1 Bass Octave)');
console.log('✅ PASS: Moving hands down triggers Mandra (-1) without any fixed screen lines.');

// Return hands to natural baseline (Y = 0.52)
tracker.updateOctaveFromHandsY(0.52);
tracker.updateOctaveFromHandsY(0.52);
assert.strictEqual(tracker.currentOctave, 0, 'Returning hands to natural height restores Madhya (0)');
console.log('✅ PASS: Returning to baseline height seamlessly restores Madhya (0).');

// 4. Test Single-Hand Playing Mode with Dynamic Flute
console.log('\n--- 4. Testing Single-Hand Playing Mode with Dynamic Flute ---');

// Process frame with Left Hand only
tracker.onResults({
  multiHandLandmarks: [mockLeft],
  multiHandedness: [{ label: 'Right' }]
});

assert(tracker.inPlayingPosition, 'Left hand alone must be recognized as active playing position');
assert(tracker.dynamicFlute.active, 'Dynamic flute must still track single hand');
console.log('✅ PASS: Left hand only plays cleanly with dynamic inclined flute.');

// Process frame with Right Hand only (Carnatic Rule: upper holes vented, no note plays)
tracker.onResults({
  multiHandLandmarks: [mockRight],
  multiHandedness: [{ label: 'Left' }]
});

assert.strictEqual(tracker.inPlayingPosition, false, 'Right hand alone must NOT play (vents air column at top)');
console.log('✅ PASS: Right hand alone correctly silences flute.');

console.log('\n🌟 ALL DYNAMIC INCLINED FLUTE TESTS PASSED 100%!');
