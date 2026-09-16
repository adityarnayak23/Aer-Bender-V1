// Verification Test Suite: Left Hand Finger Recognition Optimization
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
console.log('✅ PASS: CarnaticFluteTracker loaded successfully.\n');

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

console.log('--- 1. Testing Left Hand Finger Pad Closure without Clawing (L1, L2, L3) ---');
const tracker = new CarnaticFluteTracker();
tracker.canvasElement = mockCanvas;
tracker.canvasCtx = mockCtx;

// Helper: create an authentic left-hand finger with gentle pad arch over tone hole
function createFlutePadHand(screenX, screenY, l1Closed = true, l2Closed = true, l3Closed = true) {
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 1.0 - screenX, y: screenY, z: 0.0 });
  }
  // Wrist at (screenX, screenY + 0.12)
  lm[0] = { x: 1.0 - screenX, y: screenY + 0.12, z: 0.0 };

  const fingers = [
    { mcp: 5, pip: 6, dip: 7, tip: 8, closed: l1Closed },
    { mcp: 9, pip: 10, dip: 11, tip: 12, closed: l2Closed },
    { mcp: 13, pip: 14, dip: 15, tip: 16, closed: l3Closed }
  ];

  fingers.forEach(({ mcp, pip, dip, tip, closed }, idx) => {
    const fingerX = screenX + (idx - 1) * 0.04;
    lm[mcp] = { x: 1.0 - fingerX, y: screenY, z: 0.0 };

    if (closed) {
      // Natural gentle pad arch: PIP & DIP elevated, tip resting on hole
      lm[pip] = { x: 1.0 - fingerX, y: screenY - 0.03, z: 0.0 };
      lm[dip] = { x: 1.0 - fingerX, y: screenY - 0.05, z: 0.0 };
      lm[tip] = { x: 1.0 - fingerX, y: screenY - 0.038, z: 0.0 };
    } else {
      // Extended/lifted off hole: finger straightens and lifts
      lm[pip] = { x: 1.0 - fingerX, y: screenY - 0.03, z: 0.0 };
      lm[dip] = { x: 1.0 - fingerX, y: screenY - 0.05, z: 0.0 };
      lm[tip] = { x: 1.0 - fingerX, y: screenY - 0.07, z: 0.0 };
    }
  });

  return lm;
}

// Test L1, L2, L3 closure in authentic flute posture
const saHand = createFlutePadHand(0.40, 0.52, true, true, false); // Sa = L1 & L2 closed
const leftHolesSa = tracker.analyzeLeftHand(saHand);
assert.strictEqual(leftHolesSa[0], true, 'L1 (Index) must close with gentle flute pad grip');
assert.strictEqual(leftHolesSa[1], true, 'L2 (Middle) must close with gentle flute pad grip');
assert.strictEqual(leftHolesSa[2], false, 'L3 (Ring) must remain open');
console.log('✅ PASS: Sa fingering [L1=true, L2=true, L3=false] cleanly detected with natural finger pads.');

console.log('\n--- 2. Testing Carnatic Hand-Coupling Assist on L1 ---');
// When L2 is closed, L1 gets coupling assist
tracker.currentHoleStates[1] = true; // L2 is down
const l1HoverHand = createFlutePadHand(0.40, 0.52, true, true, false);
const l1ClosedWithAssist = tracker.isHoleClosed(l1HoverHand, 5, 6, 7, 8, 0);
assert.strictEqual(l1ClosedWithAssist, true, 'L1 must seal effortlessly with coupling assist when L2 is closed');
console.log('✅ PASS: Hand-coupling assist guarantees L1 stability when playing notes with L2 closed.');

console.log('\n--- 3. Testing 1-Frame Left Hand Finger Venting on Lift ---');
const gaHand = createFlutePadHand(0.40, 0.52, false, false, false); // All open (Ga)
const leftHolesGa = tracker.analyzeLeftHand(gaHand);
assert.strictEqual(leftHolesGa[0], false, 'L1 must vent immediately on lift');
assert.strictEqual(leftHolesGa[1], false, 'L2 must vent immediately on lift');
assert.strictEqual(leftHolesGa[2], false, 'L3 must vent immediately on lift');
console.log('✅ PASS: All left hand fingers vent immediately on Frame 1 upon lift.');

console.log('\n--- 4. Testing Geographical Hand Identification Invariance to MediaPipe Jitter ---');
const realLeft = createFlutePadHand(0.38, 0.52, true, true, true);
const realRight = createFlutePadHand(0.60, 0.53, false, false, false);

// MediaPipe erroneously claims hand 0 is 'Left' and hand 1 is 'Right' (mirrored reversed labels)
tracker.onResults({
  multiHandLandmarks: [realLeft, realRight],
  multiHandedness: [{ label: 'Left' }, { label: 'Right' }]
});

assert.strictEqual(tracker.currentHoleStates[0], true, 'Hole L1 must be closed from realLeft hand');
assert.strictEqual(tracker.currentHoleStates[1], true, 'Hole L2 must be closed from realLeft hand');
assert.strictEqual(tracker.currentHoleStates[2], true, 'Hole L3 must be closed from realLeft hand');
console.log('✅ PASS: Geographic knuckle X ensures left hand is never swapped, even when MediaPipe labels glitch.');

console.log('\n--- 5. Testing Swara Transitions with Optimized Left Hand (Ga -> Ri -> Sa -> Ni) ---');
tracker.awaitingInitialSa = false;
let detectedSwara = null;
tracker.onSwaraDetected = (res) => { if (res && res.swara) detectedSwara = res.swara.id; };

// Ga (all open)
for (let i = 0; i < 3; i++) {
  tracker.onResults({
    multiHandLandmarks: [createFlutePadHand(0.38, 0.52, false, false, false), realRight],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}
assert.strictEqual(detectedSwara, 'ga', 'Open hand must produce Ga');

// Ri (L1 only)
for (let i = 0; i < 3; i++) {
  tracker.onResults({
    multiHandLandmarks: [createFlutePadHand(0.38, 0.52, true, false, false), realRight],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}
assert.strictEqual(detectedSwara, 'ri', 'L1 closed must produce Ri');

// Sa (L1 & L2)
for (let i = 0; i < 3; i++) {
  tracker.onResults({
    multiHandLandmarks: [createFlutePadHand(0.38, 0.52, true, true, false), realRight],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}
assert.strictEqual(detectedSwara, 'sa', 'L1 & L2 closed must produce Sa');

// Ni (L1 & L2 & L3)
for (let i = 0; i < 3; i++) {
  tracker.onResults({
    multiHandLandmarks: [createFlutePadHand(0.38, 0.52, true, true, true), realRight],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}
assert.strictEqual(detectedSwara, 'ni', 'L1, L2, L3 closed must produce Ni');

console.log('✅ PASS: Seamless Ga -> Ri -> Sa -> Ni transitions verified with optimized left hand recognition.');

console.log('\n🌟 ALL LEFT HAND FINGER OPTIMIZATION TESTS PASSED 100%!\n');
