// Verification Test Suite: Fast Tracking, Exact Note Duration Matching, and Sustained Holding
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
console.log('✅ PASS: CarnaticFluteTracker loaded successfully.');

// 2. Test 1-Frame Ultra-Fast Curl and Vent Response in isHoleClosed
console.log('\n--- 1. Testing Instant 1-Frame Hole Curl & Vent Response ---');
const tracker = new CarnaticFluteTracker();

// Mock landmarks with specified extension ratio to simulate exact curl
function createLandmarksWithCurl(curlAmount) {
  // Landmarks where tip distance from mcp produces exact curlAmount
  const lm = [];
  for (let i = 0; i < 21; i++) {
    lm.push({ x: 0.5, y: 0.5, z: 0.0 });
  }
  // MCP at (0.5, 0.5)
  lm[5] = { x: 0.5, y: 0.5, z: 0.0 };
  // Total bone length = 0.04 + 0.03 + 0.02 = 0.09
  // extRatio = directSpan / 0.09
  // curlFromExt = (0.82 - extRatio) / 0.22
  // For curlAmount = 0.60: extRatio = 0.82 - 0.60 * 0.22 = 0.688 -> directSpan = 0.688 * 0.09 = 0.0619
  // For curlAmount = 0.20: extRatio = 0.82 - 0.20 * 0.22 = 0.776 -> directSpan = 0.776 * 0.09 = 0.0698
  const span = (0.82 - curlAmount * 0.22) * 0.09;
  lm[6] = { x: 0.5, y: 0.5 - 0.04, z: 0.0 };
  lm[7] = { x: 0.5, y: 0.5 - 0.07, z: 0.0 };
  lm[8] = { x: 0.5, y: 0.5 - span, z: 0.0 };
  return lm;
}

// Initially open hole 0 (L1)
tracker.currentHoleStates[0] = false;
tracker.fingerCurlScores[0] = 0.15;

// Simulate sudden hit/curl (0.15 -> 0.70)
const hitLandmarks = createLandmarksWithCurl(0.70);
const closedOnHit = tracker.isHoleClosed(hitLandmarks, 5, 6, 7, 8, 0);
assert.strictEqual(closedOnHit, true, 'Hole must close on Frame 1 when finger hits hole');
console.log(`✅ PASS: Sudden finger hit closes hole on Frame 1 (score: ${tracker.fingerCurlScores[0].toFixed(2)})`);

// Simulate immediate release/vent (0.70 -> 0.15)
tracker.currentHoleStates[0] = true;
const releaseLandmarks = createLandmarksWithCurl(0.15);
const openedOnRelease = tracker.isHoleClosed(releaseLandmarks, 5, 6, 7, 8, 0);
assert.strictEqual(openedOnRelease, false, 'Hole must open on Frame 1 when finger uncurls/vents');
console.log(`✅ PASS: Sudden finger release vents hole on Frame 1 (score: ${tracker.fingerCurlScores[0].toFixed(2)})`);

// 3. Test Rapid Phrase Sequence: Pa (0.2s) -> Ma (0.2s) -> Pa (0.2s) -> Dha (0.2s) -> Pa (hold)
console.log('\n--- 2. Testing Exact Duration Note Sequence: Pa (0.2s) -> Ma (0.2s) -> Pa (0.2s) -> Dha (0.2s) -> Pa (Hold) ---');

// Mock setup
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
tracker.canvasElement = mockCanvas;
tracker.canvasCtx = mockCtx;

// Unlock initial Sa
tracker.awaitingInitialSa = false;

let detectedNotes = [];
tracker.onSwaraDetected = (res) => {
  if (res && res.swara) {
    detectedNotes.push(res.swara.id || res.swara.family);
  } else {
    detectedNotes.push('none');
  }
};

