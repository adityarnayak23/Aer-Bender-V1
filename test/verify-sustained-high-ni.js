// Verification Test Suite: Sustained Higher Ni and Left Small Finger Isolation
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

global.performance = { now: () => Date.now() };

let drawnSkeletonPoints = [];
const mockCanvas = { width: 1280, height: 720 };
const mockCtx = {
  save: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {},
  lineTo: () => {}, stroke: () => {}, 
  arc: (x, y) => { drawnSkeletonPoints.push({ x, y }); },
  fill: () => {}, fillText: () => {}, setLineDash: () => {},
  measureText: () => ({ width: 60 }), clearRect: () => {}, rect: () => {}
};

function createLeftHandNi(screenX, screenY, pinkyCurled = true) {
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 1.0 - screenX, y: screenY, z: 0.0 });
  }
  lm[0] = { x: 1.0 - screenX, y: screenY + 0.12, z: 0.0 };

  // Fingers: Index (L1), Middle (L2), Ring (L3) all curled down for Ni
  const fingers = [
    { mcp: 5, pip: 6, dip: 7, tip: 8, offset: +0.04 },
    { mcp: 9, pip: 10, dip: 11, tip: 12, offset: 0.00 },
    { mcp: 13, pip: 14, dip: 15, tip: 16, offset: -0.03 }
  ];

  fingers.forEach(({ mcp, pip, dip, tip, offset }) => {
    const fingerX = screenX + offset;
    lm[mcp] = { x: 1.0 - fingerX, y: screenY, z: 0.0 };
    lm[pip] = { x: 1.0 - fingerX, y: screenY - 0.03, z: 0.0 };
    lm[dip] = { x: 1.0 - fingerX, y: screenY - 0.05, z: 0.0 };
    lm[tip] = { x: 1.0 - fingerX, y: screenY - 0.038, z: 0.0 }; // Curled pad on hole
  });

  // Pinky (17, 18, 19, 20): Curled or uncurled
  const pinkyX = screenX - 0.06;
  lm[17] = { x: 1.0 - pinkyX, y: screenY + 0.02, z: 0.0 };
  lm[18] = { x: 1.0 - pinkyX, y: screenY - 0.02, z: 0.0 };
  lm[19] = { x: 1.0 - pinkyX, y: screenY - 0.04, z: 0.0 };
  const pinkyTipY = pinkyCurled ? screenY - 0.035 : screenY - 0.07;
  lm[20] = { x: 1.0 - pinkyX, y: pinkyTipY, z: 0.0 };

  return lm;
}

const tracker = new CarnaticFluteTracker();
tracker.canvasElement = mockCanvas;
tracker.canvasCtx = mockCtx;
tracker.awaitingInitialSa = false;
tracker.inPlayingPosition = true;
tracker.isLipsAtBlowHole = true;
tracker.currentOctave = 1; // High Octave (Tara)

console.log('--- 1. Testing Left Small Finger Has Zero Role in Note Playing ---');
// When left pinky is curled, it must NOT trigger R1 and must NOT turn Ni into Dha!
const niHandCurledPinky = createLeftHandNi(0.38, 0.52, true);
let leftHoles = tracker.analyzeLeftHand(niHandCurledPinky);
assert.deepStrictEqual(leftHoles, [true, true, true], 'L1, L2, L3 must all be closed for Ni');

// Single-hand frame execution:
let detectedSwara = null;
tracker.onSwaraDetected = (res) => { if (res && res.swara) detectedSwara = res.swara.id; };

tracker.onResults({
  multiHandLandmarks: [niHandCurledPinky],
  multiHandedness: [{ label: 'Right', score: 0.95 }]
});

assert.strictEqual(detectedSwara, 'ni', `Expected Ni (got ${detectedSwara}). Curled pinky must not produce Dha!`);
assert.strictEqual(tracker.currentHoleStates[3], false, 'Hole 3 (R1) must remain open: left pinky has no role!');
console.log('✅ PASS: Left small finger has zero role in note playing; single-hand Ni never flips to Dha.');

console.log('\n--- 2. Testing 60 Consecutive Frames of Sustained Higher Ni ---');
// Simulate 60 frames (~1 second) of holding Higher Ni with realistic camera landmark noise
const detectedNotes = [];
let reattackCount = 0;
let prevNote = null;

tracker.onSwaraDetected = (res) => {
  if (res && res.swara) {
    const noteId = res.swara.id;
    detectedNotes.push(noteId);
    if (noteId !== prevNote) {
      reattackCount++;
      prevNote = noteId;
    }
  }
};

for (let frame = 0; frame < 60; frame++) {
  // Add noise to landmarks (micro-jitter)
  const noisyHand = createLeftHandNi(0.38, 0.52, true);
  const jitter = Math.sin(frame * 0.5) * 0.003;
  noisyHand[16].y += jitter; // L3 tip noise

  tracker.onResults({
    multiHandLandmarks: [noisyHand],
    multiHandedness: [{ label: 'Right', score: 0.95 }]
  });
}

const nonNiCount = detectedNotes.filter(n => n !== 'ni').length;
assert.strictEqual(nonNiCount, 0, `All 60 frames must be Ni, found ${nonNiCount} flickers!`);
assert.strictEqual(reattackCount, 1, `Must be exactly 1 sustained note, but re-attacked ${reattackCount} times ("ni ni ni")!`);
console.log('✅ PASS: 60 consecutive frames of Higher Ni produced exactly 1 continuous sustained note with ZERO re-attacks ("ni ni ni" eliminated)!');

console.log('\n--- 3. Testing Left Pinky Suppressed from Overlay Rendering ---');
// Verify that left pinky joints (17, 18, 19, 20) are never rendered on the canvas
drawnSkeletonPoints = [];
tracker.renderCleanOverlay(mockCtx, niHandCurledPinky, null, [true, true, true, false, false, false, false], 1280, 720);

// Screen X of left pinky tip is pinkyX * 1280 = (0.38 - 0.06) * 1280 = 409.6px
// (Since lm[20].x = 1.0 - pinkyX, toScreen(lm[20]).x = (1.0 - (1.0 - pinkyX)) * 1280 = pinkyX * 1280 = 409.6px)
const pinkyScreenX = (0.38 - 0.06) * 1280;
const drawnOnPinky = drawnSkeletonPoints.filter(pt => Math.abs(pt.x - pinkyScreenX) < 15);
assert.strictEqual(drawnOnPinky.length, 0, `Left pinky must NOT be drawn on canvas, found ${drawnOnPinky.length} points near x=${pinkyScreenX}`);
console.log('✅ PASS: Left hand small finger is completely excluded from skeleton overlay rendering.');

console.log('\n🌟 ALL SUSTAINED HIGHER NI & SMALL FINGER ISOLATION TESTS PASSED 100%!');
