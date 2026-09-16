// Verification Test Suite: Natural Ergonomic Flute Player Tilt (~12°), Clean Tone Hole Dots
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

const tracker = new CarnaticFluteTracker();

// 2. Test Ergonomic Flute Player Tilt Geometry (~12°)
console.log('\n--- 1. Testing Ergonomic Flute Tilt (~12°) Geometry ---');
assert.strictEqual(tracker.lineAngleDeg, 12, 'Tracker lineAngleDeg must be 12°');
assert.strictEqual(tracker.fluteAngleDeg, 12, 'Tracker fluteAngleDeg must be 12°');

const angleRad = tracker.getEffectiveAngleRad();
const expectedRad = (12 * Math.PI) / 180;
assert(Math.abs(angleRad - expectedRad) < 1e-6, `Angle in radians must match 12° (${expectedRad})`);

const ux = Math.abs(Math.cos(angleRad));
const uy = Math.abs(Math.sin(angleRad));
console.log(`Unit vector: ux = ${ux.toFixed(4)}, uy = ${uy.toFixed(4)}`);
assert(Math.abs(ux - Math.cos(expectedRad)) < 1e-4, 'ux must match cos(12°) ≈ 0.9781');
assert(Math.abs(uy - Math.sin(expectedRad)) < 1e-4, 'uy must match sin(12°) ≈ 0.2079');
console.log('✅ PASS: Natural ergonomic flute tilt vectors are accurate.');

// 3. Test Tone Hole Positioning on Gently Tilted Line
console.log('\n--- 2. Testing Tone Hole Positioning along Gently Tilted Line ---');
const width = 1280;
const height = 720;

// Test for Madhya (octave 0, Y = 0.55)
tracker.currentOctave = 0;
const holes = [];
for (let i = 0; i < 7; i++) {
  const pos = tracker.getHolePos(i, width, height);
  holes.push(pos);
}

// Verify 7 holes exist
assert.strictEqual(holes.length, 7, 'Must have 7 tone hole positions');

// Verify tone holes are aligned along realistic 12° slope:
// (y - y0) / (x - x0) should equal tan(12°) ≈ 0.21255 in screen coordinates
const expectedSlope = Math.tan(expectedRad);
for (let i = 0; i < 6; i++) {
  const dx = holes[i + 1].x - holes[i].x;
  const dy = holes[i + 1].y - holes[i].y;
  assert(dx > 0, `Holes must progress left to right: dx = ${dx}`);
  assert(dy > 0, `Holes must gently drop from left to right: dy = ${dy}`);
  const pixelSlope = dy / dx;
  assert(Math.abs(pixelSlope - expectedSlope) < 1e-4, `Hole step ratio in pixels must match slope tan(12°) ≈ ${expectedSlope}. Got: ${pixelSlope}`);
}
console.log('✅ PASS: All 7 tone holes lie strictly on the ergonomic 12° tilted line.');

// 4. Test Octaves Lines
console.log('\n--- 3. Testing Octave Line Levels & Switching ---');
assert(tracker.OCTAVE_LINES.HIGH === 0.44, 'Tara (High) line must be at Y=0.44');
assert(tracker.OCTAVE_LINES.MID === 0.55, 'Madhya (Mid) line must be at Y=0.55');
assert(tracker.OCTAVE_LINES.BASS === 0.67, 'Mandra (Bass) line must be at Y=0.67');

// Test hand elevation octave zones
tracker.updateOctaveFromHandsY(0.40);
assert.strictEqual(tracker.currentOctave, 1, 'Hands at Y=0.40 must activate Tara (+1)');

tracker.updateOctaveFromHandsY(0.55);
assert.strictEqual(tracker.currentOctave, 0, 'Hands at Y=0.55 must activate Madhya (0)');

tracker.updateOctaveFromHandsY(0.70);
assert.strictEqual(tracker.currentOctave, -1, 'Hands at Y=0.70 must activate Mandra (-1)');
console.log('✅ PASS: Hand elevation octave zones correctly switch between Tara, Madhya, and Mandra.');

// 5. Test Clean Render (No cartoon body, proper canvas calls)
console.log('\n--- 4. Testing Clean Render Architecture ---');
let lineCount = 0;
let arcCount = 0;
const mockCtx = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => { lineCount++; },
  lineTo: () => {},
  stroke: () => {},
  arc: () => { arcCount++; },
  fill: () => {},
  fillText: () => {},
  setLineDash: () => {},
  measureText: () => ({ width: 60 }),
  clearRect: () => {},
  rect: () => {}
};

tracker.renderCleanOverlay(mockCtx, null, null, [true, false, false, false, false, false, false], width, height);
assert(lineCount >= 3, 'Must render at least 3 tilted lines');
assert(arcCount >= 7, 'Must render 7 tone hole dots');
console.log(`Rendered: ${lineCount} line segments, ${arcCount} circular hole dots & beacons.`);
console.log('✅ PASS: Clean overlay successfully renders 3 gently tilted lines and 7 tone hole dots with no flute cylinder body.');

// 6. Test onResults Hand Lifting Posture Recognition (No ReferenceErrors)
console.log('\n--- 5. Testing Hand Lifting Posture Recognition in onResults ---');
function createMockHand(screenX, screenY, isLeft = true) {
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 1.0 - screenX, y: screenY, z: 0.0 });
  }
  const dir = isLeft ? 1 : -1;
  lm[5] = { x: 1.0 - (screenX + 0.04 * dir), y: screenY, z: 0.0 };
  lm[9] = { x: 1.0 - screenX, y: screenY, z: 0.0 };
  lm[13] = { x: 1.0 - (screenX - 0.04 * dir), y: screenY, z: 0.0 };
  lm[17] = { x: 1.0 - (screenX - 0.08 * dir), y: screenY, z: 0.0 };
  return lm;
}

tracker.canvasCtx = mockCtx;
tracker.canvasElement = { width, height };

// Frame 1: Hands down at rest (Y = 0.90)
const restingLeft = createMockHand(0.40, 0.90, true);
const restingRight = createMockHand(0.60, 0.92, false);
tracker.onResults({
  multiHandLandmarks: [restingLeft, restingRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});
assert.strictEqual(tracker.inPlayingPosition, false, 'Resting hands must not be in playing position');

// Frame 2: User lifts hands into playing position (Y = 0.52)
const playingLeft = createMockHand(0.40, 0.52, true);
const playingRight = createMockHand(0.62, 0.55, false);
tracker.onResults({
  multiHandLandmarks: [playingLeft, playingRight],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});
assert.strictEqual(tracker.inPlayingPosition, true, 'Lifting hands must immediately recognize playing position');
console.log('✅ PASS: Lifting hands cleanly recognized in playing position without any errors or glitches.');

// Frame 3: Single Left hand lifted (plays solo)
tracker.onResults({
  multiHandLandmarks: [playingLeft],
  multiHandedness: [{ label: 'Right' }]
});
assert.strictEqual(tracker.inPlayingPosition, true, 'Left hand alone must be recognized in playing position');
console.log('✅ PASS: Single left hand lifting recognized in playing position.');

console.log('\n🌟 ALL ERGONOMIC TILT FLUTE TESTS PASSED 100%!\n');
