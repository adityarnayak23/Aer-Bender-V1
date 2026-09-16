// Verification Test Suite: Clean Sa & Ni Recognition
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

const mockCanvas = { width: 1280, height: 720 };
const mockCtx = {
  save: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {},
  lineTo: () => {}, stroke: () => {}, arc: () => {}, fill: () => {},
  fillText: () => {}, setLineDash: () => {}, measureText: () => ({ width: 60 }),
  clearRect: () => {}, rect: () => {}
};

function createFlutePadHand(screenX, screenY, l1Closed = true, l2Closed = true, l3Closed = true, l3Lifted = false) {
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 1.0 - screenX, y: screenY, z: 0.0 });
  }
  lm[0] = { x: 1.0 - screenX, y: screenY + 0.12, z: 0.0 };

  const fingers = [
    { mcp: 5, pip: 6, dip: 7, tip: 8, closed: l1Closed, offset: +0.04 },
    { mcp: 9, pip: 10, dip: 11, tip: 12, closed: l2Closed, offset: 0.00 },
    { mcp: 13, pip: 14, dip: 15, tip: 16, closed: l3Closed, offset: -0.03 }
  ];

  fingers.forEach(({ mcp, pip, dip, tip, closed, offset }, idx) => {
    const fingerX = screenX + offset;
    lm[mcp] = { x: 1.0 - fingerX, y: screenY, z: 0.0 };

    if (closed) {
      lm[pip] = { x: 1.0 - fingerX, y: screenY - 0.03, z: 0.0 };
      lm[dip] = { x: 1.0 - fingerX, y: screenY - 0.05, z: 0.0 };
      lm[tip] = { x: 1.0 - fingerX, y: screenY - 0.038, z: 0.0 };
    } else {
      lm[pip] = { x: 1.0 - fingerX, y: screenY - 0.03, z: 0.0 };
      lm[dip] = { x: 1.0 - fingerX, y: screenY - 0.05, z: 0.0 };
      const tipY = (idx === 2 && l3Lifted) ? screenY - 0.075 : screenY - 0.07;
      lm[tip] = { x: 1.0 - fingerX, y: tipY, z: 0.0 };
    }
  });

  const pinkyX = screenX - 0.06;
  lm[17] = { x: 1.0 - pinkyX, y: screenY + 0.02, z: 0.0 };
  lm[18] = { x: 1.0 - pinkyX, y: screenY - 0.02, z: 0.0 };
  lm[19] = { x: 1.0 - pinkyX, y: screenY - 0.04, z: 0.0 };
  lm[20] = { x: 1.0 - pinkyX, y: screenY - 0.05, z: 0.0 };

  return lm;
}

const tracker = new CarnaticFluteTracker();
tracker.canvasElement = mockCanvas;
tracker.canvasCtx = mockCtx;
tracker.awaitingInitialSa = false;
tracker.inPlayingPosition = true;
tracker.isLipsAtBlowHole = true;

let detectedSwara = null;
tracker.onSwaraDetected = (res) => { if (res && res.swara) detectedSwara = res.swara.id; };

console.log('--- 1. Testing Sa Recognition with Natural L3 Elevation ---');
const saHand = createFlutePadHand(0.38, 0.52, true, true, false, true);
const rightHandRest = createFlutePadHand(0.60, 0.53, false, false, false);

