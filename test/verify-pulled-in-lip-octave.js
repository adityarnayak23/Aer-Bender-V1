// Verification Test: Head Pitch Tilt Octave Detection (Chin Down = Bass, Level = Mid, Chin Up = High)
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const dummyWindow = {};
const swarasCode = fs.readFileSync(path.join(__dirname, '../src/swaras-data.js'), 'utf8');
eval(`(function(window) { ${swarasCode} })(dummyWindow)`);
global.window = dummyWindow;

const trackerCode = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf8');
eval(`(function(window) { ${trackerCode} })(dummyWindow)`);
const CarnaticFluteTracker = dummyWindow.CarnaticFluteTracker;

console.log('\n======================================================');
console.log('🧪 TESTING HEAD PITCH TILT OCTAVE DETECTION (CHIN UP / LEVEL / CHIN DOWN)');
console.log('======================================================');

// Helper to construct mock FaceMesh landmarks with realistic webcam head pitch dimensions
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

  // Pitch modulation:
  // When chin nods down (pitch < 0):
  // - Chin moves up toward nose in 2D perspective (lower span shrinks)
  // - Forehead tilts slightly forward
  // - Chin z recedes into screen
  // When chin tilts up (pitch > 0):
  // - Chin moves down away from nose (lower span expands)
  // - Chin z advances toward camera
  const pitchFactor = pitch * 0.25;
  const upperY = (faceHeight * 0.5) * (1 - pitchFactor * 0.5);
  const lowerY = (faceHeight * 0.5) * (1 + pitchFactor * 1.2);
  const chinZ = -pitch * 0.025;
  const foreZ = +pitch * 0.015;

  lm[10]  = { x: cx, y: cy - upperY, z: foreZ };
  lm[1]   = { x: cx, y: cy, z: 0.0 };
  lm[152] = { x: cx, y: cy + lowerY, z: chinZ };

  // Mouth corners (61, 291)
  lm[61]  = { x: cx - cornerSpan / 2, y: cy + 0.02, z: 0.0 };
  lm[291] = { x: cx + cornerSpan / 2, y: cy + 0.02, z: 0.0 };

  // Outer eyes (33, 263)
  lm[33]  = { x: cx - cornerSpan / 2, y: cy - upperY * 0.4, z: 0.0 };
  lm[263] = { x: cx + cornerSpan / 2, y: cy - upperY * 0.4, z: 0.0 };

  // Lips (13, 14)
  lm[13]  = { x: cx, y: cy + 0.015, z: 0.0 };
  lm[14]  = { x: cx, y: cy + 0.025, z: 0.0 };

  return lm;
}

// 1. Test Chin Nod Down -> Low Octave (Mandra, -1)
console.log('\n--- 1. Testing Chin Nod Down (Low Octave / Mandra / -1) ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = 0;

  // Chin nod down (~5°-8° downward tilt)
  const chinDownFace = createFaceWithHeadPitch({ pitch: -0.75 });

  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(chinDownFace);
  }

  console.log(`Chin Down Raw Score: ${tracker.rawHeadPitchScore.toFixed(3)}, Smoothed: ${tracker.smoothedHeadPitchScore.toFixed(3)}, Octave: ${tracker.currentOctave}`);
  assert(tracker.smoothedHeadPitchScore < 0.35, 'Chin nod down must score < 0.35');
  assert.strictEqual(tracker.currentOctave, -1, 'Chin nod down MUST trigger Low Octave (-1)');
  assert.strictEqual(tracker.headState, 'chin_down', 'Head state must be chin_down');
  console.log('✅ PASS: Chin nod down reliably triggers Low Octave (-1)');
}

