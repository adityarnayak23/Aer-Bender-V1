// Automated test suite for Carnatic 16 Swarasthanas, Raga filtering, and Initial Sa Stabilization
const assert = require('assert');
const {
  CARNATIC_16_SWARASTHANAS,
  CARNATIC_RAGAS,
  SWARA_BY_ID,
  matchSwara,
  getSwaraFreq
} = require('../src/swaras-data.js');

console.log('--- 1. Testing 16 Carnatic Swarasthanas Integrity ---');
assert.strictEqual(CARNATIC_16_SWARASTHANAS.length, 16, 'Must contain all 16 swarasthanas');

const swaraIds = CARNATIC_16_SWARASTHANAS.map(s => s.id);
const expectedIds = [
  'sa',
  'ri1', 'ri2', 'ri3',
  'ga1', 'ga2', 'ga3',
  'ma1', 'ma2',
  'pa',
  'dha1', 'dha2', 'dha3',
  'ni1', 'ni2', 'ni3'
];
expectedIds.forEach(id => {
  assert.ok(swaraIds.includes(id), `Missing Swarasthana: ${id}`);
  const sw = SWARA_BY_ID[id];
  assert.ok(sw, `SWARA_BY_ID missing ${id}`);
  assert.ok(sw.freqRatio > 0, `Invalid freqRatio for ${id}`);
  assert.ok(typeof sw.cents === 'number', `Invalid cents for ${id}`);
});
console.log('✅ PASS: All 16 Carnatic Swarasthanas properly defined with ratios and cents.');

console.log('\n--- 2. Testing Carnatic Raga Presets ---');
const presets = Object.keys(CARNATIC_RAGAS);
assert.ok(presets.includes('mayamalavagowla'));
assert.ok(presets.includes('shankarabharanam'));
assert.ok(presets.includes('kalyani'));
assert.ok(presets.includes('kharaharapriya'));
assert.ok(presets.includes('hanumatodi'));
assert.ok(presets.includes('mohanam'));
assert.ok(presets.includes('hamsadhwani'));
assert.ok(presets.includes('hindolam'));

// Mayamalavagowla check
const maya = CARNATIC_RAGAS['mayamalavagowla'];
assert.deepStrictEqual(maya.swaras, ['sa', 'ri1', 'ga3', 'ma1', 'pa', 'dha1', 'ni3']);
console.log('✅ PASS: Mayamalavagowla correctly configured: [S, R1, G3, M1, P, D1, N3]');

// Mohanam check (Audava - 5 notes)
const mohanam = CARNATIC_RAGAS['mohanam'];
assert.deepStrictEqual(mohanam.swaras, ['sa', 'ri2', 'ga3', 'pa', 'dha2']);
console.log('✅ PASS: Mohanam correctly configured as Audava: [S, R2, G3, P, D2]');

console.log('\n--- 3. Testing Raga-Constrained Swara Matching ---');
// In Mohanam, Ma and Ni are completely varjya (omitted).
// If user plays pattern for Ma, matchSwara with Mohanam allowedIds should NEVER return Ma!
const maPattern = [false, true, true, true, true, true, true]; // Ma pattern
const matchInMohanam = matchSwara(maPattern, null, mohanam.swaras);
assert.ok(mohanam.swaras.includes(matchInMohanam.swara.id), `Matched note ${matchInMohanam.swara.id} must be in Mohanam!`);
assert.notStrictEqual(matchInMohanam.swara.family, 'ma', 'Ma must never be matched in Mohanam');
console.log(`✅ PASS: In Mohanam, playing Ma pattern cleanly maps to allowed raga note: ${matchInMohanam.swara.short}`);

// In Mayamalavagowla, Ri should map to Ri1 (Shuddha Ri)
const ri1Pattern = ['half', false, false, false, false, false, false];
const matchRiInMaya = matchSwara(ri1Pattern, null, maya.swaras);
assert.strictEqual(matchRiInMaya.swara.id, 'ri1', 'Should match ri1 in Mayamalavagowla');
console.log(`✅ PASS: In Mayamalavagowla, half-curl matches ${matchRiInMaya.swara.short} (${matchRiInMaya.swara.name})`);

console.log('\n--- 4. Testing Initial Sa Stabilization State Machine Simulation ---');
class MockTracker {
  constructor() {
    this.awaitingInitialSa = true;
    this.initialSaHoldFrames = 0;
    this.requiredSaFrames = 3;
    this.handsOutPostureFrames = 0;
    this.HANDS_DOWN_REARM_FRAMES = 15;
    this.activeSwara = null;
    this.soundedNotes = [];
  }

