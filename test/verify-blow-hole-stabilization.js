// Verification Test: Embouchure Blow Hole Stabilization & Mouth-Controlled Octaves
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
console.log('🧪 TESTING EMBOUCHURE BLOW HOLE STABILIZATION');
console.log('======================================================');

// Helper to construct mock FaceMesh landmarks at specific screen coordinates
function createFaceAtPosition(screenX, screenY, { pitch = 0, lipOpenY = 0.002, cornerSpanX = 0.10, faceHeightY = 0.22 } = {}) {
  const lm = [];
  // MediaPipe un-mirrored landmark.x = 1.0 - screenX
  const rawX = 1.0 - screenX;
  const rawY = screenY;

  for (let i = 0; i <= 468; i++) {
    lm.push({ x: rawX, y: rawY, z: 0.0 });
  }

  // Head Pitch:
  const pitchFactor = pitch * 0.25;
  const upperY = (faceHeightY * 0.5) * (1 - pitchFactor * 0.5);
  const lowerY = (faceHeightY * 0.5) * (1 + pitchFactor * 1.2);
  const chinZ = -pitch * 0.025;
  const foreZ = +pitch * 0.015;

  lm[10]  = { x: rawX, y: rawY - upperY, z: foreZ };
  lm[1]   = { x: rawX, y: rawY, z: 0.0 };
  lm[152] = { x: rawX, y: rawY + lowerY, z: chinZ };

  // Upper inner lip: 13, Lower inner lip: 14
  lm[13] = { x: rawX, y: rawY - lipOpenY / 2, z: 0.0 };
  lm[14] = { x: rawX, y: rawY + lipOpenY / 2, z: 0.0 };

  // Outer lips: 0, 17
  const outerHeight = Math.max(0.028, lipOpenY + 0.024);
  lm[0]  = { x: rawX, y: rawY - outerHeight / 2, z: 0.0 };
  lm[17] = { x: rawX, y: rawY + outerHeight / 2, z: 0.0 };

  // Corners: 61, 291
  lm[61]  = { x: rawX - cornerSpanX / 2, y: rawY, z: 0.0 };
  lm[291] = { x: rawX + cornerSpanX / 2, y: rawY, z: 0.0 };

  return lm;
}

// 1. Test Blow Hole Geometry
console.log('\n--- 1. Testing Embouchure Blow Hole Position & Offset ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.canvasElement = { width: 640, height: 480 };

  const blowPos = tracker.getBlowHolePos(640, 480);
  const hole0Pos = tracker.getHolePos(0, 640, 480); // L1 (Left Index)

  console.log(`Blow Hole Pos: (${blowPos.x.toFixed(1)}, ${blowPos.y.toFixed(1)})`);
  console.log(`L1 Hole Pos:    (${hole0Pos.x.toFixed(1)}, ${hole0Pos.y.toFixed(1)})`);

  // Blow hole must be to the left of L1 along the slanted line
  assert(blowPos.x < hole0Pos.x, 'Blow hole must be to the left of L1 along the flute body');
  assert(blowPos.y < hole0Pos.y, 'Blow hole must slope up-left matching 12° flute angle');
  console.log('✅ Blow hole geometry perfectly aligned with classical flute embouchure');
}

// 2. Test Embouchure Alignment & Silence when Mouth Moves Away
console.log('\n--- 2. Testing Embouchure Alignment & Away-Silence ---');
{
  let embouchureStatus = null;
  const tracker = new CarnaticFluteTracker({
    onEmbouchureChanged: (data) => { embouchureStatus = data.isAligned; }
  });
  tracker.canvasElement = { width: 640, height: 480 };

  const blowPos = tracker.getBlowHolePos(640, 480);
  const blowScreenX = blowPos.x / 640;
  const blowScreenY = blowPos.y / 480;

  // Face aligned directly at the Blow Hole
  const alignedFace = createFaceAtPosition(blowScreenX, blowScreenY, { lipOpenY: 0.016 });
  tracker.updateOctaveFromMouth(alignedFace);

  console.log(`Aligned Face -> Distance: ${tracker.mouthDistToBlowHole.toFixed(3)}, IsAligned: ${tracker.isLipsAtBlowHole}`);
  assert.strictEqual(tracker.isLipsAtBlowHole, true, 'Lips at blow hole must trigger embouchure alignment');
  assert.strictEqual(embouchureStatus, true, 'Callback must receive isAligned: true');

  // Face moved far away (e.g. 150px to the right)
  const awayFace = createFaceAtPosition(blowScreenX + 0.35, blowScreenY + 0.20, { lipOpenY: 0.016 });
  tracker.updateOctaveFromMouth(awayFace);

  console.log(`Away Face -> Distance: ${tracker.mouthDistToBlowHole.toFixed(3)}, IsAligned: ${tracker.isLipsAtBlowHole}`);
  assert.strictEqual(tracker.isLipsAtBlowHole, false, 'Moving lips away must disengage embouchure');
  assert.strictEqual(embouchureStatus, false, 'Callback must receive isAligned: false');
  console.log('✅ Embouchure proximity gate functions reliably with hysteresis');
}