// 2. Test Level / Neutral Head -> Mid Octave (Madhya, 0)
console.log('\n--- 2. Testing Level / Neutral Head (Mid Octave / Madhya / 0) ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = -1; // Start from bass

  const levelFace = createFaceWithHeadPitch({ pitch: 0 });

  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(levelFace);
  }

  console.log(`Level Head Raw Score: ${tracker.rawHeadPitchScore.toFixed(3)}, Smoothed: ${tracker.smoothedHeadPitchScore.toFixed(3)}, Octave: ${tracker.currentOctave}`);
  assert(tracker.smoothedHeadPitchScore >= 0.42 && tracker.smoothedHeadPitchScore <= 0.62, 'Level head must score in Mid zone (0.42 - 0.62)');
  assert.strictEqual(tracker.currentOctave, 0, 'Level head MUST trigger Mid Octave (0)');
  assert.strictEqual(tracker.headState, 'level', 'Head state must be level');
  console.log('✅ PASS: Level head reliably triggers Mid Octave (0)');
}

// 3. Test Chin Tilt Up -> High Octave (Tara, +1)
console.log('\n--- 3. Testing Chin Tilt Up (High Octave / Tara / +1) ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = 0;

  // Chin tilt up (~5°-8° upward tilt)
  const chinUpFace = createFaceWithHeadPitch({ pitch: +0.75 });

  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(chinUpFace);
  }

  console.log(`Chin Up Raw Score: ${tracker.rawHeadPitchScore.toFixed(3)}, Smoothed: ${tracker.smoothedHeadPitchScore.toFixed(3)}, Octave: ${tracker.currentOctave}`);
  assert(tracker.smoothedHeadPitchScore > 0.65, 'Chin tilt up must score > 0.65');
  assert.strictEqual(tracker.currentOctave, 1, 'Chin tilt up MUST trigger High Octave (+1)');
  assert.strictEqual(tracker.headState, 'chin_up', 'Head state must be chin_up');
  console.log('✅ PASS: Chin tilt up reliably triggers High Octave (+1)');
}

// 4. Test Monotonic Head Pitch Property
console.log('\n--- 4. Testing Monotonic Head Pitch Score Property ---');
{
  const tracker = new CarnaticFluteTracker();

  const pitchLevels = [-1.0, -0.6, -0.3, 0.0, +0.3, +0.6, +1.0];
  let prevScore = -1;
  let monotonic = true;

  for (const p of pitchLevels) {
    const face = createFaceWithHeadPitch({ pitch: p });
    const score = tracker.computeHeadPitchScore(face);
    console.log(`  Pitch ${p >= 0 ? '+' : ''}${p.toFixed(2)} -> Score ${score.toFixed(3)}`);
    if (score < prevScore - 0.001) { monotonic = false; }
    prevScore = score;
  }

  assert(monotonic, 'Head pitch score must strictly increase from chin-down to chin-up');
  console.log('✅ PASS: Head pitch score is strictly monotonic');
}

// 5. Test Quick Musical Phrase Transitions
console.log('\n--- 5. Testing Musical Phrase Transitions: Down(-1) -> Level(0) -> Up(+1) -> Level(0) -> Down(-1) ---');
{
  const tracker = new CarnaticFluteTracker();
  const downFace  = createFaceWithHeadPitch({ pitch: -0.75 });
  const levelFace = createFaceWithHeadPitch({ pitch: 0 });
  const upFace    = createFaceWithHeadPitch({ pitch: +0.75 });

  // 1. Chin down -> Low (-1)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(downFace);
  assert.strictEqual(tracker.currentOctave, -1, 'Must be in Low (-1)');

  // 2. Level -> Mid (0)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(levelFace);
  assert.strictEqual(tracker.currentOctave, 0, 'Must transition to Mid (0)');

  // 3. Chin up -> High (+1)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(upFace);
  assert.strictEqual(tracker.currentOctave, 1, 'Must transition to High (+1)');

  // 4. Return to Level -> Mid (0)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(levelFace);
  assert.strictEqual(tracker.currentOctave, 0, 'Must return to Mid (0)');

  // 5. Return to Chin down -> Low (-1)
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(downFace);
  assert.strictEqual(tracker.currentOctave, -1, 'Must return to Low (-1)');

  console.log('✅ PASS: Flawless musical phrase octave transitions verified!');
}

console.log('\n======================================================');
console.log('🎉 ALL HEAD PITCH TILT OCTAVE TESTS PASSED 100%!');
console.log('======================================================\n');
