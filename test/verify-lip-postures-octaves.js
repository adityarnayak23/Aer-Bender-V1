// =========================================================================
// 🧪 AUTOMATED TEST SUITE: VERIFY HEAD PITCH TILT & OCTAVE MAPPING
// =========================================================================
// Requirements:
// 1. "Chin Nod Down" -> Mandra (-1 / Bass)
// 2. "Level Head" -> Madhya (0 / Mid)
// 3. "Chin Tilt Up" -> Tara (+1 / High)

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('📐 TESTING HEAD PITCH TILT: CHIN DOWN = LOW, LEVEL = MID, CHIN UP = HIGH');
console.log('======================================================\n');

// Mock window and swaras data
const dummyWindow = {};
const repoDir = '/Users/adityanayak/.gemini/antigravity/scratch/air-flute';

const swarasCode = fs.readFileSync(path.join(repoDir, 'src/swaras-data.js'), 'utf8');
eval(`(function(window) { ${swarasCode} })(dummyWindow)`);
global.window = dummyWindow;

const trackerCode = fs.readFileSync(path.join(repoDir, 'src/carnatic-flute-tracker.js'), 'utf8');
eval(`(function(window) { ${trackerCode} })(dummyWindow)`);
const CarnaticFluteTracker = dummyWindow.CarnaticFluteTracker;

// Helper to construct realistic FaceMesh landmarks with specific head pitch
function createFaceWithHeadPitch({
  pitch = 0, // -1: chin nod down, 0: level, +1: chin tilt up
  cornerSpan = 0.10,
  faceHeight = 0.22
} = {}) {
  const lm = [];
  const cx = 0.5;
  const cy = 0.5;

  for (let i = 0; i <= 468; i++) {
    lm.push({ x: cx, y: cy, z: 0.0 });
  }

  const pitchFactor = pitch * 0.25;
  const upperY = (faceHeight * 0.5) * (1 - pitchFactor * 0.5);
  const lowerY = (faceHeight * 0.5) * (1 + pitchFactor * 1.2);
  const chinZ = -pitch * 0.025;
  const foreZ = +pitch * 0.015;

  lm[10]  = { x: cx, y: cy - upperY, z: foreZ };
  lm[1]   = { x: cx, y: cy, z: 0.0 };
  lm[152] = { x: cx, y: cy + lowerY, z: chinZ };

  lm[61]  = { x: cx - cornerSpan / 2, y: cy + 0.02, z: 0.0 };
  lm[291] = { x: cx + cornerSpan / 2, y: cy + 0.02, z: 0.0 };

  lm[33]  = { x: cx - cornerSpan / 2, y: cy - upperY * 0.4, z: 0.0 };
  lm[263] = { x: cx + cornerSpan / 2, y: cy - upperY * 0.4, z: 0.0 };

  lm[13]  = { x: cx, y: cy + 0.015, z: 0.0 };
  lm[14]  = { x: cx, y: cy + 0.025, z: 0.0 };

  return lm;
}

// --- Test 1: Chin Nod Down -> Low Octave (-1 / Mandra) ---
console.log('--- 1. Testing Chin Nod Down (Low Octave / Mandra / -1) ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = 0;

  const closedFace = createFaceWithHeadPitch({ pitch: -0.75 });

  const rawScore = tracker.computeHeadPitchScore(closedFace);
  console.log(`Chin nod down raw score: ${rawScore.toFixed(3)} (Target: < 0.35)`);
  assert(rawScore < 0.35, 'Chin nod down must score < 0.35 (Low Octave threshold)');

  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(closedFace);
  }

  console.log(`Resulting Octave: ${tracker.currentOctave}, State: ${tracker.headState}, Smoothed Score: ${tracker.smoothedHeadPitchScore.toFixed(3)}`);
  assert.strictEqual(tracker.currentOctave, -1, 'Chin nod down MUST be Low Octave (-1)');
  assert.strictEqual(tracker.headState, 'chin_down', 'Head state must be chin_down');
  console.log('✅ PASS: Chin nod down correctly produces Low Octave (-1 / Mandra)');
}