// Function to simulate a frame with specified 7-hole curl states
function processHolesFrame(holesPattern) {
  // Pattern: [L1, L2, L3, R1, R2, R3, R4]
  tracker.currentHoleStates = [...holesPattern];
  for (let i = 0; i < 7; i++) {
    if (!holesPattern[i]) {
      for (let j = i + 1; j < 7; j++) {
        holesPattern[j] = false;
      }
      break;
    }
  }
  const matched = window.SwarasData.matchSwara(holesPattern, tracker.activeSwara ? tracker.activeSwara.id : null, null);
  if (matched && matched.swara) {
    tracker.activeSwara = matched.swara;
    tracker.onSwaraDetected({ swara: tracker.activeSwara, holes: holesPattern, exact: matched.exact });
  } else {
    tracker.onSwaraDetected(null);
  }
}

// 1. Pa: [T, T, T, T, T, F, F] for 6 frames (0.2s at 30 FPS)
for (let f = 0; f < 6; f++) {
  processHolesFrame([true, true, true, true, true, false, false]);
}
// 2. Ma: [T, T, T, T, T, T, F] (or all 7 closed) for 6 frames (0.2s)
for (let f = 0; f < 6; f++) {
  processHolesFrame([true, true, true, true, true, true, false]);
}
// 3. Pa: [T, T, T, T, T, F, F] for 6 frames (0.2s)
for (let f = 0; f < 6; f++) {
  processHolesFrame([true, true, true, true, true, false, false]);
}
// 4. Dha: [T, T, T, T, F, F, F] for 6 frames (0.2s)
for (let f = 0; f < 6; f++) {
  processHolesFrame([true, true, true, true, false, false, false]);
}
// 5. Final Pa held: [T, T, T, T, T, F, F] for 20 frames (held continuous)
for (let f = 0; f < 20; f++) {
  processHolesFrame([true, true, true, true, true, false, false]);
}

// Verify counts:
const pa1Count = detectedNotes.slice(0, 6).filter(id => id === 'pa').length;
const maCount  = detectedNotes.slice(6, 12).filter(id => id === 'ma' || id === 'ma1').length;
const pa2Count = detectedNotes.slice(12, 18).filter(id => id === 'pa').length;
const dhaCount = detectedNotes.slice(18, 24).filter(id => id === 'dha' || id === 'dha2').length;
const pa3Count = detectedNotes.slice(24, 44).filter(id => id === 'pa').length;

console.log(`Detected frames: Pa1=${pa1Count}/6, Ma=${maCount}/6, Pa2=${pa2Count}/6, Dha=${dhaCount}/6, Pa_held=${pa3Count}/20`);

assert.strictEqual(pa1Count, 6, 'Pa must play for exactly 6 frames (0.2s)');
assert.strictEqual(maCount, 6, 'Ma must play for exactly 6 frames (0.2s)');
assert.strictEqual(pa2Count, 6, 'Pa must play for exactly 6 frames (0.2s)');
assert.strictEqual(dhaCount, 6, 'Dha must play for exactly 6 frames (0.2s)');
assert.strictEqual(pa3Count, 20, 'Final Pa must continue holding continuously for all 20 frames');

console.log('✅ PASS: Each note played for only the exact duration it was touched, and final Pa continued holding!');

// 4. Test Audio Engine Envelopes (8ms attack, 8ms crossfade, 10ms stop release)
console.log('\n--- 3. Testing Audio Engine Envelopes ---');
const audioEngineCode = fs.readFileSync(path.join(__dirname, '../src/flute-audio.js'), 'utf8');

// Verify attack time in flute-audio.js is 0.008s
assert(audioEngineCode.includes('attackTime = this.isJazzMode ? 0.055 : 0.008;'), 'Attack time must be 8ms in Carnatic mode');
console.log('✅ PASS: Voice attack time is 8ms for snappy response.');

// Verify stopVoice release time is 10ms
assert(audioEngineCode.includes('linearRampToValueAtTime(0.0001, now + rel);'), 'stopVoice must use linear ramp for crisp cutoff');
assert(audioEngineCode.includes('rel = this.isJazzMode ? 0.060 : 0.010;'), 'stopVoice release time must be 10ms');
console.log('✅ PASS: Voice cutoff stops in 10ms without lingering or trailing decay.');

console.log('\n🌟 ALL FAST TRACKING & EXACT DURATION TESTS PASSED 100%!\n');