for (let i = 0; i < 3; i++) {
  tracker.onResults({
    multiHandLandmarks: [saHand, rightHandRest],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}
assert.strictEqual(detectedSwara, 'sa', `Expected Sa, got ${detectedSwara}`);
console.log('✅ PASS: Sa recognized cleanly when L1, L2 closed and L3 naturally lifted.');

console.log('\n--- 2. Testing Ni Recognition and Right Hand R1 Hover Immunity ---');
const niHand = createFlutePadHand(0.38, 0.52, true, true, true);
for (let i = 0; i < 3; i++) {
  tracker.onResults({
    multiHandLandmarks: [niHand, rightHandRest],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}
assert.strictEqual(detectedSwara, 'ni', `Expected Ni (not Dha), got ${detectedSwara}`);
console.log('✅ PASS: Ni recognized cleanly and hovering right hand does NOT turn it into Dha.');

console.log('\n--- 3. Testing Single-Hand Mode Ni Recognition with Relaxed Pinky ---');
detectedSwara = null;
for (let i = 0; i < 3; i++) {
  tracker.onResults({
    multiHandLandmarks: [niHand],
    multiHandedness: [{ label: 'Right', score: 0.95 }]
  });
}
assert.strictEqual(detectedSwara, 'ni', `Expected single-hand Ni, got ${detectedSwara}`);
console.log('✅ PASS: Single-hand Ni recognized cleanly without pinky triggering Dha.');

console.log('\n--- 4. Testing Fast Responsive Sa <-> Ni Transitions ---');
// Transition from Ni -> Sa
tracker.onResults({
  multiHandLandmarks: [saHand, rightHandRest],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});
assert.strictEqual(tracker.candidateSwaraId, 'sa', 'Frame 1: Candidate immediately locks to Sa');
tracker.onResults({
  multiHandLandmarks: [saHand, rightHandRest],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});
assert.strictEqual(tracker.activeSwara.id, 'sa', 'Frame 2 (~33ms): Active note locks to Sa cleanly without jitter');

// Transition from Sa -> Ni
tracker.onResults({
  multiHandLandmarks: [niHand, rightHandRest],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});
assert.strictEqual(tracker.candidateSwaraId, 'ni', 'Frame 1: Candidate immediately locks to Ni');
tracker.onResults({
  multiHandLandmarks: [niHand, rightHandRest],
  multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
});
assert.strictEqual(tracker.activeSwara.id, 'ni', 'Frame 2 (~33ms): Active note locks to Ni cleanly without jitter');
console.log('✅ PASS: Sa <-> Ni transitions respond within 1-2 frames (~33ms) with rock-solid anti-flicker stability.');

console.log('\n--- 5. Testing rawHoleStates Visually Displays Real Fingers ---');
assert.deepStrictEqual(tracker.rawHoleStates.slice(0, 3), [true, true, true], 'L1, L2, L3 should all be recorded as closed in rawHoleStates');
console.log('✅ PASS: rawHoleStates accurately mirrors physical finger states for clean overlay rendering.');

console.log('\n🌟 ALL SA & NI RECOGNITION TESTS PASSED 100%!');

console.log('\n--- 6. Testing Ri Recognition with Hovering/Relaxed Middle Finger ---');
// Ri: L1 closed (Index), L2 open/hovering (Middle), L3 open (Ring)
const riHand = createFlutePadHand(0.38, 0.52, true, false, false);
for (let i = 0; i < 3; i++) {
  tracker.onResults({
    multiHandLandmarks: [riHand, rightHandRest],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}
assert.strictEqual(tracker.activeSwara.id, 'ri', `Expected Ri, got ${tracker.activeSwara.id}`);
console.log('✅ PASS: Ri recognized cleanly with L1 closed and L2 hovering / more open than closed.');

console.log('\n--- 7. Testing User Rule: Ring More Open Than Closed is Sa ---');
// Sa: L1 & L2 closed, L3 hovering / more open than closed (curl score ~0.42, < 0.50)
for (let i = 0; i < 3; i++) {
  tracker.onResults({
    multiHandLandmarks: [saHand, rightHandRest],
    multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
  });
}
assert.strictEqual(tracker.activeSwara.id, 'sa', `Expected Sa, got ${tracker.activeSwara.id}`);
assert.strictEqual(tracker.rawHoleStates[2], false, 'L3 must be open when more open than closed');
console.log('✅ PASS: Sa recognized when ring finger is more open than closed while index and middle are curled.');

console.log('\n--- 8. Testing Seamless Left Hand Progression: Ga -> Ri -> Sa -> Ni -> Sa -> Ri -> Ga ---');
const gaHand = createFlutePadHand(0.38, 0.52, false, false, false);
const sequence = [
  { name: 'ga', hand: gaHand },
  { name: 'ri', hand: riHand },
  { name: 'sa', hand: saHand },
  { name: 'ni', hand: niHand },
  { name: 'sa', hand: saHand },
  { name: 'ri', hand: riHand },
  { name: 'ga', hand: gaHand }
];

for (const step of sequence) {
  for (let f = 0; f < 3; f++) {
    tracker.onResults({
      multiHandLandmarks: [step.hand, rightHandRest],
      multiHandedness: [{ label: 'Right' }, { label: 'Left' }]
    });
  }
  assert.strictEqual(tracker.activeSwara.id, step.name, `Sequence step expected ${step.name}, got ${tracker.activeSwara.id}`);
}
console.log('✅ PASS: Seamless progression Ga -> Ri -> Sa -> Ni -> Sa -> Ri -> Ga verified 100%!');