// --- Test 2: Level Head -> Mid Octave (0 / Madhya) ---
console.log('\n--- 2. Testing Level Head (Mid Octave / Madhya / 0) ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = -1; // Start from bass

  const levelFace = createFaceWithHeadPitch({ pitch: 0 });

  const rawScore = tracker.computeHeadPitchScore(levelFace);
  console.log(`Level head raw score: ${rawScore.toFixed(3)} (Target: 0.38 - 0.62)`);
  assert(rawScore >= 0.38 && rawScore <= 0.62, 'Level head must produce score in Mid octave zone (0.38 - 0.62)');

  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(levelFace);
  }

  console.log(`Resulting Octave: ${tracker.currentOctave}, State: ${tracker.headState}, Smoothed Score: ${tracker.smoothedHeadPitchScore.toFixed(3)}`);
  assert.strictEqual(tracker.currentOctave, 0, 'Level head MUST be Mid Octave (0)');
  assert.strictEqual(tracker.headState, 'level', 'Head state must be level');
  console.log('✅ PASS: Level head correctly produces Mid Octave (0 / Madhya)');
}

// --- Test 3: Chin Tilt Up -> High Octave (+1 / Tara) ---
console.log('\n--- 3. Testing Chin Tilt Up (High Octave / Tara / +1) ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = 0; // Start at default Mid octave

  const upFace = createFaceWithHeadPitch({ pitch: +0.75 });

  const rawScore = tracker.computeHeadPitchScore(upFace);
  console.log(`Chin tilt up raw score: ${rawScore.toFixed(3)} (Target: > 0.65)`);
  assert(rawScore > 0.65, 'Chin tilt up must produce score > 0.65 (High Octave threshold)');

  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(upFace);
  }

  console.log(`Resulting Octave: ${tracker.currentOctave}, State: ${tracker.headState}, Smoothed Score: ${tracker.smoothedHeadPitchScore.toFixed(3)}`);
  assert.strictEqual(tracker.currentOctave, 1, 'Chin tilt up MUST be High Octave (+1)');
  assert.strictEqual(tracker.headState, 'chin_up', 'Head state must be chin_up');
  console.log('✅ PASS: Chin tilt up correctly produces High Octave (+1 / Tara)');
}

// --- Test 4: Smooth Bidirectional Transitions Between All 3 Postures ---
console.log('\n--- 4. Testing Bidirectional Transitions ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.canvasElement = { width: 640, height: 480 };

  const downFace  = createFaceWithHeadPitch({ pitch: -0.75 });
  const levelFace = createFaceWithHeadPitch({ pitch: 0 });
  const upFace    = createFaceWithHeadPitch({ pitch: +0.75 });

  // A. Start at Down (Low -1)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(downFace);
  assert.strictEqual(tracker.currentOctave, -1, 'Must start in Low (-1)');

  // B. Level -> Mid (0)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(levelFace);
  assert.strictEqual(tracker.currentOctave, 0, 'Must switch to Mid (0) when head is level');

  // C. Down again -> Low (-1)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(downFace);
  assert.strictEqual(tracker.currentOctave, -1, 'Must return to Low (-1) when chin nods down');

  // D. Up -> High (+1)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(upFace);
  assert.strictEqual(tracker.currentOctave, 1, 'Must switch to High (+1) when chin tilts up');

  // E. Level -> Mid (0)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(levelFace);
  assert.strictEqual(tracker.currentOctave, 0, 'Must return to Mid (0) when head levels');

  console.log('✅ PASS: Flawless bidirectional transitions: Down(-1) <-> Level(0) and Level(0) <-> Up(+1)');
}

// --- Test 5: Posture Stability & Zero-Jitter Under Micro-Tremor ---
console.log('\n--- 5. Testing Zero-Jitter Under Camera Noise ---');
{
  const tracker = new CarnaticFluteTracker();
  const levelFace = createFaceWithHeadPitch({ pitch: 0 });

  // Settle at level (Mid)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(levelFace);

  let octaveFlips = 0;
  // Apply random realistic micro-tremor over 60 frames
  for (let f = 0; f < 60; f++) {
    const jitter = (Math.random() - 0.5) * 0.08;
    const noisyFace = createFaceWithHeadPitch({ pitch: jitter });
    const prevOct = tracker.currentOctave;
    tracker.updateOctaveFromHeadPitch(noisyFace);
    if (tracker.currentOctave !== prevOct) octaveFlips++;
  }

  assert.strictEqual(octaveFlips, 0, 'Camera micro-noise must not cause octave jitter');
  assert.strictEqual(tracker.currentOctave, 0, 'Must remain locked in Mid octave during micro-tremor');
  console.log('✅ PASS: Hysteresis deadbands guarantee 100% zero-jitter stability on resting notes');
}

console.log('\n======================================================');
console.log('🎉 ALL HEAD PITCH & OCTAVE TESTS PASSED 100%!');
console.log('======================================================\n');
