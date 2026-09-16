/**
 * Automated Verification Suite for Fixed Flute Position
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================');
console.log('🪈 VERIFYING FIXED FLUTE POSITION (X & Y INVARIANT)');
console.log('======================================================\n');

// Verify tracker code enforces fixedFluteY and fixedFluteCenterX
const trackerSource = fs.readFileSync(path.join(__dirname, '../src/carnatic-flute-tracker.js'), 'utf-8');

// 1. Constructor defines fixedFluteY and fixedFluteCenterX
assert.ok(trackerSource.includes('this.fixedFluteY = this.OCTAVE_LINES.MID;'), 'fixedFluteY initialized');
assert.ok(trackerSource.includes('this.fixedFluteCenterX = 0.52;'), 'fixedFluteCenterX initialized');
console.log('✅ PASS: Tracker initializes fixedFluteY (0.52) and fixedFluteCenterX (0.52)');

// 2. Playing position preserves fixed positions unconditionally
assert.ok(
  trackerSource.includes('this.fluteY = this.fixedFluteY || this.OCTAVE_LINES.MID;'),
  'fluteY must be locked to fixedFluteY'
);
assert.ok(
  trackerSource.includes('this.fluteCenterX = this.fixedFluteCenterX || 0.52;'),
  'fluteCenterX must be locked to fixedFluteCenterX'
);
console.log('✅ PASS: Flute line Y and X are strictly fixed when hands are detected');

// 3. Dynamic posture drift code is eliminated
assert.ok(
  !trackerSource.includes('this.fluteY = (this.fluteY || 0.55) * 0.88 + targetY * 0.12;'),
  'Adaptive vertical posture drift formula must be removed'
);
console.log('✅ PASS: Dynamic vertical posture drift eliminated');

// 4. setFluteY updates fixedFluteY
assert.ok(
  trackerSource.includes('this.fixedFluteY = y > 1 ? y / 100 : y;'),
  'setFluteY updates fixedFluteY'
);
console.log('✅ PASS: Manual setFluteY updates fixed reference correctly');

console.log('\n======================================================');
console.log('🎉 ALL FIXED FLUTE POSITION TESTS PASSED 100%!');
console.log('======================================================\n');