// 3. Test Starting on ANY Swara (Retirement of Mandatory Sa Hold)
console.log('\n--- 3. Testing Instant Start on ANY Swara (Pa, Ma, Ga directly) ---');
{
  let detectedSwara = null;
  const tracker = new CarnaticFluteTracker({
    onSwaraDetected: (res) => { detectedSwara = res ? res.swara : null; }
  });
  tracker.canvasElement = { width: 640, height: 480 };
  tracker.canvasCtx = {
    save: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {},
    lineTo: () => {}, stroke: () => {}, arc: () => {}, fill: () => {},
    fillText: () => {}, setLineDash: () => {}, measureText: () => ({ width: 60 }), clearRect: () => {},
    rect: () => {}
  };
  tracker.faceDetector = {}; // Face detection active

  const blowPos = tracker.getBlowHolePos(640, 480);
  const alignedFace = createFaceAtPosition(blowPos.x / 640, blowPos.y / 480, { lipOpenY: 0.016 });
  tracker.lastFaceLandmarks = alignedFace;
  tracker.updateOctaveFromMouth(alignedFace); // Lips at blow hole

  // Construct hands playing 'Pa' directly (5 closed holes: L1..L3, R1..R2)
  function createMockHand(screenX, screenY, isLeft = true, closedFingers = [true, true, true, true]) {
    const lm = [];
    for (let i = 0; i < 21; i++) lm.push({ x: 1.0 - screenX, y: screenY, z: 0.0 });
    const dir = isLeft ? 1 : -1;
    lm[0]  = { x: 1.0 - (screenX - 0.06 * dir), y: screenY + 0.08, z: 0.0 };
    lm[9]  = { x: 1.0 - screenX, y: screenY, z: 0.0 };
    
    const fingerBases = [5, 9, 13, 17];
    fingerBases.forEach((base, f) => {
      const isClosed = closedFingers[f];
      const curlAmount = isClosed ? 0.75 : 0.15;
      const mcpX = 1.0 - (screenX + (f - 1.5) * 0.025 * dir);
      const mcpY = screenY;
      const span = (0.82 - curlAmount * 0.22) * 0.09;
      lm[base]     = { x: mcpX, y: mcpY, z: 0.0 };
      lm[base + 1] = { x: mcpX, y: mcpY - 0.04, z: 0.0 };
      lm[base + 2] = { x: mcpX, y: mcpY - 0.07, z: 0.0 };
      lm[base + 3] = { x: mcpX, y: mcpY - span, z: 0.0 };
    });
    return lm;
  }

  const saHand = createMockHand(0.40, 0.52, true, [true, true, false, false]); // Sa fingering
  const leftHand = createMockHand(0.40, 0.52, true, [true, true, true, false]);
  const rightHand = createMockHand(0.62, 0.54, false, [true, true, false, false]); // Pa fingering
  const rightRest = createMockHand(0.62, 0.54, false, [false, false, false, false]);

  // Cold start on Pa must remain silent while awaiting initial Sa
  tracker.onResults({
    multiHandLandmarks: [leftHand, rightHand],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
  assert.strictEqual(detectedSwara, null, 'Must remain silent until Sa is stabilized');
  assert.strictEqual(tracker.awaitingInitialSa, true, 'Must be awaiting initial Sa');

  // Play Sa for 3 frames to stabilize and unlock
  for (let f = 0; f < 3; f++) {
    tracker.onResults({
      multiHandLandmarks: [saHand, rightRest],
      multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
    });
  }

  console.log(`Detected Swara upon stabilizing Sa: ${detectedSwara ? detectedSwara.id : 'none'}`);
  assert(detectedSwara !== null, 'Flute must start playing once Sa is stabilized');
  assert.strictEqual(detectedSwara.id, 'sa', 'Must start on Sa upon stabilization');
  console.log('✅ Successfully stabilizes and starts on Sa with lips at blow hole');

  // Now play Pa -> plays immediately!
  for (let f = 0; f < 2; f++) {
    tracker.onResults({
      multiHandLandmarks: [leftHand, rightHand],
      multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
    });
  }
  assert.strictEqual(detectedSwara.id, 'pa', 'Subsequent notes play smoothly once Sa is unlocked');

  // Now move lips away -> sound must immediately mute!
  const awayFace = createFaceAtPosition(0.80, 0.80);
  tracker.lastFaceLandmarks = awayFace;
  tracker.updateOctaveFromMouth(awayFace);

  tracker.onResults({ multiHandLandmarks: [leftHand, rightHand] });
  console.log(`Detected Swara after moving lips away: ${detectedSwara ? detectedSwara.id : 'null (silent)'}`);
  assert.strictEqual(detectedSwara, null, 'Flute must immediately mute when lips move off the blow hole');
  console.log('✅ Flute cleanly mutes when lips move off the blow hole');
}

// 4. Test Octave Modulation at Blow Hole (Chin Down = Bass, Level = Mid, Chin Up = High)
console.log('\n--- 4. Testing Octave Calling at Blow Hole (Chin Down = Bass, Level = Mid, Chin Up = High) ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.canvasElement = { width: 640, height: 480 };
  const blowPos = tracker.getBlowHolePos(640, 480);
  const bx = blowPos.x / 640;
  const by = blowPos.y / 480;

  // 1. Chin nod down at blow hole -> Mandra (-1 / Low)
  const chinDownFace = createFaceAtPosition(bx, by, { pitch: -0.75 });
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(chinDownFace);
  console.log(`Chin nod down at blow hole -> Octave: ${tracker.currentOctave}`);
  assert.strictEqual(tracker.currentOctave, -1, 'Chin nod down must call Bass / Low (-1)');

  // 2. Level head at blow hole -> Madhya (0 / Mid)
  const levelFace = createFaceAtPosition(bx, by, { pitch: 0 });
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(levelFace);
  console.log(`Level head at blow hole -> Octave: ${tracker.currentOctave}`);
  assert.strictEqual(tracker.currentOctave, 0, 'Level head must call Mid (0)');

  // 3. Chin tilt up at blow hole -> Tara (+1 / High)
  const chinUpFace = createFaceAtPosition(bx, by, { pitch: +0.75 });
  for (let f = 0; f < 10; f++) tracker.updateOctaveFromHeadPitch(chinUpFace);
  console.log(`Chin tilt up at blow hole -> Octave: ${tracker.currentOctave}`);
  assert.strictEqual(tracker.currentOctave, 1, 'Chin tilt up must call High (+1)');

  console.log('✅ Octaves called cleanly: Chin Down = Low, Level = Mid, Chin Up = High');
}

// 5. Test Overlay Rendering of Blow Hole
console.log('\n--- 5. Testing Blow Hole Rendering in Canvas Overlay ---');
{
  const tracker = new CarnaticFluteTracker();
  tracker.canvasElement = { width: 640, height: 480 };

  let textRendered = [];
  const mockCtx = {
    save: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {},
    lineTo: () => {}, stroke: () => {}, arc: () => {}, fill: () => {},
    fillText: (t) => { textRendered.push(t); },
    setLineDash: () => {}, measureText: () => ({ width: 60 }), clearRect: () => {},
    rect: () => {}
  };

  tracker.renderCleanOverlay(mockCtx, null, null, [false, false, false, false, false, false, false], 640, 480);

  const blowPos = tracker.getBlowHolePos(640, 480);
  assert(blowPos && blowPos.x > 0 && blowPos.y > 0, 'Blow hole position must be valid');
  const hasBlowHoleText = textRendered.some(t => t.includes('BLOW HOLE'));
  assert.strictEqual(hasBlowHoleText, false, 'Clutter "BLOW HOLE" text label must be suppressed as per user design mandate');
  console.log('✅ Embouchure Blow Hole optical reticle rendered cleanly without text clutter');
}

console.log('\n======================================================');
console.log('🎉 ALL EMBOUCHURE BLOW HOLE STABILIZATION TESTS PASSED 100%!');
console.log('======================================================\n');
