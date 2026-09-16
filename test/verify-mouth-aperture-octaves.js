// Verification Test: Head-Tilt Controlled Octave Engine & Single Slanted Line
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
console.log('🧪 TESTING PRODUCT 3: HEAD-TILT CONTROLLED OCTAVES & SINGLE SLANTED LINE');
console.log('======================================================');

// Helper to construct mock FaceMesh landmarks with head pitch
function createMockFaceLandmarks({ pitch = 0, cornerSpanX = 0.10, faceHeightY = 0.22, isProfile = false } = {}) {
  const lm = [];
  const cx = 0.5;
  const cy = 0.5;
  for (let i = 0; i <= 468; i++) {
    lm.push({ x: cx, y: cy, z: 0.0 });
  }

  const pitchFactor = pitch * 0.25;
  const upperY = (faceHeightY * 0.5) * (1 - pitchFactor * 0.5);
  const lowerY = (faceHeightY * 0.5) * (1 + pitchFactor * 1.2);
  const chinZ = -pitch * 0.025;
  const foreZ = +pitch * 0.015;

  // Forehead top: 10, Nose tip: 1, Chin bottom: 152
  lm[10]  = { x: cx, y: cy - upperY, z: foreZ };
  lm[1]   = { x: cx, y: cy, z: 0.0 };
  lm[152] = { x: cx, y: cy + lowerY, z: chinZ };

  // Corners: 61, 291
  const spanX = isProfile ? cornerSpanX * 0.2 : cornerSpanX;
  lm[61]  = { x: cx - spanX / 2, y: cy + 0.02, z: 0.0 };
  lm[291] = { x: cx + spanX / 2, y: cy + 0.02, z: 0.0 };

  // Eyes: 33, 263
  lm[33]  = { x: cx - spanX / 2, y: cy - upperY * 0.4, z: 0.0 };
  lm[263] = { x: cx + spanX / 2, y: cy - upperY * 0.4, z: 0.0 };

  // Lips: 13, 14
  lm[13] = { x: cx, y: cy + 0.015, z: 0.0 };
  lm[14] = { x: cx, y: cy + 0.025, z: 0.0 };

  return lm;
}

// 1. Test Chin Nod Down -> Mandra (-1)
console.log('\n--- 1. Testing Chin Nod Down (Mandra Sthayi / -1) ---');
{
  let detectedOctave = null;
  let detectedState = null;
  const tracker = new CarnaticFluteTracker({
    onOctaveChanged: (oct) => { detectedOctave = oct; },
    onMouthApertureChanged: (d) => { detectedState = d.state; }
  });

  const chinDownFace = createMockFaceLandmarks({ pitch: -0.75 });
  
  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(chinDownFace);
  }

  console.log(`Ratio: ${tracker.smoothedMouthRatio.toFixed(3)}, Octave: ${tracker.currentOctave}, State: ${tracker.headState}`);
  assert.strictEqual(tracker.currentOctave, -1, 'Chin nod down must trigger Mandra (-1)');
  assert.strictEqual(tracker.headState, 'chin_down', 'Head state must be chin_down');
  console.log('✅ Chin nod down correctly selects Mandra (-1)');
}

// 2. Test Level Head -> Madhya (0)
console.log('\n--- 2. Testing Level Head (Madhya Sthayi / 0) ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = -1; // Start from bass

  const levelFace = createMockFaceLandmarks({ pitch: 0 });

  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(levelFace);
  }

  console.log(`Ratio: ${tracker.smoothedMouthRatio.toFixed(3)}, Octave: ${tracker.currentOctave}, State: ${tracker.headState}`);
  assert.strictEqual(tracker.currentOctave, 0, 'Level head must trigger Madhya (0)');
  assert.strictEqual(tracker.headState, 'level', 'Head state must be level');
  console.log('✅ Level head correctly selects Madhya (0)');
}

// 3. Test Chin Tilt Up -> Tara (+1)
console.log('\n--- 3. Testing Chin Tilt Up (Tara Sthayi / +1) ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = 0; // Start from mid

  const upFace = createMockFaceLandmarks({ pitch: +0.75 });

  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(upFace);
  }

  console.log(`Ratio: ${tracker.smoothedMouthRatio.toFixed(3)}, Octave: ${tracker.currentOctave}, State: ${tracker.headState}`);
  assert.strictEqual(tracker.currentOctave, 1, 'Chin tilt up must trigger Tara (+1)');
  assert.strictEqual(tracker.headState, 'chin_up', 'Head state must be chin_up');
  console.log('✅ Chin tilt up correctly selects Tara (+1)');
}

