// Verification script for Air Flute Carnatic swaras & fingering engine

global.window = {};
require('../src/swaras-data.js');

const { CARNATIC_SWARAS, matchSwara, getSwaraFreq, patternDistance, KATTAI_ROOTS } = window.SwarasData;

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

console.log('--- Testing Exact Carnatic Finger Patterns ---');

// 1. Sa: Left index and middle close (first 2 close)
const saTest = matchSwara([true, true, false, false, false, false, false]);
assert(saTest && saTest.swara.id === 'sa' && saTest.exact, 'Pattern [T, T, F, F, F, F, F] correctly matches Sa (First 2 close)');

// 2. Ri: Left hand index only close
const riTest = matchSwara([true, false, false, false, false, false, false]);
assert(riTest && riTest.swara.id === 'ri' && riTest.exact, 'Pattern [T, F, F, F, F, F, F] correctly matches Ri (Index only close)');

// 3. Ga: All open
const gaTest = matchSwara([false, false, false, false, false, false, false]);
assert(gaTest && gaTest.swara.id === 'ga' && gaTest.exact, 'Pattern [F, F, F, F, F, F, F] correctly matches Ga (All open)');

// 4. Ma: All close - index only open, or all 7 closed
const maTest = matchSwara([false, true, true, true, true, true, true]);
assert(maTest && maTest.swara.id === 'ma' && maTest.exact, 'Pattern [F, T, T, T, T, T, T] correctly matches Ma (All close, index only open)');

const maAllClosedTest = matchSwara([true, true, true, true, true, true, true]);
assert(maAllClosedTest && maAllClosedTest.swara.id === 'ma', 'Pattern [T, T, T, T, T, T, T] correctly matches Ma (All 7 closed is Ma, not Pa round off)');

// 5. Pa: All close right small and ring open
const paTest = matchSwara([true, true, true, true, true, false, false]);
assert(paTest && paTest.swara.id === 'pa' && paTest.exact, 'Pattern [T, T, T, T, T, F, F] correctly matches Pa (All close, right small & ring open)');

// 6. Dha: Left all close, right only index close
const dhaTest = matchSwara([true, true, true, true, false, false, false]);
assert(dhaTest && dhaTest.swara.id === 'dha' && dhaTest.exact, 'Pattern [T, T, T, T, F, F, F] correctly matches Dha (Left all close, right index close)');

// 7. Ni: Left all close
const niTest = matchSwara([true, true, true, false, false, false, false]);
assert(niTest && niTest.swara.id === 'ni' && niTest.exact, 'Pattern [T, T, T, F, F, F, F] correctly matches Ni (Left all close)');

console.log('\n--- Testing Rounding Off Arbitrary Combinations ---');
// An arbitrary non-standard combination [T, T, T, T, T, T, F] has distance 1 from Pa [T, T, T, T, T, F, F]
const roundTest1 = matchSwara([true, true, true, true, true, true, false]);
assert(roundTest1 && roundTest1.swara !== null, `Arbitrary combination successfully rounded off to: ${roundTest1.swara.swara}`);

// Another arbitrary combination [T, F, T, F, F, F, F] has distance 1 from Sa [T, T, F, F, F, F, F] and Ri [T, F, F, F, F, F, F]
const roundTest2 = matchSwara([true, false, true, false, false, false, false]);
// Acoustic resilience tests: Downstream resting fingers should not disrupt fundamental swaras
const riAcousticTest = matchSwara([true, false, false, false, true, false, false]);
assert(riAcousticTest && riAcousticTest.swara.id === 'ri', 'Acoustic rule: [T, F, F, F, T, F, F] cleanly matches Ri despite resting right finger');

const dhaAcousticTest = matchSwara([true, true, true, true, false, false, true]);
assert(dhaAcousticTest && dhaAcousticTest.swara.id === 'dha', 'Acoustic rule: [T, T, T, T, F, F, T] cleanly matches Dha despite resting pinky');

const paAcousticTest = matchSwara([true, true, true, true, true, false, true]);
assert(paAcousticTest && paAcousticTest.swara.id === 'pa', 'Acoustic rule: [T, T, T, T, T, F, T] cleanly matches Pa despite resting pinky');

console.log('\n--- Testing Frequencies & Transposition ---');
const saFreq = getSwaraFreq(CARNATIC_SWARAS[0], '1', 0, false);
assert(Math.round(saFreq) === 262, `Sa at 1 Kattai (C) should be ~262 Hz (got ${saFreq.toFixed(2)})`);

const saBass = getSwaraFreq(CARNATIC_SWARAS[0], '1', -1, false);
assert(Math.round(saBass) === 131, `Bass Sa (-1 octave) should be ~131 Hz (got ${saBass.toFixed(2)})`);

const saHigh = getSwaraFreq(CARNATIC_SWARAS[0], '1', 1, false);
assert(Math.round(saHigh) === 523, `High Sa (+1 octave) should be ~523 Hz (got ${saHigh.toFixed(2)})`);

const saKattai2 = getSwaraFreq(CARNATIC_SWARAS[0], '2', 0, false);
assert(Math.round(saKattai2) === 294, `Sa at 2 Kattai (D) should be ~294 Hz (got ${saKattai2.toFixed(2)})`);

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
