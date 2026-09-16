// Verification Test Suite: User Mandate - When Left Index and Middle Finger are Not Open, it has to be a SA
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
  for (let i = 0; i < 21; i++) lm.push({ x: 1.0 - screenX, y: screenY, z: 0.0 });
  lm[0] = { x: 1.0 - screenX, y: screenY + 0.12, z: 0.0 };
  const fingers = [
    { mcp: 5, pip: 6, dip: 7, tip: 8, closed: l1Closed, offset: +0.04 },
    { mcp: 9, pip: 10, dip: 11, tip: 12, closed: l2Closed, offset: 0.00 },
    { mcp: 13, pip: 14, dip: 15, tip: 16, closed: l3Closed, offset: -0.03 }
  ];
  fingers.forEach(({ mcp, pip, dip, tip, closed, offset }, idx) => {
    const fingerX = screenX + offset;
    lm[mcp] = { x: 1.0 - fingerX, y: screenY, z: 0.0 };
    lm[pip] = { x: 1.0 - fingerX, y: screenY - 0.03, z: 0.0 };
    lm[dip] = { x: 1.0 - fingerX, y: screenY - 0.05, z: 0.0 };
    const tipY = closed ? (screenY - 0.038) : ((idx === 2 && l3Lifted) ? screenY - 0.075 : screenY - 0.07);
    lm[tip] = { x: 1.0 - fingerX, y: tipY, z: 0.0 };
  });
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

console.log('======================================================');
console.log('🧪 VERIFYING USER MANDATE: NOT OPEN INDEX & MIDDLE = SA');
console.log('======================================================');

console.log('\n--- 1. Testing Gentle Pad Contact on L1 & L2 (Not Open) with Floating Ring Finger ---');
// L1 = true (closed, not open), L2 = true (closed, not open), L3 = false (relaxed/floating, l3Lifted=true)
// User requirement: "when you dont see the left index and middle finger open, it has to be a SA - recognise clearly"
const saPadHand = createFlutePadHand(0.38, 0.52, true, true, false, true);

const leftHoles = tracker.analyzeLeftHand(saPadHand);
assert.strictEqual(leftHoles[0], true, 'L1 must be closed (not open)');
assert.strictEqual(leftHoles[1], true, 'L2 must be closed (not open)');
assert.strictEqual(leftHoles[2], false, 'L3 must remain open (not intentionally curled for Ni)');

tracker.onResults({
  multiHandLandmarks: [saPadHand],
  multiHandedness: [{ label: 'Right', score: 0.95 }]
});
assert.strictEqual(detectedSwara, 'sa', `Expected Sa, got ${detectedSwara}`);
console.log('✅ PASS: Gentle pad contact on index and middle with floating ring finger produces 100% clean SA!');

console.log('\n--- 2. Testing Immunity from Dropping into Ri or Ga ---');
for (let f = 0; f < 10; f++) {
  tracker.onResults({
    multiHandLandmarks: [saPadHand],
    multiHandedness: [{ label: 'Right', score: 0.95 }]
  });
  assert.strictEqual(detectedSwara, 'sa', `Frame ${f}: Must remain Sa, got ${detectedSwara}`);
}
console.log('✅ PASS: Flute stays rock-solid on Sa and never accidentally drops into Ri or Ga!');

console.log('\n--- 3. Testing Deliberate Ring Curl (Ni) vs Sa ---');
// When user intentionally seals ring finger for Ni (L1=true, L2=true, L3=true)
const niPadHand = createFlutePadHand(0.38, 0.52, true, true, true);

for (let f = 0; f < 3; f++) {
  tracker.onResults({
    multiHandLandmarks: [niPadHand],
    multiHandedness: [{ label: 'Right', score: 0.95 }]
  });
}
assert.strictEqual(detectedSwara, 'ni', `Expected Ni, got ${detectedSwara}`);
console.log('✅ PASS: Deliberate ring finger closure cleanly triggers Ni.');

// Now player lifts ring finger back to Sa (L3 relaxes to open, index and middle remain not open)
for (let f = 0; f < 3; f++) {
  tracker.onResults({
    multiHandLandmarks: [saPadHand],
    multiHandedness: [{ label: 'Right', score: 0.95 }]
  });
}
assert.strictEqual(detectedSwara, 'sa', `Expected Sa upon lifting ring finger, got ${detectedSwara}`);
console.log('✅ PASS: Lifting ring finger immediately returns cleanly to Sa.');

console.log('\n--- 4. Testing Visibly Lifted Middle Finger Triggers Ri ---');
// When player visibly opens middle finger (L1=closed, L2=open, L3=open)
const riPadHand = createFlutePadHand(0.38, 0.52, true, false, false);

for (let f = 0; f < 3; f++) {
  tracker.onResults({
    multiHandLandmarks: [riPadHand],
    multiHandedness: [{ label: 'Right', score: 0.95 }]
  });
}
assert.strictEqual(detectedSwara, 'ri', `Expected Ri when middle finger is open, got ${detectedSwara}`);
console.log('✅ PASS: When middle finger is visibly open, it cleanly triggers Ri.');

console.log('\n--- 5. Testing Visibly Lifted Index Finger Triggers Ga ---');
// When player visibly opens index finger (L1=open, L2=open, L3=open)
const gaPadHand = createFlutePadHand(0.38, 0.52, false, false, false);

for (let f = 0; f < 3; f++) {
  tracker.onResults({
    multiHandLandmarks: [gaPadHand],
    multiHandedness: [{ label: 'Right', score: 0.95 }]
  });
}
assert.strictEqual(detectedSwara, 'ga', `Expected Ga when index finger is open, got ${detectedSwara}`);
console.log('✅ PASS: When index finger is visibly open, it cleanly triggers Ga.');

console.log('\n🌟 ALL "NOT OPEN INDEX & MIDDLE = SA" TESTS PASSED 100%!');