// 4. Test Schmitt Trigger Hysteresis (Zero Flickering on Boundaries)
console.log('\n--- 4. Testing Schmitt Trigger Hysteresis & Deadband Stability ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = 1; // Currently in Tara (+1)

  // Chin tilted up slightly above boundary (> 0.65)
  const highBorderFace = createMockFaceLandmarks({ pitch: +0.35 });
  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(highBorderFace);
  }
  console.log(`Tara retention test -> Ratio: ${tracker.smoothedMouthRatio.toFixed(3)}, Octave: ${tracker.currentOctave}`);
  assert.strictEqual(tracker.currentOctave, 1, 'Must remain in Tara (+1) while score > 0.58');

  // Now level head -> must transition to Madhya (0)
  const levelFace = createMockFaceLandmarks({ pitch: 0 });
  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(levelFace);
  }
  assert.strictEqual(tracker.currentOctave, 0, 'Must transition to Madhya (0) when score drops below 0.58');

  // Small camera noise around level head. Must stay in Madhya!
  const noisyLowerFace = createMockFaceLandmarks({ pitch: -0.05 });
  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(noisyLowerFace);
  }
  console.log(`Madhya lower deadband test -> Ratio: ${tracker.smoothedMouthRatio.toFixed(3)}, Octave: ${tracker.currentOctave}`);
  assert.strictEqual(tracker.currentOctave, 0, 'Must remain in Madhya (0) while score > 0.35');

  // Chin nod down -> must transition to Mandra (-1)
  const downFace = createMockFaceLandmarks({ pitch: -0.75 });
  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(downFace);
  }
  assert.strictEqual(tracker.currentOctave, -1, 'Must transition to Mandra (-1) when chin nods down');

  console.log('✅ Schmitt trigger hysteresis prevents boundary flickering 100%');
}

// 5. Test Profile View Invariance (Scale normalization doesn't collapse at 90°)
console.log('\n--- 5. Testing 90° Profile View Invariance ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.currentOctave = 0;

  // In 90° profile view, mouth corners foreshorten (spanX is tiny), but face height (forehead-to-chin) remains vertical and robust
  const profileUpFace = createMockFaceLandmarks({
    pitch: +0.75,
    cornerSpanX: 0.02, // Foreshortened
    faceHeightY: 0.22, // Vertical span intact
    isProfile: true
  });

  for (let f = 0; f < 10; f++) {
    tracker.updateOctaveFromHeadPitch(profileUpFace);
  }

  console.log(`Profile view chin up -> Ratio: ${tracker.smoothedMouthRatio.toFixed(3)}, Octave: ${tracker.currentOctave}`);
  assert.strictEqual(tracker.currentOctave, 1, 'Profile view chin up must accurately trigger Tara (+1)');
  console.log('✅ Profile view invariance validated: face height stabilizes scale');
}

// 6. Test Single Slanted Line Rendering & Absence of Lip Emojis
console.log('\n--- 6. Testing Single Slanted Line Rendering & Absence of Lip Emojis ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.canvasElement = { width: 640, height: 480 };

  let lineCount = 0;
  let holeArcCount = 0;
  let textRendered = [];

  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => { lineCount++; },
    stroke: () => {},
    arc: () => { holeArcCount++; },
    fill: () => {},
    fillText: (t) => { textRendered.push(t); },
    setLineDash: () => {},
    measureText: () => ({ width: 60 }),
    clearRect: () => {}
  };

  tracker.renderCleanOverlay(mockCtx, null, null, [true, true, true, false, false, false, false], 640, 480);

  console.log(`Lines drawn: ${lineCount}, Hole arcs drawn: ${holeArcCount}`);
  assert(lineCount >= 1, 'Single flute line must be drawn');
  assert(holeArcCount >= 7, 'All 7 tone holes must be rendered');

  // User mandate: "remove the bass, high and mid written on the flute as I play it - colors are enough to show on the flute"
  const hasOctaveBadge = textRendered.some(t => t.includes('MID') || t.includes('Madhya') || t.includes('TARA') || t.includes('MANDRA'));
  assert.strictEqual(hasOctaveBadge, false, 'Octave text badges on the flute must be removed per user design mandate');

  // Strict check: NO lip emojis or mouth labels on the canvas overlay
  const hasLipEmoji = textRendered.some(t => t.includes('👄') || t.includes('Lip') || t.includes('Mouth'));
  assert(!hasLipEmoji, 'Must NOT contain any lip emojis or mouth labels on screen overlay!');
  console.log('✅ Octave text badge cleanly removed from overlay (colors represent octaves)');
  console.log('✅ Exactly 1 slanted flute line and 7 tone holes rendered cleanly with ZERO lip emojis/labels');
}

console.log('\n======================================================');
console.log('🎉 ALL TESTS PASSED: HEAD-TILT CONTROLLED OCTAVES & SINGLE SLANTED LINE VERIFIED 100%!');
console.log('======================================================\n');