  onFrame(holesArray, inPlayingPosition, allowedIds) {
    if (!inPlayingPosition) {
      this.handsOutPostureFrames++;
      if (this.handsOutPostureFrames >= this.HANDS_DOWN_REARM_FRAMES) {
        this.awaitingInitialSa = true;
        this.initialSaHoldFrames = 0;
      }
      this.activeSwara = null;
      return;
    }

    this.handsOutPostureFrames = 0;
    const matched = matchSwara(holesArray, this.activeSwara ? this.activeSwara.id : null, allowedIds);
    if (this.awaitingInitialSa) {
      const isSa = matched && matched.swara && (matched.swara.id === 'sa' || matched.swara.family === 'sa');
      if (isSa) {
        this.initialSaHoldFrames++;
        if (this.initialSaHoldFrames >= this.requiredSaFrames) {
          this.awaitingInitialSa = false;
          this.activeSwara = matched.swara;
          this.soundedNotes.push(matched.swara.id);
        }
      } else {
        this.initialSaHoldFrames = Math.max(0, this.initialSaHoldFrames - 1);
        this.activeSwara = null;
      }
    } else {
      this.activeSwara = matched.swara;
      this.soundedNotes.push(matched.swara.id);
    }
  }
}

const tracker = new MockTracker();
const saPattern = [true, true, false, false, false, false, false];
const randomPattern = [false, false, false, false, false, false, false]; // Ga

// Frame 1-3: User raising hands / taking position with random fingerings
tracker.onFrame(randomPattern, true, maya.swaras);
tracker.onFrame(randomPattern, true, maya.swaras);
assert.strictEqual(tracker.soundedNotes.length, 0, 'Must remain 100% silent while taking position!');
assert.strictEqual(tracker.awaitingInitialSa, true, 'Must still be awaiting initial Sa');
console.log('✅ PASS: Complete silence while user is taking position.');

// Frame 4-5: User forms Sa for 2 frames (required is 3)
tracker.onFrame(saPattern, true, maya.swaras);
tracker.onFrame(saPattern, true, maya.swaras);
assert.strictEqual(tracker.soundedNotes.length, 0, 'Still silent while stabilizing on Sa (< 3 frames)');
assert.strictEqual(tracker.awaitingInitialSa, true);
console.log('✅ PASS: Complete silence while Sa is stabilizing (< 3 frames).');

// Frame 6: 3rd frame of Sa!
tracker.onFrame(saPattern, true, maya.swaras);
assert.strictEqual(tracker.awaitingInitialSa, false, 'Initial Sa stabilized and unlocked audio in ~90ms!');
assert.strictEqual(tracker.soundedNotes.length, 1);
assert.strictEqual(tracker.soundedNotes[0], 'sa');
console.log('✅ PASS: Sa successfully unlocks at frame 3 and begins playback.');

// Now user can play other notes smoothly
tracker.onFrame(ri1Pattern, true, maya.swaras);
assert.strictEqual(tracker.soundedNotes[1], 'ri1');
console.log('✅ PASS: Subsequent notes in scale play smoothly after initial Sa.');

// Test momentary 2-frame tracking flutter: does NOT re-lock awaitingInitialSa
tracker.onFrame(null, false, maya.swaras);
tracker.onFrame(null, false, maya.swaras);
assert.strictEqual(tracker.awaitingInitialSa, false, 'Flutter must not re-arm awaitingInitialSa!');
tracker.onFrame(ri1Pattern, true, maya.swaras);
assert.strictEqual(tracker.soundedNotes[2], 'ri1', 'Playing resumes instantly without needing Sa!');
console.log('✅ PASS: Brief tracking dip does NOT lock out notes or cause lag.');

// Test hands down for >= 15 frames: cleanly re-arms awaitingInitialSa
for (let i = 0; i < 15; i++) {
  tracker.onFrame(null, false, maya.swaras);
}
assert.strictEqual(tracker.awaitingInitialSa, true, 'Prolonged hands down cleanly re-arms initial Sa waiting.');
console.log('✅ PASS: Deliberate hands-down (>500ms) cleanly re-arms initial Sa.');

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! (Carnatic 16 Swarasthanas + Raga Builder + Debounced Sa Stabilization)\n');
